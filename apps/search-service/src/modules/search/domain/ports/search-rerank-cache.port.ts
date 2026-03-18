import type { SearchBookItem } from "@/modules/search/domain/ports/book-search.port";

export interface SearchRerankCacheEntry {
	items: SearchBookItem[];
	hasMoreAfterWindow: boolean;
}

export interface CacheSearchRerankInput extends SearchRerankCacheEntry {
	query: string;
}

export abstract class SearchRerankCachePort {
	public abstract get(query: string): Promise<SearchRerankCacheEntry | null>;

	public abstract set(input: CacheSearchRerankInput): Promise<void>;
}
