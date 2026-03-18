import type { Prisma, UploadIntent } from "database/client";

import { UploadIntent as UploadIntentEntity } from "@/modules/books/domain/entities";

export class PrismaUploadIntentMapper {
	public static toDomain(row: UploadIntent): UploadIntentEntity {
		return UploadIntentEntity.restore({
			id: row.id,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,

			userId: row.userId,
			status: row.status,
			bucket: row.bucket,
			objectKey: row.objectKey,
			originalFileName: row.originalFileName,
			expectedContentType: row.expectedContentType,
			expectedSizeBytes: row.expectedSizeBytes,
			actualContentType: row.actualContentType,
			actualSizeBytes: row.actualSizeBytes,
			etag: row.etag,
			presignedExpiresAt: row.presignedExpiresAt,
			confirmedAt: row.confirmedAt,
			failedReason: row.failedReason,
		});
	}

	public static toPersistence(
		entity: UploadIntentEntity,
	): Prisma.UploadIntentUncheckedCreateInput {
		return {
			id: entity.id,
			userId: entity.userId,
			status: entity.status,
			bucket: entity.bucket,
			objectKey: entity.objectKey,
			originalFileName: entity.originalFileName,
			expectedContentType: entity.expectedContentType,
			expectedSizeBytes: entity.expectedSizeBytes,
			actualContentType: entity.actualContentType,
			actualSizeBytes: entity.actualSizeBytes,
			etag: entity.etag,
			presignedExpiresAt: entity.presignedExpiresAt,
			confirmedAt: entity.confirmedAt,
			failedReason: entity.failedReason,

			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	public static toUpdatePersistence(
		entity: UploadIntentEntity,
	): Prisma.UploadIntentUncheckedUpdateInput {
		return {
			status: entity.status,
			actualContentType: entity.actualContentType,
			actualSizeBytes: entity.actualSizeBytes,
			etag: entity.etag,
			confirmedAt: entity.confirmedAt,
			failedReason: entity.failedReason,
		};
	}
}
