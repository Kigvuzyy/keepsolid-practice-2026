import z from "zod";

import { StoredChapterSchema } from "@/application/schemas/stored-chapter.schema";

export const StoredChapterBatchSchema = z.object({
	batchIndex: z.number().int().positive(),
	chapters: z.array(StoredChapterSchema),
});

export type StoredChapterBatch = z.infer<typeof StoredChapterBatchSchema>;
