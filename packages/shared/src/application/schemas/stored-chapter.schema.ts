import z from "zod";

export const StoredChapterSchema = z.object({
	chapterId: z.string().min(1),
	chapterTitle: z.string().min(1),
	chapterIndex: z.number().int().positive(),
	html: z.string().default(""),
});

export type StoredChapter = z.infer<typeof StoredChapterSchema>;
