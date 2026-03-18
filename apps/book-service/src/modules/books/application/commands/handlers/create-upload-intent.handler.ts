import { randomUUID } from "node:crypto";

import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { SnowflakeIdService, formatSnowflakeId } from "@kigvuzyy/snowflake-id";

import type { ICommandHandler } from "@nestjs/cqrs";
import type { CreateUploadIntentResponseDto } from "@/modules/books/application/dtos";

import { UploadIntent } from "@/modules/books/domain/entities";
import { ObjectStoragePort } from "@/modules/books/domain/ports/object-storage.port";
import { UploadIntentRepositoryPort } from "@/modules/books/domain/ports/upload-intent.repository.port";
import { CreateUploadIntentCommand } from "@/modules/books/application/commands/impl/create-upload-intent.command";

@CommandHandler(CreateUploadIntentCommand)
export class CreateUploadIntentHandler
	implements ICommandHandler<CreateUploadIntentCommand, CreateUploadIntentResponseDto>
{
	public constructor(
		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,

		@Inject(SnowflakeIdService)
		private readonly snowflakeId: SnowflakeIdService,

		@Inject(UploadIntentRepositoryPort)
		private readonly uploadIntentRepo: UploadIntentRepositoryPort,
	) {}

	public async execute(
		command: CreateUploadIntentCommand,
	): Promise<CreateUploadIntentResponseDto> {
		const { userId, fileName, contentType, contentLength } = command.payload;

		const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
		const objectKey = `${userId}/${Date.now()}_${randomUUID()}_${safeName}.epub`;

		const bucket = this.storage.defaultBucket();

		const presigned = await this.storage.presignPut({
			bucket,
			objectKey,
			expiresSeconds: 10 * 60,
		});

		const presignedExpiresAt = new Date(presigned.expiresAt);

		const uploadIntent = UploadIntent.create({
			id: this.snowflakeId.generate(),
			userId,
			originalFileName: fileName,
			expectedContentType: contentType,
			expectedSizeBytes: BigInt(contentLength),

			bucket: presigned.bucket,
			objectKey: presigned.objectKey,
			presignedExpiresAt,
		});

		const { id } = await this.uploadIntentRepo.create(uploadIntent);

		return {
			uploadId: formatSnowflakeId(id),
			url: presigned.url,
			bucket: presigned.bucket,
			objectKey: presigned.objectKey,
			expiresAt: presignedExpiresAt.toISOString(),
		};
	}
}
