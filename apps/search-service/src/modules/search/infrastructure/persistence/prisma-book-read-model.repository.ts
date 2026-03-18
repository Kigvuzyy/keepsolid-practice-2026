import { Injectable } from "@nestjs/common";
import { InjectTransaction } from "@nestjs-cls/transactional";

import type { Transaction } from "@nestjs-cls/transactional";
import type { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type {
	BookSearchReadModel,
	BookSearchReadModelRepositoryPort,
	FindBookReadModelsByIdsPayload,
	SaveBookReadModelPayload,
	SetCoverObjectKeyPayload,
} from "@/modules/search/domain/ports/book-read-model.repository.port";

import { PrismaBookReadModelMapper } from "@/modules/search/infrastructure/mappers/prisma-book-read-model.mapper";

@Injectable()
export class PrismaBookReadModelRepository implements BookSearchReadModelRepositoryPort {
	public constructor(
		@InjectTransaction()
		private readonly prisma: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async findByIds(
		payload: FindBookReadModelsByIdsPayload,
	): Promise<BookSearchReadModel[]> {
		if (payload.bookIds.length === 0) {
			return [];
		}

		const rows = await this.prisma.bookReadModel.findMany({
			where: {
				bookId: {
					in: payload.bookIds,
				},
			},
		});

		return PrismaBookReadModelMapper.toSearchDto(rows);
	}

	public async setCoverObjectKey(payload: SetCoverObjectKeyPayload): Promise<void> {
		await this.prisma.bookReadModel.update({
			where: {
				bookId: payload.bookId,
			},
			data: {
				coverObjectKey: payload.coverObjectKey,
			},
		});
	}

	public async save(payload: SaveBookReadModelPayload): Promise<void> {
		await this.prisma.bookReadModel.upsert({
			where: {
				bookId: payload.bookId,
			},
			create: {
				bookId: payload.bookId,
				title: payload.title,
				authors: payload.authors,
				description: payload.description,
				coverObjectKey: payload.coverObjectKey,
				createdAt: payload.createdAt,
			},
			update: {
				title: payload.title,
				authors: payload.authors,
				description: payload.description,
				coverObjectKey: payload.coverObjectKey,
			},
		});
	}
}
