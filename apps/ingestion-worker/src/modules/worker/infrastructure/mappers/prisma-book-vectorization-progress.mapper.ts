import type { BookVectorizationState } from "database/client";
import type { BookVectorizationStateSnapshot } from "@/modules/worker/domain/ports/book-vectorization-progress.repository.port";

export class PrismaBookVectorizationProgressMapper {
	public static toSnapshot(row: BookVectorizationState): BookVectorizationStateSnapshot {
		return {
			bookId: row.bookId,
			expectedChaptersCount: row.expectedChaptersCount,
			status: row.status,
			completedAt: row.completedAt,
			lastError: row.lastError,
		};
	}
}
