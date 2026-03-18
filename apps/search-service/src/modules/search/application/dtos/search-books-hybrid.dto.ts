import z from "zod";
import { createZodDto } from "nestjs-zod";

export const searchBooksHybridSchema = z.object({
	q: z.string().trim().min(1).max(500),
	offset: z.coerce.number().int().min(0).default(0),
});

export class SearchBooksHybridDto extends createZodDto(searchBooksHybridSchema) {}

export const searchBooksHybridItemSchema = z.object({
	score: z.number(),
	rerankScore: z.number().nullable(),
	bookId: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	coverObjectKey: z.string().nullable(),
	authors: z.array(z.string()),
});

export const searchBooksHybridResponseSchema = z.object({
	offset: z.number(),
	limit: z.number(),
	nextOffset: z.number().nullable(),
	items: z.array(searchBooksHybridItemSchema),
});

export class SearchBooksHybridResponseDto extends createZodDto(searchBooksHybridResponseSchema) {}
