import { Query } from "@nestjs/cqrs";

import type { SearchBooksHybridResponseDto } from "@/modules/search/application/dtos/search-books-hybrid.dto";

export interface SearchBooksHybridPayload {
	query: string;
	offset: number;
}

export class SearchBooksHybridQuery extends Query<SearchBooksHybridResponseDto> {
	public constructor(public readonly payload: SearchBooksHybridPayload) {
		super();
	}
}
