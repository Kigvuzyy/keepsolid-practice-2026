import { Query } from "@nestjs/cqrs";

import type { SuggestBookSearchResponseDto } from "@/modules/books/application/dtos";

export interface SuggestBookSearchPayload {
	query: string;
	limit: number;
}

export class SuggestBookSearchQuery extends Query<SuggestBookSearchResponseDto> {
	public constructor(public readonly payload: SuggestBookSearchPayload) {
		super();
	}
}
