import { Injectable } from "@nestjs/common";
import { InjectTransaction } from "@nestjs-cls/transactional";

import type { Transaction } from "@nestjs-cls/transactional";
import type { BookChapter } from "@/modules/books/domain/entities";
import type { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type { BookChapterRepositoryPort } from "@/modules/books/domain/ports/book-chapter.repository.port";

import { PrismaBookChapterMapper } from "@/modules/books/infrastructure/mappers/prisma-book-chapter.mapper";

@Injectable()
export class PrismaBookChapterRepository implements BookChapterRepositoryPort {
	public constructor(
		@InjectTransaction()
		private readonly prisma: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async upsert(chapter: BookChapter): Promise<{ id: bigint }> {
		const create = PrismaBookChapterMapper.toCreatePersistence(chapter);
		const update = PrismaBookChapterMapper.toUpdatePersistence(chapter);

		return this.prisma.bookChapter.upsert({
			where: {
				bookId_externalChapterId: {
					bookId: chapter.bookId,
					externalChapterId: chapter.externalChapterId,
				},
			},
			create: {
				...create,
			},
			update,
			select: {
				id: true,
			},
		});
	}
}
