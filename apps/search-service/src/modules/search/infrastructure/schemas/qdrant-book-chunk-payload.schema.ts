import z from "zod";

const nullableStringFromOptional = z.preprocess(
	(value) => value ?? null,
	z.string().min(1).nullable(),
);

export const qdrantBookChunkPayloadSchema = z.object({
	bookId: z.string().min(1).optional(),
	chapterId: z.string().min(1),
	chapterIndex: z.number().int(),
	chapterTitle: z.string().min(1),
	chunkIndex: z.number().int(),
	text: z.string().min(1),
	sourceStartChar: z.number().int().nullable().optional(),
	sourceEndChar: z.number().int().nullable().optional(),
	coverS3FilePath: nullableStringFromOptional,
});

export type QdrantBookChunkPayload = z.infer<typeof qdrantBookChunkPayloadSchema>;
