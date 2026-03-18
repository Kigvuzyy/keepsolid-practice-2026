import type { SpecOutboxEnvelope, BookEvents } from "@kigvuzyy/kafka-contracts";
import type { UploadedChapterRef } from "@/modules/worker/domain/ports/chapter-storage.port";

export interface CreateChapterExtractedPayload {
	bookId: bigint;
	chapterId: string;
	chapterIndex: number;
	bucket: string;
	s3FilePath: string;
	coverS3FilePath: string | null;
}

export interface CreateChapterBatchExtractedPayload {
	bookId: bigint;
	batchIndex: number;
	bucket: string;
	s3FilePath: string;
	coverS3FilePath: string | null;
	chapters: UploadedChapterRef[];
}

export interface CreateBookCoverExtractedPayload {
	bookId: bigint;
	bucket: string;
	s3FilePath: string;
	contentType: string;
}

export interface CreateChapterVectorizedPayload {
	bookId: bigint;
	chapterId: string;
	chunksCount: number;
}

export interface CreateBookVectorizationStartedPayload {
	bookId: bigint;
	expectedChaptersCount: number;
}

export interface CreateBookVectorizationProgressPayload {
	bookId: bigint;
	doneChaptersCount: number;
	expectedChaptersCount: number;
}

export interface CreateBookVectorizationCompletedPayload {
	bookId: bigint;
	doneChaptersCount: number;
	expectedChaptersCount: number;
}

export interface CreateBookVectorizationFailedPayload {
	bookId: bigint;
	reason: string;
}

export abstract class EventFactoryPort {
	public abstract createChapterExtracted(
		payload: CreateChapterExtractedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.ChapterExtracted>;

	public abstract createChapterBatchExtracted(
		payload: CreateChapterBatchExtractedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.ChapterBatchExtracted>;

	public abstract createBookCoverExtracted(
		payload: CreateBookCoverExtractedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookCoverExtracted>;

	public abstract createChapterVectorized(
		payload: CreateChapterVectorizedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.ChapterVectorized>;

	public abstract createBookVectorizationStarted(
		payload: CreateBookVectorizationStartedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationStarted>;

	public abstract createBookVectorizationProgress(
		payload: CreateBookVectorizationProgressPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationProgress>;

	public abstract createBookVectorizationCompleted(
		payload: CreateBookVectorizationCompletedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationCompleted>;

	public abstract createBookVectorizationFailed(
		payload: CreateBookVectorizationFailedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationFailed>;
}
