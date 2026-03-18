import { Buffer } from "node:buffer";

import { MinioService } from "@kigvuzyy/minio-nest";
import { Inject, Injectable } from "@nestjs/common";

import type { OpenedZipSource } from "@/modules/worker/infrastructure/epub/types";

import { YauzlZipOpener } from "@/modules/worker/infrastructure/epub/zip/yauzl-zip-opener";
import { MINIO_BUFFER_READ_MAX_BYTES } from "@/modules/worker/infrastructure/epub/constants";
import { MinioBufferedRandomAccessReader } from "@/modules/worker/infrastructure/minio/io/minio-buffered-random-access-reader";

@Injectable()
export class MinioZipSourceService {
	public constructor(
		@Inject(MinioService)
		private readonly minioClient: MinioService,

		@Inject(YauzlZipOpener)
		private readonly zipOpener: YauzlZipOpener,
	) {}

	public async openZip(objectName: string, bucket: string): Promise<OpenedZipSource> {
		const stat = await this.minioClient.statObject(bucket, objectName);

		if (stat.size <= MINIO_BUFFER_READ_MAX_BYTES) {
			const downloadStartedAt = performance.now();
			const objectBuffer = await this.readObjectToBuffer(bucket, objectName);
			const downloadMs = performance.now() - downloadStartedAt;

			const zipfile = await this.zipOpener.openFromBuffer(objectBuffer);

			return {
				zipfile,
				archiveSize: stat.size,
				readMode: "buffer",
				downloadMs,
			};
		}

		const reader = new MinioBufferedRandomAccessReader(
			this.minioClient,
			bucket,
			objectName,
			stat.size,
		);

		const zipfile = await this.zipOpener.openFromRandomAccessReader(reader, stat.size);

		return {
			zipfile,
			archiveSize: stat.size,
			readMode: "random-access",
		};
	}

	private async readObjectToBuffer(bucket: string, objectName: string): Promise<Buffer> {
		const stream = await this.minioClient.getObject(bucket, objectName);

		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];

			stream.on("data", (chunk: Buffer | string) => {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			});

			stream.once("end", () => resolve(Buffer.concat(chunks)));
			stream.once("error", reject);
		});
	}
}
