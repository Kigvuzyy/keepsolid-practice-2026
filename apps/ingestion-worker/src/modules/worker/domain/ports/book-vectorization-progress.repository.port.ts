export const BookVectorizationStatus = {
	PENDING: "PENDING",
	IN_PROGRESS: "IN_PROGRESS",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
} as const;

export type BookVectorizationStatusValue =
	(typeof BookVectorizationStatus)[keyof typeof BookVectorizationStatus];

export interface PlanBookVectorizationInput {
	bookId: bigint;
	expectedChaptersCount: number;
}

export interface RecordChapterVectorizedInput {
	id: bigint;
	bookId: bigint;
	chapterId: string;
	chapterIndex: number;
	chunksCount: number;
}

export interface MarkBookVectorizationFailedInput {
	bookId: bigint;
	reason: string;
}

export interface BookVectorizationStateSnapshot {
	bookId: bigint;
	expectedChaptersCount: number;
	status: BookVectorizationStatusValue;
	completedAt: Date | null;
	lastError: string | null;
}

export interface SavePlannedBookVectorizationStateResult {
	state: BookVectorizationStateSnapshot;
	shouldEmitStarted: boolean;
}

export interface SaveVectorizedChapterResult {
	inserted: boolean;
}

export abstract class BookVectorizationProgressRepositoryPort {
	public abstract savePlannedState(
		params: PlanBookVectorizationInput,
	): Promise<SavePlannedBookVectorizationStateResult>;

	public abstract findStateByBookId(params: {
		bookId: bigint;
	}): Promise<BookVectorizationStateSnapshot | null>;

	public abstract saveVectorizedChapter(
		params: RecordChapterVectorizedInput,
	): Promise<SaveVectorizedChapterResult>;

	public abstract countVectorizedChapters(params: { bookId: bigint }): Promise<number>;

	public abstract markCompleted(params: { bookId: bigint }): Promise<boolean>;

	public abstract markFailed(params: MarkBookVectorizationFailedInput): Promise<void>;
}
