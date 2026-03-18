import z from "zod";

export const rankedCandidateSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullish(),
	retrieval_score: z.number().nullable().optional(),
	rerank_score: z.number(),
});

export const rerankResponseSchema = z.object({
	query: z.string().min(1),
	total_candidates: z.number().int().nonnegative(),
	returned: z.number().int().nonnegative(),
	backend: z.string().min(1),
	model_name: z.string().min(1),
	items: z.array(rankedCandidateSchema),
});
