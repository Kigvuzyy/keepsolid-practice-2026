import { randomUUID } from "node:crypto";

import { Inject } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";

import type { IQueryHandler } from "@nestjs/cqrs";
import type { GetPresignedUploadUrlResponseDto } from "@/modules/books/application/dtos";

import { ObjectStoragePort } from "@/modules/books/domain/ports/object-storage.port";
import { GetPresignedUploadUrlQuery } from "@/modules/books/application/queries/impl/get-presigned-upload-url.query";

@QueryHandler(GetPresignedUploadUrlQuery)
export class GetPresignedUploadUrlHandler
	implements IQueryHandler<GetPresignedUploadUrlQuery, GetPresignedUploadUrlResponseDto>
{
	private static readonly MAX_SIZE = 2 * 1_024 * 1_024;

	private static readonly EXPIRES_SECONDS = 10 * 60;

	public constructor(
		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,
	) {}

	public async execute(
		query: GetPresignedUploadUrlQuery,
	): Promise<GetPresignedUploadUrlResponseDto> {
		const { userId, fileName, contentType, contentLength } = query.payload;

		if (!contentType?.includes("/")) {
			throw new Error("Invalid contentType");
		}

		if (contentLength <= 0 || contentLength > GetPresignedUploadUrlHandler.MAX_SIZE) {
			throw new Error("File is too large");
		}

		const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
		const objectKey = `${userId}/${Date.now()}_${randomUUID()}_${safeName}`;

		const bucket = this.storage.defaultBucket();

		return this.storage.presignPut({
			bucket,
			objectKey,
			expiresSeconds: GetPresignedUploadUrlHandler.EXPIRES_SECONDS,
		});
	}
}
