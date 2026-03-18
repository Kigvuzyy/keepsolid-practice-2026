import z from "zod";

export const searchBookMatchSchema = z.object({
	id: z.string().min(1),
	chapterId: z.string().min(1),
	chapterIndex: z.number().int(),
	chapterTitle: z.string().min(1),
	chunkIndex: z.number().int(),
	text: z.string().min(1),
	sourceStartChar: z.number().int().nullable(),
	sourceEndChar: z.number().int().nullable(),
});

export const searchBookItemSchema = z.object({
	bookId: z.string().min(1),
	score: z.number(),
	rerankScore: z.number().optional(),
	coverS3FilePath: z.string().min(1).nullish().default(null),
	match: searchBookMatchSchema,
});

export const searchRerankCacheEntrySchema = z.object({
	items: z.array(searchBookItemSchema),
	hasMoreAfterWindow: z.boolean(),
});
