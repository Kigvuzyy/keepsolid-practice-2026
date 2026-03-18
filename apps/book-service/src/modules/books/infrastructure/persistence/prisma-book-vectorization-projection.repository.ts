import { Injectable } from "@nestjs/common";
import { InjectTransaction } from "@nestjs-cls/transactional";

import type { Transaction } from "@nestjs-cls/transactional";
import type { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type {
	BookVectorizationProjectionRepositoryPort,
	MarkBookVectorizationCompletedInput,
	MarkBookVectorizationFailedInput,
	MarkBookVectorizationStartedInput,
	SyncBookVectorizationProgressInput,
	UpsertBookVectorizedChapterInput,
} from "@/modules/books/domain/ports/book-vectorization-projection.repository.port";

import { PrismaBookVectorizedChapterMapper } from "@/modules/books/infrastructure/mappers/prisma-book-vectorized-chapter.mapper";
import { PrismaBookVectorizationProgressMapper } from "@/modules/books/infrastructure/mappers/prisma-book-vectorization-progress.mapper";

@Injectable()
export class PrismaBookVectorizationProjectionRepository
	implements BookVectorizationProjectionRepositoryPort
{
	public constructor(
		@InjectTransaction()
		private readonly prisma: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async upsertVectorizedChapter(
		input: UpsertBookVectorizedChapterInput,
	): Promise<{ id: bigint }> {
		return this.prisma.bookVectorizedChapter.upsert({
			where: {
				bookId_externalChapterId: {
					bookId: input.bookId,
					externalChapterId: input.externalChapterId,
				},
			},
			create: {
				...PrismaBookVectorizedChapterMapper.toCreatePersistence(input),
			},
			update: PrismaBookVectorizedChapterMapper.toUpdatePersistence(input),
			select: {
				id: true,
			},
		});
	}

	public async markStarted(input: MarkBookVectorizationStartedInput): Promise<void> {
		await this.prisma.bookVectorizationProgress.upsert({
			where: {
				bookId: input.bookId,
			},
			create: PrismaBookVectorizationProgressMapper.toStartedCreatePersistence(input),
			update: PrismaBookVectorizationProgressMapper.toStartedUpdatePersistence(input),
		});
	}

	public async syncProgress(input: SyncBookVectorizationProgressInput): Promise<void> {
		await this.prisma.bookVectorizationProgress.upsert({
			where: {
				bookId: input.bookId,
			},
			create: PrismaBookVectorizationProgressMapper.toProgressCreatePersistence(input),
			update: PrismaBookVectorizationProgressMapper.toProgressUpdatePersistence(input),
		});
	}

	public async markCompleted(input: MarkBookVectorizationCompletedInput): Promise<void> {
		await this.prisma.bookVectorizationProgress.upsert({
			where: {
				bookId: input.bookId,
			},
			create: PrismaBookVectorizationProgressMapper.toCompletedCreatePersistence(input),
			update: PrismaBookVectorizationProgressMapper.toCompletedUpdatePersistence(input),
		});
	}

	public async markFailed(input: MarkBookVectorizationFailedInput): Promise<void> {
		await this.prisma.bookVectorizationProgress.upsert({
			where: {
				bookId: input.bookId,
			},
			create: PrismaBookVectorizationProgressMapper.toFailedCreatePersistence(input),
			update: PrismaBookVectorizationProgressMapper.toFailedUpdatePersistence(input),
		});
	}
}
