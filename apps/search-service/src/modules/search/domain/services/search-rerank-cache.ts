import { Injectable } from "@nestjs/common";

import type { SearchBooksResult } from "@/modules/search/domain/ports/book-search.port";
import type { SearchRerankCacheEntry } from "@/modules/search/domain/ports/search-rerank-cache.port";

import { SEARCH_PAGE_LIMIT } from "@/modules/search/domain/constants/search.constants";

@Injectable()
export class SearchRerankCachePolicy {
	public shouldServe(offset: number, rerankCacheWindow: number): boolean {
		return offset < rerankCacheWindow;
	}

	public resolveWindow(configuredWindow: number, maxRerankCandidates: number): number {
		return Math.min(configuredWindow, maxRerankCandidates);
	}

	public buildPage(cacheEntry: SearchRerankCacheEntry, offset: number): SearchBooksResult {
		const items = cacheEntry.items.slice(offset, offset + SEARCH_PAGE_LIMIT);

		const nextOffsetCandidate = offset + items.length;
		const hasMoreWithinCache = cacheEntry.items.length > nextOffsetCandidate;
		const hasMoreAfterWindow = cacheEntry.hasMoreAfterWindow && items.length > 0;

		return {
			items,
			offset,
			limit: SEARCH_PAGE_LIMIT,
			nextOffset: hasMoreWithinCache || hasMoreAfterWindow ? nextOffsetCandidate : null,
		};
	}
}
