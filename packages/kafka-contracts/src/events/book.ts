import { z } from "zod";
import { Topics } from "@kigvuzyy/kafka-topics";

import { defineEvent } from "@/define";

const nullableStringFromOptional = z.preprocess(
	(value) => value ?? null,
	z.string().min(1).nullable(),
);

const snowflakeIdString = z.string().regex(/^\d+$/);
// SNOWFLAKE ID STRINGIFIED
const bookIdSchema = z.union([z.uuid(), snowflakeIdString]);

export const ProcessingStage = {
	UNPACKING: "unpacking",
	VECTORIZATION: "vectorization",
} as const;
export type ProcessingStageValue = (typeof ProcessingStage)[keyof typeof ProcessingStage];

export const BookUploadedPayload = z.object({
	bookId: bookIdSchema,
	bucket: z.string(),
	objectName: z.string(),
});
export type BookUploadedPayload = z.infer<typeof BookUploadedPayload>;

export const BookCreatedPayload = z.object({
	bookId: bookIdSchema,
	title: z.string().min(1),
	description: z.string().min(1).nullish().default(null),
	authors: z.array(z.string().min(1)),
	coverObjectKey: z.string().min(1).nullish().default(null),
	createdAt: z.iso.datetime(),
});
export type BookCreatedPayload = z.infer<typeof BookCreatedPayload>;

export const ChapterExtractedPayload = z.object({
	bookId: bookIdSchema,
	chapterId: z.string().min(1),
	chapterIndex: z.number().int().positive(),
	bucket: z.string(),
	s3FilePath: z.string(),
	coverS3FilePath: nullableStringFromOptional,
});
export type ChapterExtractedPayload = z.infer<typeof ChapterExtractedPayload>;

export const ChapterBatchExtractedItemPayload = z.object({
	chapterId: z.string().min(1),
	chapterIndex: z.number().int().positive(),
});
export type ChapterBatchExtractedItemPayload = z.infer<typeof ChapterBatchExtractedItemPayload>;

export const ChapterBatchExtractedPayload = z.object({
	bookId: bookIdSchema,
	batchIndex: z.number().int().positive(),
	bucket: z.string(),
	s3FilePath: z.string(),
	coverS3FilePath: nullableStringFromOptional,
	chaptersCount: z.number().int().positive(),
	chapters: z.array(ChapterBatchExtractedItemPayload).min(1),
});
export type ChapterBatchExtractedPayload = z.infer<typeof ChapterBatchExtractedPayload>;

export const BookCoverExtractedPayload = z.object({
	bookId: bookIdSchema,
	bucket: z.string(),
	s3FilePath: z.string(),
	contentType: z.string().min(1),
});
export type BookCoverExtractedPayload = z.infer<typeof BookCoverExtractedPayload>;

export const ChapterVectorizedPayload = z.object({
	bookId: bookIdSchema,
	chapterId: z.string().min(1),
	chunksCount: z.number().int().nonnegative(),
});
export type ChapterVectorizedPayload = z.infer<typeof ChapterVectorizedPayload>;

export const BookVectorizationStartedPayload = z.object({
	bookId: bookIdSchema,
	expectedChaptersCount: z.number().int().positive(),
});
export type BookVectorizationStartedPayload = z.infer<typeof BookVectorizationStartedPayload>;

export const BookVectorizationProgressPayload = z.object({
	bookId: bookIdSchema,
	doneChaptersCount: z.number().int().nonnegative(),
	expectedChaptersCount: z.number().int().positive(),
});
export type BookVectorizationProgressPayload = z.infer<typeof BookVectorizationProgressPayload>;

export const BookVectorizationCompletedPayload = z.object({
	bookId: bookIdSchema,
	doneChaptersCount: z.number().int().positive(),
	expectedChaptersCount: z.number().int().positive(),
});
export type BookVectorizationCompletedPayload = z.infer<typeof BookVectorizationCompletedPayload>;

export const BookVectorizationFailedPayload = z.object({
	bookId: bookIdSchema,
	reason: z.string().min(1),
});
export type BookVectorizationFailedPayload = z.infer<typeof BookVectorizationFailedPayload>;

export const BookEvents = {
	BookCreated: defineEvent("BookCreated", {
		version: 1,
		topic: Topics.bookCatalog,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookCreatedPayload,
	}),

	BookUploaded: defineEvent("BookUploaded", {
		version: 1,
		topic: Topics.bookUploads,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookUploadedPayload,
	}),

	ChapterExtracted: defineEvent("ChapterExtracted", {
		version: 1,
		topic: Topics.bookChaptersExtracted,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: ChapterExtractedPayload,
	}),

	ChapterBatchExtracted: defineEvent("ChapterBatchExtracted", {
		version: 1,
		topic: Topics.bookChaptersExtracted,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: ChapterBatchExtractedPayload,
	}),

	BookCoverExtracted: defineEvent("BookCoverExtracted", {
		version: 1,
		topic: Topics.bookAssetsExtracted,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookCoverExtractedPayload,
	}),

	ChapterVectorized: defineEvent("ChapterVectorized", {
		version: 1,
		topic: Topics.bookChaptersVectorized,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: ChapterVectorizedPayload,
	}),

	BookVectorizationStarted: defineEvent("BookVectorizationStarted", {
		version: 1,
		topic: Topics.bookVectorization,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookVectorizationStartedPayload,
	}),

	BookVectorizationProgress: defineEvent("BookVectorizationProgress", {
		version: 1,
		topic: Topics.bookVectorization,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookVectorizationProgressPayload,
	}),

	BookVectorizationCompleted: defineEvent("BookVectorizationCompleted", {
		version: 1,
		topic: Topics.bookVectorization,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookVectorizationCompletedPayload,
	}),

	BookVectorizationFailed: defineEvent("BookVectorizationFailed", {
		version: 1,
		topic: Topics.bookVectorization,
		aggregateType: "book",
		aggregateId: (payload) => payload.bookId,
		schema: BookVectorizationFailedPayload,
	}),
} as const;

export type BookEventSpec = (typeof BookEvents)[keyof typeof BookEvents];
export type BookEventName = BookEventSpec["name"];
