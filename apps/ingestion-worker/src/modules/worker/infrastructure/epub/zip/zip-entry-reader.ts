import { Buffer } from "node:buffer";

import { Inject, Injectable } from "@nestjs/common";

import type * as yauzl from "yauzl";
import type { IndexedZipEntries } from "@/modules/worker/infrastructure/epub/types";

import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";

@Injectable()
export class ZipEntryReader {
	public constructor(
		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,
	) {}

	public async readTextEntry(
		zipfile: yauzl.ZipFile,
		indexedEntries: IndexedZipEntries,
		rawPath: string,
	): Promise<string> {
		const buffer = await this.readBinaryEntry(zipfile, indexedEntries, rawPath);

		return buffer.toString("utf-8");
	}

	public async readBinaryEntry(
		zipfile: yauzl.ZipFile,
		indexedEntries: IndexedZipEntries,
		rawPath: string,
	): Promise<Buffer> {
		const entry = this.findEntry(indexedEntries, rawPath);

		if (!entry) {
			throw new Error(`Archive entry not found: ${rawPath}`);
		}

		return this.readEntryBuffer(zipfile, entry);
	}

	private findEntry(indexedEntries: IndexedZipEntries, rawPath: string): yauzl.Entry | undefined {
		type LookupCandidate = readonly [
			ReadonlyMap<string, yauzl.Entry>,
			string | null | undefined,
		];

		const normalizedPath = this.pathUtils.normalizeArchivePath(rawPath);
		const decodedPath = this.pathUtils.tryDecodeUriComponent(normalizedPath);

		const lookupOrder: LookupCandidate[] = [
			[indexedEntries.entryByName, normalizedPath],
			[indexedEntries.entryByLowerName, normalizedPath.toLowerCase()],
			[indexedEntries.entryByName, decodedPath],
			[indexedEntries.entryByLowerName, decodedPath?.toLowerCase()],
		];

		for (const [entriesMap, candidatePath] of lookupOrder) {
			if (!candidatePath) {
				continue;
			}

			const entry = entriesMap.get(candidatePath);

			if (entry) {
				return entry;
			}
		}

		return undefined;
	}

	private async readEntryBuffer(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			zipfile.openReadStream(entry, (error, stream) => {
				if (error || !stream) {
					reject(
						error ?? new Error(`Failed to open stream for entry "${entry.fileName}"`),
					);

					return;
				}

				const chunks: Buffer[] = [];

				stream.on("data", (chunk: Buffer | string) => {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				});

				stream.once("end", () => resolve(Buffer.concat(chunks)));
				stream.once("error", reject);
			});
		});
	}
}
