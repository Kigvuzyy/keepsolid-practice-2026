import { URL } from "node:url";

import { MinioService } from "@kigvuzyy/minio-nest";
import { Inject, Injectable } from "@nestjs/common";

import type {
	ObjectStat,
	ObjectStoragePort,
	PresignedUrlGetResult,
	PresignedUrlPutResult,
} from "@/modules/books/domain/ports/object-storage.port";

import { ConfigService } from "@/infrastructure/config/config.service";

@Injectable()
export class MinioObjectStorageAdapter implements ObjectStoragePort {
	private readonly bucketName: string;

	private readonly publicBaseUrl: URL | undefined;

	public constructor(
		@Inject(MinioService)
		private readonly minio: MinioService,

		@Inject(ConfigService)
		private readonly config: ConfigService,
	) {
		const publicBaseUrl = this.config.get("S3_PUBLIC_BASE_URL");

		this.bucketName = this.config.get("S3_BUCKET");
		this.publicBaseUrl = publicBaseUrl ? new URL(publicBaseUrl) : undefined;
	}

	public defaultBucket(): string {
		return this.bucketName;
	}

	public async getObjectJson(params: { bucket: string; objectName: string }): Promise<unknown> {
		return this.minio.getObjectJson(params.bucket, params.objectName);
	}

	public async getObject(params: {
		bucket: string;
		objectName: string;
	}): Promise<NodeJS.ReadableStream> {
		return this.minio.getObject(params.bucket, params.objectName);
	}

	public async presignPut(params: {
		bucket: string;
		objectKey: string;
		expiresSeconds: number;
	}): Promise<PresignedUrlPutResult> {
		const { bucket, objectKey, expiresSeconds } = params;

		const url = await this.minio.presignedPutObject(bucket, objectKey, expiresSeconds);
		const expiresAt = new Date(Date.now() + expiresSeconds * 1_000).toISOString();

		return { bucket, objectKey, url: this.toPublicUrl(url), method: "PUT", expiresAt };
	}

	public async presignGet(params: {
		bucket: string;
		objectKey: string;
		expiresSeconds: number;
	}): Promise<PresignedUrlGetResult> {
		const { bucket, objectKey, expiresSeconds } = params;

		const url = await this.minio.presignedGetObject(bucket, objectKey, expiresSeconds);
		const expiresAt = new Date(Date.now() + expiresSeconds * 1_000).toISOString();

		return { bucket, objectKey, url: this.toPublicUrl(url), method: "GET", expiresAt };
	}

	public async remove(params: { bucket: string; objectKey: string }): Promise<void> {
		const { bucket, objectKey } = params;
		await this.minio.removeObject(bucket, objectKey);
	}

	public async stat(params: { bucket: string; objectKey: string }): Promise<ObjectStat> {
		const { bucket, objectKey } = params;

		const st = await this.minio.statObject(bucket, objectKey);

		return {
			size: st.size,
			etag: st.etag,
			lastModified: st.lastModified,
			contentType: st.metaData["content-type"],
			metadata: st.metaData,
		};
	}

	public async statOrNull(params: {
		bucket: string;
		objectKey: string;
	}): Promise<ObjectStat | null> {
		try {
			return await this.stat(params);
		} catch (error: unknown) {
			if (this.isObjectMissingError(error)) {
				return null;
			}

			throw error;
		}
	}

	private toPublicUrl(url: string): string {
		if (!this.publicBaseUrl) {
			return url;
		}

		const signedUrl = new URL(url);

		signedUrl.protocol = this.publicBaseUrl.protocol;
		signedUrl.hostname = this.publicBaseUrl.hostname;
		signedUrl.port = this.publicBaseUrl.port;

		return signedUrl.href;
	}

	private isObjectMissingError(error: unknown): boolean {
		if (!error || typeof error !== "object") {
			return false;
		}

		const err = error as {
			code?: unknown;
			message?: unknown;
			statusCode?: unknown;
		};

		const code = typeof err.code === "string" ? err.code : "";
		const message = typeof err.message === "string" ? err.message : "";
		const statusCode = typeof err.statusCode === "number" ? err.statusCode : undefined;

		return (
			statusCode === 404 ||
			code === "NotFound" ||
			code === "NoSuchKey" ||
			code === "NoSuchObject" ||
			message === "Not Found"
		);
	}
}
