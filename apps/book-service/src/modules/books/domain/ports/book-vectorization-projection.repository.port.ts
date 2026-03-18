export interface UpsertBookVectorizedChapterInput {
	id: bigint;
	bookId: bigint;
	externalChapterId: string;
	chunksCount: number;
}

export interface MarkBookVectorizationStartedInput {
	bookId: bigint;
	expectedChaptersCount: number;
}

export interface SyncBookVectorizationProgressInput {
	bookId: bigint;
	expectedChaptersCount: number;
}

export interface MarkBookVectorizationCompletedInput {
	bookId: bigint;
	expectedChaptersCount: number;
}

export interface MarkBookVectorizationFailedInput {
	bookId: bigint;
	reason: string;
}

export abstract class BookVectorizationProjectionRepositoryPort {
	public abstract upsertVectorizedChapter(
		input: UpsertBookVectorizedChapterInput,
	): Promise<{ id: bigint }>;

	public abstract markStarted(input: MarkBookVectorizationStartedInput): Promise<void>;

	public abstract syncProgress(input: SyncBookVectorizationProgressInput): Promise<void>;

	public abstract markCompleted(input: MarkBookVectorizationCompletedInput): Promise<void>;

	public abstract markFailed(input: MarkBookVectorizationFailedInput): Promise<void>;
}
