import { QueryBus } from "@nestjs/cqrs";
import { zodPipe } from "@kigvuzyy/shared";
import { ZodSerializerDto } from "nestjs-zod";
import { Controller, Get, Inject, Query } from "@nestjs/common";

import { SearchBooksHybridQuery } from "@/modules/search/application/queries/impl";
import {
	SearchBooksHybridDto,
	SearchBooksHybridResponseDto,
} from "@/modules/search/application/dtos/search-books-hybrid.dto";

@Controller({ path: "search", version: "1" })
export class SearchController {
	public constructor(
		@Inject(QueryBus)
		private readonly queryBus: QueryBus,
	) {}

	@Get()
	@ZodSerializerDto(SearchBooksHybridResponseDto)
	public async search(
		@Query(zodPipe(SearchBooksHybridDto.schema)) dto: SearchBooksHybridDto,
	): Promise<SearchBooksHybridResponseDto> {
		return this.queryBus.execute(
			new SearchBooksHybridQuery({
				query: dto.q,
				offset: dto.offset,
			}),
		);
	}
}
