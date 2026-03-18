import type { Prisma, BookChapter as PrismaBookChapter } from "database/client";

import { BookChapter as BookChapterEntity } from "@/modules/books/domain/entities";

export class PrismaBookChapterMapper {
	public static toDomain(row: PrismaBookChapter): BookChapterEntity {
		return BookChapterEntity.restore({
			id: row.id,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			bookId: row.bookId,
			externalChapterId: row.externalChapterId,
			chapterIndex: row.chapterIndex,
			html: row.html,
			title: row.title,
			bucket: row.bucket,
			objectKey: row.objectKey,
		});
	}

	public static toCreatePersistence(
		entity: BookChapterEntity,
	): Prisma.BookChapterUncheckedCreateInput {
		return {
			id: entity.id,
			bookId: entity.bookId,
			externalChapterId: entity.externalChapterId,
			chapterIndex: entity.chapterIndex,
			html: entity.html,
			title: entity.title,
			bucket: entity.bucket,
			objectKey: entity.objectKey,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	public static toUpdatePersistence(
		entity: BookChapterEntity,
	): Prisma.BookChapterUncheckedUpdateInput {
		return {
			chapterIndex: entity.chapterIndex,
			title: entity.title,
			bucket: entity.bucket,
			objectKey: entity.objectKey,
			updatedAt: entity.updatedAt,
		};
	}
}
