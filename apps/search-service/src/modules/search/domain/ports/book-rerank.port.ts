import type { SearchBookItem } from "@/modules/search/domain/ports/book-search.port";

export interface RerankBooksInput {
	query: string;
	items: SearchBookItem[];
	limit: number;
}

export abstract class BookRerankPort {
	public abstract rerank(input: RerankBooksInput): Promise<SearchBookItem[]>;
}
