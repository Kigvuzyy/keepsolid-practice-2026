import { zodPipe } from "@kigvuzyy/shared";
import { ZodSerializerDto } from "nestjs-zod";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { parseSnowflakeId } from "@kigvuzyy/snowflake-id";
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from "@nestjs/common";

import { SuggestBookSearchQuery } from "@/modules/books/application/queries/impl";
import {
	CreateUploadIntentCommand,
	ConfirmUploadIntentCommand,
	CreateBookCommand,
} from "@/modules/books/application/commands/impl";
import {
	CreateUploadIntentDto,
	ConfirmUploadIntentDto,
	CreateBookDto,
	SuggestBookSearchDto,
	CreateUploadIntentResponseDto,
	SuggestBookSearchResponseDto,
} from "@/modules/books/application/dtos";

@Controller({ path: "books", version: "1" })
export class BooksController {
	public constructor(
		@Inject(CommandBus)
		private readonly commandBus: CommandBus,

		@Inject(QueryBus)
		private readonly queryBus: QueryBus,
	) {}

	@Get("search/suggest")
	@ZodSerializerDto(SuggestBookSearchResponseDto)
	public async suggestSearch(
		@Query(zodPipe(SuggestBookSearchDto.schema)) dto: SuggestBookSearchDto,
	): Promise<SuggestBookSearchResponseDto> {
		return this.queryBus.execute(
			new SuggestBookSearchQuery({
				query: dto.q,
				limit: dto.limit,
			}),
		);
	}

	@Post("uploads/presign")
	@HttpCode(HttpStatus.CREATED)
	@ZodSerializerDto(CreateUploadIntentResponseDto)
	public async presignUploadUrl(
		@Body(zodPipe(CreateUploadIntentDto.schema)) dto: CreateUploadIntentDto,
	): Promise<CreateUploadIntentResponseDto> {
		const userId = 123n; // test id

		return this.commandBus.execute(
			new CreateUploadIntentCommand({
				userId,
				fileName: dto.fileName,
				contentType: dto.contentType,
				contentLength: dto.contentLength,
			}),
		);
	}

	@Post("uploads/confirm")
	@HttpCode(HttpStatus.NO_CONTENT)
	public async confirmUpload(
		@Body(zodPipe(ConfirmUploadIntentDto.schema)) dto: ConfirmUploadIntentDto,
	): Promise<void> {
		const userId = 123n; // test id

		await this.commandBus.execute(
			new ConfirmUploadIntentCommand({
				userId,
				uploadId: parseSnowflakeId(dto.uploadId),
			}),
		);
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	public async createBook(
		@Body(zodPipe(CreateBookDto.schema)) dto: CreateBookDto,
	): Promise<void> {
		const userId = 123n; // test id

		await this.commandBus.execute(
			new CreateBookCommand({
				userId,
				uploadId: parseSnowflakeId(dto.uploadId),
				title: dto.title,
				description: dto.description,
				authors: dto.authors,
			}),
		);
	}
}
