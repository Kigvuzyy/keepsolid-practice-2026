import { BookVectorizationStatus } from "database/client";

import type { Prisma } from "database/client";
import type {
	MarkBookVectorizationCompletedInput,
	MarkBookVectorizationFailedInput,
	MarkBookVectorizationStartedInput,
	SyncBookVectorizationProgressInput,
} from "@/modules/books/domain/ports/book-vectorization-projection.repository.port";

export class PrismaBookVectorizationProgressMapper {
	public static toStartedCreatePersistence(
		input: MarkBookVectorizationStartedInput,
	): Prisma.BookVectorizationProgressUncheckedCreateInput {
		return {
			bookId: input.bookId,
			status: BookVectorizationStatus.IN_PROGRESS,
			expectedChaptersCount: input.expectedChaptersCount,
			startedAt: new Date(),
			completedAt: null,
			lastError: null,
		};
	}

	public static toStartedUpdatePersistence(
		input: MarkBookVectorizationStartedInput,
	): Prisma.BookVectorizationProgressUncheckedUpdateInput {
		return {
			status: BookVectorizationStatus.IN_PROGRESS,
			expectedChaptersCount: input.expectedChaptersCount,
			startedAt: new Date(),
			completedAt: null,
			lastError: null,
		};
	}

	// ESLINT SONARJS BUG
	// eslint-disable-next-line sonarjs/no-identical-functions
	public static toProgressCreatePersistence(
		input: SyncBookVectorizationProgressInput,
	): Prisma.BookVectorizationProgressUncheckedCreateInput {
		return {
			bookId: input.bookId,
			status: BookVectorizationStatus.IN_PROGRESS,
			expectedChaptersCount: input.expectedChaptersCount,
			startedAt: new Date(),
			completedAt: null,
			lastError: null,
		};
	}

	public static toProgressUpdatePersistence(
		input: SyncBookVectorizationProgressInput,
	): Prisma.BookVectorizationProgressUncheckedUpdateInput {
		return {
			status: BookVectorizationStatus.IN_PROGRESS,
			expectedChaptersCount: input.expectedChaptersCount,
			completedAt: null,
			lastError: null,
		};
	}

	public static toCompletedCreatePersistence(
		input: MarkBookVectorizationCompletedInput,
	): Prisma.BookVectorizationProgressUncheckedCreateInput {
		const now = new Date();

		return {
			bookId: input.bookId,
			status: BookVectorizationStatus.COMPLETED,
			expectedChaptersCount: input.expectedChaptersCount,
			startedAt: now,
			completedAt: now,
			lastError: null,
		};
	}

	public static toCompletedUpdatePersistence(
		input: MarkBookVectorizationCompletedInput,
	): Prisma.BookVectorizationProgressUncheckedUpdateInput {
		return {
			status: BookVectorizationStatus.COMPLETED,
			expectedChaptersCount: input.expectedChaptersCount,
			completedAt: new Date(),
			lastError: null,
		};
	}

	public static toFailedCreatePersistence(
		input: MarkBookVectorizationFailedInput,
	): Prisma.BookVectorizationProgressUncheckedCreateInput {
		return {
			bookId: input.bookId,
			status: BookVectorizationStatus.FAILED,
			expectedChaptersCount: 0,
			startedAt: new Date(),
			completedAt: null,
			lastError: input.reason,
		};
	}

	public static toFailedUpdatePersistence(
		input: MarkBookVectorizationFailedInput,
	): Prisma.BookVectorizationProgressUncheckedUpdateInput {
		return {
			status: BookVectorizationStatus.FAILED,
			completedAt: null,
			lastError: input.reason,
		};
	}
}
