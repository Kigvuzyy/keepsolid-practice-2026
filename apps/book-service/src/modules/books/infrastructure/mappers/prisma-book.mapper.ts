import type { Prisma, Book } from "database/client";

import { Book as BookEntity } from "@/modules/books/domain/entities";

export class PrismaBookMapper {
	public static toDomain(row: Book): BookEntity {
		return BookEntity.restore({
			id: row.id,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,

			ownerId: row.ownerId,
			status: row.status,
			title: row.title,
			description: row.description,
			authors: row.authors,
			coverBucket: row.coverBucket,
			coverObjectKey: row.coverObjectKey,
			failedReason: row.failedReason,
			uploadIntentId: row.uploadIntentId,
		});
	}

	public static toPersistence(entity: BookEntity): Prisma.BookUncheckedCreateInput {
		return {
			id: entity.id,
			ownerId: entity.ownerId,
			status: entity.status,
			title: entity.title,
			description: entity.description,
			authors: entity.authors,
			coverBucket: entity.coverBucket,
			coverObjectKey: entity.coverObjectKey,
			failedReason: entity.failedReason,
			uploadIntentId: entity.uploadIntentId,

			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
