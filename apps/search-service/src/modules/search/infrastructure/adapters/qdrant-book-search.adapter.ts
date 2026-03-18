import { Inject, Injectable } from "@nestjs/common";
import { QdrantService } from "@kigvuzyy/qdrant-nest";

import type {
	BookSearchPort,
	SearchBookItem,
	SearchBooksInput,
	SearchBooksResult,
} from "@/modules/search/domain/ports/book-search.port";

import { SearchRankingPolicy } from "@/modules/search/domain/services/search-ranking-policy";
import { QdrantBookSearchMapper } from "@/modules/search/infrastructure/mappers/qdrant-book-search.mapper";
import { QdrantGroupedBookSearchQueryBuilder } from "@/modules/search/infrastructure/queries/qdrant-grouped-book-search.query";

@Injectable()
export class QdrantBookSearchAdapter implements BookSearchPort {
	public constructor(
		@Inject(QdrantService)
		private readonly qdrant: QdrantService,

		@Inject(SearchRankingPolicy)
		private readonly rankingPolicy: SearchRankingPolicy,

		@Inject(QdrantGroupedBookSearchQueryBuilder)
		private readonly queryBuilder: QdrantGroupedBookSearchQueryBuilder,

		@Inject(QdrantBookSearchMapper)
		private readonly mapper: QdrantBookSearchMapper,
	) {}

	public async searchHybrid(input: SearchBooksInput): Promise<SearchBooksResult> {
		const groupedItems = await this.queryGroupedBooks(input);

		const items = groupedItems.slice(input.offset, input.offset + input.limit);
		const hasMore = groupedItems.length > input.offset + input.limit;

		return {
			items,
			offset: input.offset,
			limit: input.limit,
			nextOffset: hasMore ? input.offset + items.length : null,
		};
	}

	private async queryGroupedBooks(input: SearchBooksInput): Promise<SearchBookItem[]> {
		const collectionName = this.qdrant.getBookChunksCollection();
		const queryFeatures = this.rankingPolicy.buildQueryFeatures(input.query);
		const { request } = this.queryBuilder.build(input);
		const result = await this.qdrant.queryGroups(collectionName, request);

		return this.mapper.mapGroupedBooksToItems(result.groups, queryFeatures);
	}
}
