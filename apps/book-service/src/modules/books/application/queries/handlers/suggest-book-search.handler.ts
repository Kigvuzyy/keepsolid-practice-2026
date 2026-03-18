import { Inject } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";

import type { IQueryHandler } from "@nestjs/cqrs";
import type { SuggestBookSearchResponseDto } from "@/modules/books/application/dtos";

import { SuggestBookSearchQuery } from "@/modules/books/application/queries/impl/suggest-book-search.query";
import { BookSearchSuggestionRepositoryPort } from "@/modules/books/domain/ports/book-search-suggestion.repository.port";

@QueryHandler(SuggestBookSearchQuery)
export class SuggestBookSearchHandler
	implements IQueryHandler<SuggestBookSearchQuery, SuggestBookSearchResponseDto>
{
	public constructor(
		@Inject(BookSearchSuggestionRepositoryPort)
		private readonly suggestionRepo: BookSearchSuggestionRepositoryPort,
	) {}

	public async execute(query: SuggestBookSearchQuery): Promise<SuggestBookSearchResponseDto> {
		return this.suggestionRepo.findSuggestions({
			query: query.payload.query,
			limit: query.payload.limit,
		});
	}
}
