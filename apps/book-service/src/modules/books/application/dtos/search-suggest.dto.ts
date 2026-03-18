import z from "zod";
import { createZodDto } from "nestjs-zod";

export const suggestBookSearchSchema = z.object({
	q: z.string().trim().min(1).max(120),
	limit: z.coerce.number().int().positive().max(10).default(8),
});

export class SuggestBookSearchDto extends createZodDto(suggestBookSearchSchema) {}

export const suggestBookSearchResponseSchema = z.array(
	z.object({
		bookId: z.string(),
		value: z.string(),
	}),
);

export class SuggestBookSearchResponseDto extends createZodDto(suggestBookSearchResponseSchema) {}
