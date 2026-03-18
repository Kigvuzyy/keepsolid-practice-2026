import { Injectable } from "@nestjs/common";
import { formatSnowflakeId } from "@kigvuzyy/snowflake-id";
import { BookEvents, makeEvent } from "@kigvuzyy/kafka-contracts";
import { getActiveTraceContext } from "@kigvuzyy/observability/otel";

import type { SpecOutboxEnvelope } from "@kigvuzyy/kafka-contracts";
import type {
	EventFactoryPort,
	CreateBookCoverExtractedPayload,
	CreateChapterExtractedPayload,
	CreateChapterBatchExtractedPayload,
	CreateChapterVectorizedPayload,
	CreateBookVectorizationStartedPayload,
	CreateBookVectorizationProgressPayload,
	CreateBookVectorizationCompletedPayload,
	CreateBookVectorizationFailedPayload,
} from "@/modules/worker/application/ports/event.factory.port";

@Injectable()
export class EventFactory implements EventFactoryPort {
	private getMeta() {
		return {
			correlationId: null,
			causationId: null,
			...getActiveTraceContext(),
		};
	}

	public createChapterExtracted(
		payload: CreateChapterExtractedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.ChapterExtracted> {
		return makeEvent(
			BookEvents.ChapterExtracted,
			{
				bookId: formatSnowflakeId(payload.bookId),
				chapterId: payload.chapterId,
				chapterIndex: payload.chapterIndex,
				bucket: payload.bucket,
				s3FilePath: payload.s3FilePath,
				coverS3FilePath: payload.coverS3FilePath,
			},
			this.getMeta(),
		);
	}

	public createChapterBatchExtracted(
		payload: CreateChapterBatchExtractedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.ChapterBatchExtracted> {
		return makeEvent(
			BookEvents.ChapterBatchExtracted,
			{
				bookId: formatSnowflakeId(payload.bookId),
				batchIndex: payload.batchIndex,
				bucket: payload.bucket,
				s3FilePath: payload.s3FilePath,
				coverS3FilePath: payload.coverS3FilePath,
				chaptersCount: payload.chapters.length,
				chapters: payload.chapters,
			},
			this.getMeta(),
		);
	}

	public createBookCoverExtracted(
		payload: CreateBookCoverExtractedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookCoverExtracted> {
		return makeEvent(
			BookEvents.BookCoverExtracted,
			{
				bookId: formatSnowflakeId(payload.bookId),
				bucket: payload.bucket,
				s3FilePath: payload.s3FilePath,
				contentType: payload.contentType,
			},
			this.getMeta(),
		);
	}

	public createChapterVectorized(
		payload: CreateChapterVectorizedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.ChapterVectorized> {
		return makeEvent(
			BookEvents.ChapterVectorized,
			{
				bookId: formatSnowflakeId(payload.bookId),
				chapterId: payload.chapterId,
				chunksCount: payload.chunksCount,
			},
			this.getMeta(),
		);
	}

	public createBookVectorizationStarted(
		payload: CreateBookVectorizationStartedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationStarted> {
		return makeEvent(
			BookEvents.BookVectorizationStarted,
			{
				bookId: formatSnowflakeId(payload.bookId),
				expectedChaptersCount: payload.expectedChaptersCount,
			},
			this.getMeta(),
		);
	}

	public createBookVectorizationProgress(
		payload: CreateBookVectorizationProgressPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationProgress> {
		return makeEvent(
			BookEvents.BookVectorizationProgress,
			{
				bookId: formatSnowflakeId(payload.bookId),
				doneChaptersCount: payload.doneChaptersCount,
				expectedChaptersCount: payload.expectedChaptersCount,
			},
			this.getMeta(),
		);
	}

	public createBookVectorizationCompleted(
		payload: CreateBookVectorizationCompletedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationCompleted> {
		return makeEvent(
			BookEvents.BookVectorizationCompleted,
			{
				bookId: formatSnowflakeId(payload.bookId),
				doneChaptersCount: payload.doneChaptersCount,
				expectedChaptersCount: payload.expectedChaptersCount,
			},
			this.getMeta(),
		);
	}

	public createBookVectorizationFailed(
		payload: CreateBookVectorizationFailedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookVectorizationFailed> {
		return makeEvent(
			BookEvents.BookVectorizationFailed,
			{
				bookId: formatSnowflakeId(payload.bookId),
				reason: payload.reason,
			},
			this.getMeta(),
		);
	}
}
