import { Buffer } from "node:buffer";

import { Client } from "minio";
import { Inject } from "@nestjs/common";

import type { MinioModuleOptions } from "@/minio.options";

import { MINIO_MODULE_OPTIONS } from "@/minio.constants";

export class MinioService extends Client {
	public constructor(
		@Inject(MINIO_MODULE_OPTIONS)
		options: MinioModuleOptions,
	) {
		super({ ...options });
	}

	public async getObjectBuffer(bucket: string, objectName: string): Promise<Buffer> {
		const stream = await this.getObject(bucket, objectName);

		return new Promise<Buffer>((resolve, reject) => {
			const chunks: Buffer[] = [];

			stream.on("data", (chunk: Buffer | string) => {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			});

			stream.once("end", () => resolve(Buffer.concat(chunks)));
			stream.once("error", reject);
		});
	}

	public async getObjectText(bucket: string, objectName: string): Promise<string> {
		const buffer = await this.getObjectBuffer(bucket, objectName);

		return buffer.toString("utf8");
	}

	public async getObjectJson(bucket: string, objectName: string): Promise<unknown> {
		return JSON.parse(await this.getObjectText(bucket, objectName));
	}
}
