import { CommandHandler } from "@nestjs/cqrs";
import { InjectTransactionHost } from "@nestjs-cls/transactional";
import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";

import type { HttpException } from "@nestjs/common";
import type { ICommandHandler } from "@nestjs/cqrs";
import type { TransactionHost } from "@nestjs-cls/transactional";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";

import { UploadIntentStatus } from "@/modules/books/domain/entities";
import { ObjectStoragePort } from "@/modules/books/domain/ports/object-storage.port";
import { UploadIntentRepositoryPort } from "@/modules/books/domain/ports/upload-intent.repository.port";
import { ConfirmUploadIntentCommand } from "@/modules/books/application/commands/impl/confirm-upload-intent.command";

@CommandHandler(ConfirmUploadIntentCommand)
export class ConfirmUploadIntentHandler
	implements ICommandHandler<ConfirmUploadIntentCommand, void>
{
	public constructor(
		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,

		@Inject(UploadIntentRepositoryPort)
		private readonly uploadIntentRepo: UploadIntentRepositoryPort,

		@InjectTransactionHost()
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	public async execute(command: ConfirmUploadIntentCommand): Promise<void> {
		const { userId, uploadId } = command.payload;

		const uploadIntent = await this.uploadIntentRepo.findByIdAndUserId({
			id: uploadId,
			userId,
		});

		if (!uploadIntent) {
			throw new NotFoundException("Upload intent not found");
		}

		if (uploadIntent.status === UploadIntentStatus.CONFIRMED) {
			return;
		}

		if (uploadIntent.status !== UploadIntentStatus.PENDING) {
			throw new ConflictException(`Upload intent is already ${uploadIntent.status}`);
		}

		const objectStat = await this.storage.statOrNull({
			bucket: uploadIntent.bucket,
			objectKey: uploadIntent.objectKey,
		});

		let exception: HttpException | null = null;

		if (uploadIntent.expire()) {
			exception = new ConflictException("Upload URL expired");
		} else if (!objectStat) {
			exception = new ConflictException("Uploaded file is not found. Complete upload first.");
		} else {
			const actualSizeBytes = BigInt(objectStat.size);
			const actualContentType = objectStat.contentType ?? null;

			if (
				uploadIntent.expectedSizeBytes !== null &&
				uploadIntent.expectedSizeBytes !== actualSizeBytes
			) {
				uploadIntent.fail(
					`Expected size ${uploadIntent.expectedSizeBytes} bytes, got ${actualSizeBytes} bytes`,
				);

				exception = new BadRequestException(
					"Uploaded file size does not match expected size",
				);
			} else if (
				uploadIntent.expectedContentType !== null &&
				actualContentType !== null &&
				uploadIntent.expectedContentType !== actualContentType
			) {
				uploadIntent.fail(
					`Expected content type ${uploadIntent.expectedContentType}, got ${actualContentType}`,
				);

				exception = new BadRequestException(
					"Uploaded file content type does not match expected content type",
				);
			} else {
				uploadIntent.confirm({
					actualSizeBytes,
					actualContentType,
					etag: objectStat.etag ?? null,
				});
			}
		}

		await this.txHost.withTransaction(async () => {
			const fresh = await this.uploadIntentRepo.findByIdAndUserId({ id: uploadId, userId });
			if (!fresh) return;

			if (fresh.status === UploadIntentStatus.CONFIRMED) return;
			if (fresh.status !== UploadIntentStatus.PENDING) return;

			await this.uploadIntentRepo.save(uploadIntent);
		});

		if (exception) throw exception;
	}
}
