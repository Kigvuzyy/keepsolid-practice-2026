import { Buffer } from "node:buffer";

import { MinioService } from "@kigvuzyy/minio-nest";
import { Inject, Injectable } from "@nestjs/common";

import type { Readable } from "node:stream";
import type {
	ObjectStoragePort,
	ObjectStat,
} from "@/modules/worker/domain/ports/object-storage.port";

import { ConfigService } from "@/infrastructure/config/config.service";

@Injectable()
export class MinioObjectStorageAdapter implements ObjectStoragePort {
	private readonly bucket: string;

	public constructor(
		@Inject(MinioService)
		private readonly minio: MinioService,

		@Inject(ConfigService)
		config: ConfigService,
	) {
		this.bucket = config.get("S3_BUCKET");
	}

	public defaultBucket(): string {
		return this.bucket;
	}

	public async getObjectJson(params: { bucket: string; objectName: string }): Promise<unknown> {
		return this.minio.getObjectJson(params.bucket, params.objectName);
	}

	public async stat(params: { bucket: string; objectKey: string }): Promise<ObjectStat> {
		const stat = await this.minio.statObject(params.bucket, params.objectKey);
		const metadata = this.normalizeMetadata(stat.metaData);

		return {
			size: stat.size,
			etag: stat.etag,
			lastModified: stat.lastModified,
			contentType: this.resolveContentType(metadata),
			metadata,
		};
	}

	public async getObject(params: {
		bucket: string;
		objectName: string;
	}): Promise<NodeJS.ReadableStream> {
		return this.minio.getObject(params.bucket, params.objectName);
	}

	public async getPartialObject(params: {
		bucket: string;
		objectName: string;
		offset: number;
		length: number;
	}): Promise<NodeJS.ReadableStream> {
		return this.minio.getPartialObject(
			params.bucket,
			params.objectName,
			params.offset,
			params.length,
		);
	}

	public async putObject(params: {
		bucket: string;
		objectName: string;
		data: Buffer | NodeJS.ReadableStream | string;
		size?: number;
		metaData?: Record<string, string>;
	}): Promise<unknown> {
		return this.minio.putObject(
			params.bucket,
			params.objectName,
			this.toMinioBody(params.data),
			params.size,
			params.metaData,
		);
	}

	private toMinioBody(data: Buffer | NodeJS.ReadableStream | string): Buffer | Readable | string {
		if (typeof data === "string" || Buffer.isBuffer(data)) {
			return data;
		}

		return data as Readable;
	}

	private normalizeMetadata(metadata?: Record<string, unknown> | null): Record<string, string> {
		if (!metadata) {
			return {};
		}

		return Object.fromEntries(
			Object.entries(metadata).map(([key, value]) => [key, String(value)]),
		);
	}

	private resolveContentType(metadata: Record<string, string>): string | undefined {
		return metadata["content-type"] ?? metadata["Content-Type"] ?? metadata.contentType;
	}
}
