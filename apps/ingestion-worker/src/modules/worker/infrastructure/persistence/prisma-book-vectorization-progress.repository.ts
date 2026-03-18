import { Injectable } from "@nestjs/common";
import { InjectTransaction } from "@nestjs-cls/transactional";

import type { Transaction } from "@nestjs-cls/transactional";
import type { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import type { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import type {
	BookVectorizationProgressRepositoryPort,
	BookVectorizationStateSnapshot,
	MarkBookVectorizationFailedInput,
	PlanBookVectorizationInput,
	SavePlannedBookVectorizationStateResult,
	SaveVectorizedChapterResult,
	RecordChapterVectorizedInput,
} from "@/modules/worker/domain/ports/book-vectorization-progress.repository.port";

import { BookVectorizationStatus } from "@/modules/worker/domain/ports/book-vectorization-progress.repository.port";
import { PrismaBookVectorizationProgressMapper } from "@/modules/worker/infrastructure/mappers/prisma-book-vectorization-progress.mapper";

@Injectable()
export class PrismaBookVectorizationProgressRepository
	implements BookVectorizationProgressRepositoryPort
{
	public constructor(
		@InjectTransaction()
		private readonly prisma: Transaction<TransactionalAdapterPrisma<PrismaService>>,
	) {}

	public async savePlannedState(
		params: PlanBookVectorizationInput,
	): Promise<SavePlannedBookVectorizationStateResult> {
		const existing = await this.prisma.bookVectorizationState.findUnique({
			where: {
				bookId: params.bookId,
			},
		});

		if (!existing) {
			const created = await this.prisma.bookVectorizationState.create({
				data: {
					bookId: params.bookId,
					expectedChaptersCount: params.expectedChaptersCount,
					status: BookVectorizationStatus.IN_PROGRESS,
					completedAt: null,
					lastError: null,
				},
			});

			return {
				state: PrismaBookVectorizationProgressMapper.toSnapshot(created),
				shouldEmitStarted: true,
			};
		}

		const shouldEmitStarted =
			existing.status !== BookVectorizationStatus.IN_PROGRESS ||
			existing.expectedChaptersCount !== params.expectedChaptersCount ||
			existing.completedAt !== null ||
			existing.lastError !== null;

		const updated = await this.prisma.bookVectorizationState.update({
			where: {
				bookId: params.bookId,
			},
			data: {
				expectedChaptersCount: params.expectedChaptersCount,
				status: BookVectorizationStatus.IN_PROGRESS,
				completedAt: null,
				lastError: null,
			},
		});

		return {
			state: PrismaBookVectorizationProgressMapper.toSnapshot(updated),
			shouldEmitStarted,
		};
	}

	public async findStateByBookId(params: {
		bookId: bigint;
	}): Promise<BookVectorizationStateSnapshot | null> {
		const row = await this.prisma.bookVectorizationState.findUnique({
			where: {
				bookId: params.bookId,
			},
		});

		return row ? PrismaBookVectorizationProgressMapper.toSnapshot(row) : null;
	}

	public async saveVectorizedChapter(
		params: RecordChapterVectorizedInput,
	): Promise<SaveVectorizedChapterResult> {
		const now = new Date();
		const result = await this.prisma.bookVectorizedChapter.createMany({
			data: [
				{
					id: params.id,
					bookId: params.bookId,
					chapterId: params.chapterId,
					chapterIndex: params.chapterIndex,
					chunksCount: params.chunksCount,
					createdAt: now,
					updatedAt: now,
				},
			],
			skipDuplicates: true,
		});

		return {
			inserted: result.count > 0,
		};
	}

	public async countVectorizedChapters(params: { bookId: bigint }): Promise<number> {
		return this.prisma.bookVectorizedChapter.count({
			where: {
				bookId: params.bookId,
			},
		});
	}

	public async markCompleted(params: { bookId: bigint }): Promise<boolean> {
		const result = await this.prisma.bookVectorizationState.updateMany({
			where: {
				bookId: params.bookId,
				completedAt: null,
			},
			data: {
				status: BookVectorizationStatus.COMPLETED,
				completedAt: new Date(),
				lastError: null,
			},
		});

		return result.count > 0;
	}

	public async markFailed(params: MarkBookVectorizationFailedInput): Promise<void> {
		await this.prisma.bookVectorizationState.updateMany({
			where: {
				bookId: params.bookId,
			},
			data: {
				status: BookVectorizationStatus.FAILED,
				lastError: params.reason,
			},
		});
	}
}
