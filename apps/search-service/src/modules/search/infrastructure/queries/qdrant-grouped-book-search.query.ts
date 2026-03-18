import { Injectable } from "@nestjs/common";
import {
	QDRANT_BM25_MODEL,
	QDRANT_DENSE_VECTOR_NAME,
	QDRANT_SPARSE_VECTOR_NAME,
} from "@kigvuzyy/qdrant-nest";

import type { SearchBooksInput } from "@/modules/search/domain/ports/book-search.port";

const MIN_PREFETCH_LIMIT = 100;
const PREFETCH_MULTIPLIER = 4;
const GROUP_BY_FIELD = "bookId";
const GROUP_SIZE = 4;

@Injectable()
export class QdrantGroupedBookSearchQueryBuilder {
	public build(input: SearchBooksInput) {
		const groupedLimit = input.offset + input.limit + 1;
		const prefetchLimit = Math.max(MIN_PREFETCH_LIMIT, groupedLimit * PREFETCH_MULTIPLIER);

		const searchableFilter = {
			must: [
				{
					key: "isSearchable",
					match: {
						value: true,
					},
				},
			],
		};

		return {
			groupedLimit,
			request: {
				prefetch: [
					{
						query: input.queryVector,
						using: QDRANT_DENSE_VECTOR_NAME,
						limit: prefetchLimit,
						filter: searchableFilter,
					},
					{
						query: {
							text: input.query,
							model: QDRANT_BM25_MODEL,
						},
						using: QDRANT_SPARSE_VECTOR_NAME,
						limit: prefetchLimit,
						filter: searchableFilter,
					},
				],
				query: {
					fusion: "rrf" as const,
				},
				group_by: GROUP_BY_FIELD,
				group_size: GROUP_SIZE,
				limit: groupedLimit,
				with_payload: true,
				with_vector: false,
			},
		};
	}
}
