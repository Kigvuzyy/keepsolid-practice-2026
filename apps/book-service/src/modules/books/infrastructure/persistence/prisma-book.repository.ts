import { Injectable } from "@nestjs/common";
import { InjectTransaction } from "@nestjs-cls/transactional";

import type { Book } from "@/modules/books/domain/entities";
import type { Transaction } from "@nestjs-cls/transactional";
import type { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type { BookRepositoryPort } from "@/modules/books/domain/ports/book.repository.port";

import { PrismaBookMapper } from "@/modules/books/infrastructure/mappers/prisma-book.mapper";

@Injectable()
export class PrismaBookRepository implements BookRepositoryPort {
	public constructor(
		@InjectTransaction()
		private readonly prisma: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async create(book: Book): Promise<{ id: bigint }> {
		const data = PrismaBookMapper.toPersistence(book);

		return this.prisma.book.create({
			data,
			select: {
				id: true,
			},
		});
	}

	public async assignCover(params: {
		bookId: bigint;
		bucket: string;
		objectKey: string;
	}): Promise<void> {
		await this.prisma.book.update({
			where: {
				id: params.bookId,
			},
			data: {
				coverBucket: params.bucket,
				coverObjectKey: params.objectKey,
			},
		});
	}
}
