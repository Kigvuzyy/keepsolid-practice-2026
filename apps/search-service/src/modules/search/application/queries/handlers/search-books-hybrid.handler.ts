import { Inject } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import { parseSnowflakeId } from "@kigvuzyy/snowflake-id";

import type { IQueryHandler } from "@nestjs/cqrs";
import type { SearchBooksHybridResponseDto } from "@/modules/search/application/dtos/search-books-hybrid.dto";

import { SearchBooksHybridQuery } from "@/modules/search/application/queries/impl/search-books-hybrid.query";
import { SearchBooksHybridService } from "@/modules/search/application/services/search-books-hybrid.service";
import { BookSearchReadModelRepositoryPort } from "@/modules/search/domain/ports/book-read-model.repository.port";

@QueryHandler(SearchBooksHybridQuery)
export class SearchBooksHybridHandler
	implements IQueryHandler<SearchBooksHybridQuery, SearchBooksHybridResponseDto>
{
	public constructor(
		@Inject(SearchBooksHybridService)
		private readonly searchBooksHybrid: SearchBooksHybridService,

		@Inject(BookSearchReadModelRepositoryPort)
		private readonly bookSearchReadModelRepo: BookSearchReadModelRepositoryPort,
	) {}

	public async execute(query: SearchBooksHybridQuery): Promise<SearchBooksHybridResponseDto> {
		const { offset, limit, nextOffset, items } = await this.searchBooksHybrid.search(
			query.payload.query,
			query.payload.offset,
		);

		const rankedItems = [...items]
			.map((item) => ({
				...item,
				parsedBookId: parseSnowflakeId(item.bookId),
				rankingScore: item.rerankScore ?? item.score,
			}))
			.sort((a, b) => {
				if (b.rankingScore !== a.rankingScore) {
					return b.rankingScore - a.rankingScore;
				}

				return a.bookId.localeCompare(b.bookId);
			});

		const bookIds = rankedItems.map((item) => parseSnowflakeId(item.bookId));
		const books = await this.bookSearchReadModelRepo.findByIds({ bookIds });

		const booksById = new Map(books.map((book) => [book.bookId, book]));

		return {
			items: rankedItems.flatMap((item) => {
				const book = booksById.get(item.parsedBookId);

				if (!book) {
					return [];
				}

				return [
					{
						...book,
						bookId: item.bookId,
						score: item.score,
						rerankScore: item.rerankScore ?? null,
					},
				];
			}),
			offset,
			limit,
			nextOffset,
		};
	}
}
