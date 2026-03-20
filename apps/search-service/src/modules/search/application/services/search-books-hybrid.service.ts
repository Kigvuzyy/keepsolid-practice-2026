import { Inject, Injectable, Logger } from "@nestjs/common";
import { OpenAIEmbeddingsService } from "@kigvuzyy/ai-core/openai";

import type {
	SearchBookItem,
	SearchBooksResult,
} from "@/modules/search/domain/ports/book-search.port";
import type { SearchRerankCacheEntry } from "@/modules/search/domain/ports/search-rerank-cache.port";

import { ConfigService } from "@/infrastructure/config/config.service";
import { BookRerankPort } from "@/modules/search/domain/ports/book-rerank.port";
import { BookSearchPort } from "@/modules/search/domain/ports/book-search.port";
import { SEARCH_PAGE_LIMIT } from "@/modules/search/domain/constants/search.constants";
import { SearchRankingPolicy } from "@/modules/search/domain/services/search-ranking-policy";
import { SearchRerankCachePort } from "@/modules/search/domain/ports/search-rerank-cache.port";
import { SearchRerankCachePolicy } from "@/modules/search/domain/services/search-rerank-cache";

@Injectable()
export class SearchBooksHybridService {
	private readonly logger = new Logger(SearchBooksHybridService.name);

	public constructor(
		@Inject(OpenAIEmbeddingsService)
		private readonly embeddings: OpenAIEmbeddingsService,

		@Inject(BookSearchPort)
		private readonly bookSearch: BookSearchPort,

		@Inject(BookRerankPort)
		private readonly bookRerank: BookRerankPort,

		@Inject(SearchRerankCachePort)
		private readonly rerankCache: SearchRerankCachePort,

		@Inject(SearchRankingPolicy)
		private readonly rankingPolicy: SearchRankingPolicy,

		@Inject(SearchRerankCachePolicy)
		private readonly rerankCachePolicy: SearchRerankCachePolicy,

		@Inject(ConfigService)
		private readonly config: ConfigService,
	) {}

	public async search(query: string, offset: number): Promise<SearchBooksResult> {
		const rerankCacheWindow = this.rerankCachePolicy.resolveWindow(
			this.config.get("SEARCH_RERANK_CACHE_WINDOW"),
			this.config.get("RERANK_MAX_CANDIDATES"),
		);

		if (!this.rerankCachePolicy.shouldServe(offset, rerankCacheWindow)) {
			return this.searchHybridWithoutRerank(query, offset);
		}

		const cachedSnapshot = await this.rerankCache.get(query);

		if (cachedSnapshot) {
			return this.rerankCachePolicy.buildPage(cachedSnapshot, offset);
		}

		const snapshot = await this.buildRerankedSnapshot(query, rerankCacheWindow);

		return this.rerankCachePolicy.buildPage(snapshot, offset);
	}

	private async buildRerankedSnapshot(
		query: string,
		rerankCacheWindow: number,
	): Promise<SearchRerankCacheEntry> {
		const queryFeatures = this.rankingPolicy.buildQueryFeatures(query);
		const queryVector = await this.embeddings.createEmbedding(query);
		const hybridResult = await this.bookSearch.searchHybrid({
			query,
			queryVector,
			offset: 0,
			limit: rerankCacheWindow,
		});

		const rerankResult = await this.rerankWithFallback(query, hybridResult.items);

		const items = [...rerankResult.items].sort((left, right) =>
			this.rankingPolicy.compareRankedBooks(queryFeatures, left, right),
		);

		const snapshot = {
			items,
			hasMoreAfterWindow: hybridResult.nextOffset !== null,
		} satisfies SearchRerankCacheEntry;

		if (rerankResult.reranked) {
			await this.rerankCache.set({
				query,
				...snapshot,
			});
		}

		return snapshot;
	}

	private async rerankWithFallback(
		query: string,
		items: SearchBookItem[],
	): Promise<{ items: SearchBookItem[]; reranked: boolean }> {
		try {
			return {
				items: await this.bookRerank.rerank({
					query,
					items,
					limit: items.length,
				}),
				reranked: true,
			};
		} catch (error: unknown) {
			this.logger.warn(
				`Rerank request failed. Falling back to Qdrant hybrid order. ${error instanceof Error ? error.message : String(error)}`,
			);

			return {
				items,
				reranked: false,
			};
		}
	}

	private async searchHybridWithoutRerank(
		query: string,
		offset: number,
	): Promise<SearchBooksResult> {
		const queryVector = await this.embeddings.createEmbedding(query);

		return this.bookSearch.searchHybrid({
			query,
			queryVector,
			offset,
			limit: SEARCH_PAGE_LIMIT,
		});
	}
}
