import { Buffer } from "node:buffer";
import { PassThrough } from "node:stream";

import type { Readable } from "node:stream";
import type { MinioService } from "@kigvuzyy/minio-nest";

import * as yauzl from "yauzl";

export class MinioBufferedRandomAccessReader extends yauzl.RandomAccessReader {
	private readonly chunkCache = new Map<number, Buffer>();

	public constructor(
		private readonly minio: MinioService,
		private readonly bucket: string,
		private readonly objectName: string,
		private readonly objectSize: number,
		private readonly chunkSize = 256 * 1024,
		private readonly maxCachedChunks = 16,
	) {
		super();

		if (chunkSize <= 0) {
			throw new RangeError("chunkSize must be > 0");
		}

		if (maxCachedChunks <= 0) {
			throw new RangeError("maxCachedChunks must be > 0");
		}
	}

	public override _readStreamForRange(start: number, end: number): Readable {
		const passThrough = new PassThrough();
		const byteLength = end - start;

		if (byteLength <= 0) {
			passThrough.end();
			return passThrough;
		}

		if (!this.isValidRange(start, end)) {
			passThrough.destroy(this.createOutOfBoundsError(start, end));
			return passThrough;
		}

		this.readRange(start, end)
			.then((buffer) => {
				passThrough.end(buffer);
			})
			.catch((error: unknown) => {
				passThrough.destroy(error instanceof Error ? error : new Error(String(error)));
			});

		return passThrough;
	}

	private async readRange(start: number, end: number): Promise<Buffer> {
		const cachedBuffer = this.readCachedRange(start, end);

		if (cachedBuffer) {
			return cachedBuffer;
		}

		await this.ensureRangeCached(start, end);
		const loadedBuffer = this.readCachedRange(start, end);

		if (loadedBuffer) {
			return loadedBuffer;
		}

		throw new Error(`Cannot satisfy range [${start}, ${end}) after cache fill`);
	}

	private readCachedRange(start: number, end: number): Buffer | null {
		if (this.chunkCache.size === 0) {
			return null;
		}

		const slices: Buffer[] = [];
		let cursor = start;

		for (const chunkStart of this.getChunkStartsForRange(start, end)) {
			const chunk = this.chunkCache.get(chunkStart);

			if (!chunk) {
				return null;
			}

			this.touchChunk(chunkStart, chunk);

			const chunkReadStart = Math.max(cursor, chunkStart);
			const chunkReadEnd = Math.min(end, chunkStart + chunk.length);

			if (chunkReadEnd <= chunkReadStart) {
				return null;
			}

			const sliceStart = chunkReadStart - chunkStart;
			const sliceEnd = chunkReadEnd - chunkStart;

			slices.push(chunk.subarray(sliceStart, sliceEnd));

			cursor = chunkReadEnd;
		}

		if (cursor !== end) {
			return null;
		}

		if (slices.length === 1) {
			return slices[0] ?? null;
		}

		return Buffer.concat(slices, end - start);
	}

	private async ensureRangeCached(start: number, end: number): Promise<void> {
		const missingRuns = this.buildMissingRuns(start, end);

		for (const run of missingRuns) {
			const buffer = await this.fetchRange(run.start, run.end);
			this.cacheFetchedRange(run.start, buffer);
		}
	}

	private async fetchRange(start: number, end: number): Promise<Buffer> {
		const dataStream = await this.minio.getPartialObject(
			this.bucket,
			this.objectName,
			start,
			end - start,
		);

		return new Promise<Buffer>((resolve, reject) => {
			const chunks: Buffer[] = [];

			dataStream.on("data", (chunk: Buffer | string) => {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			});

			dataStream.on("error", reject);

			dataStream.on("end", () => {
				resolve(Buffer.concat(chunks));
			});
		});
	}

	private buildMissingRuns(start: number, end: number): { start: number; end: number }[] {
		const missingChunkStarts = this.getMissingChunkStarts(start, end);

		const runs: { start: number; end: number }[] = [];
		const firstChunkStart = missingChunkStarts[0];

		if (firstChunkStart === undefined) {
			return runs;
		}

		let runStart = firstChunkStart;
		let previousChunkStart = firstChunkStart;

		for (let index = 1; index < missingChunkStarts.length; index += 1) {
			const currentChunkStart = missingChunkStarts[index];

			if (currentChunkStart === undefined) {
				continue;
			}

			if (currentChunkStart === previousChunkStart + this.chunkSize) {
				previousChunkStart = currentChunkStart;
				continue;
			}

			runs.push({
				start: runStart,
				end: Math.min(this.objectSize, previousChunkStart + this.chunkSize),
			});

			runStart = currentChunkStart;
			previousChunkStart = currentChunkStart;
		}

		runs.push({
			start: runStart,
			end: Math.min(this.objectSize, previousChunkStart + this.chunkSize),
		});

		return runs;
	}

	private getMissingChunkStarts(start: number, end: number): number[] {
		const missingChunkStarts: number[] = [];

		for (const chunkStart of this.getChunkStartsForRange(start, end)) {
			const cachedChunk = this.chunkCache.get(chunkStart);

			if (cachedChunk) {
				this.touchChunk(chunkStart, cachedChunk);
				continue;
			}

			missingChunkStarts.push(chunkStart);
		}

		return missingChunkStarts;
	}

	private getChunkStartsForRange(start: number, end: number): number[] {
		const chunkStarts: number[] = [];
		const firstChunkStart = this.alignChunkStart(start);
		const lastChunkStart = this.alignChunkStart(end - 1);

		for (
			let chunkStart = firstChunkStart;
			chunkStart <= lastChunkStart;
			chunkStart += this.chunkSize
		) {
			chunkStarts.push(chunkStart);
		}

		return chunkStarts;
	}

	private cacheFetchedRange(fetchStart: number, buffer: Buffer): void {
		for (
			let chunkStart = fetchStart;
			chunkStart < fetchStart + buffer.length;
			chunkStart += this.chunkSize
		) {
			const relativeStart = chunkStart - fetchStart;
			const remaining = buffer.length - relativeStart;

			if (remaining <= 0) {
				break;
			}

			const chunkLength = Math.min(this.chunkSize, remaining);
			const chunk = Buffer.from(buffer.subarray(relativeStart, relativeStart + chunkLength));

			this.storeChunk(chunkStart, chunk);
		}
	}

	private storeChunk(start: number, chunk: Buffer): void {
		if (this.chunkCache.has(start)) {
			this.chunkCache.delete(start);
		}

		this.chunkCache.set(start, chunk);

		while (this.chunkCache.size > this.maxCachedChunks) {
			const oldestKey = this.chunkCache.keys().next().value;

			if (typeof oldestKey !== "number") {
				break;
			}

			this.chunkCache.delete(oldestKey);
		}
	}

	private touchChunk(start: number, chunk: Buffer): void {
		this.chunkCache.delete(start);
		this.chunkCache.set(start, chunk);
	}

	private alignChunkStart(position: number): number {
		return Math.floor(position / this.chunkSize) * this.chunkSize;
	}

	private isValidRange(start: number, end: number): boolean {
		return start >= 0 && end <= this.objectSize;
	}

	private createOutOfBoundsError(start: number, end: number): RangeError {
		return new RangeError(
			`Requested range [${start}, ${end}) is outside object bounds [0, ${this.objectSize})`,
		);
	}
}
