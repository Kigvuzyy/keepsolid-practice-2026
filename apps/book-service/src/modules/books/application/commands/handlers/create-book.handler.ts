import { CommandHandler } from "@nestjs/cqrs";
import { OutboxPort } from "@kigvuzyy/outbox-core";
import { TransactionHost } from "@nestjs-cls/transactional";
import { SnowflakeIdService } from "@kigvuzyy/snowflake-id";
import { ConflictException, Inject, NotFoundException } from "@nestjs/common";

import type { ICommandHandler } from "@nestjs/cqrs";

import { Book, UploadIntentStatus } from "@/modules/books/domain/entities";
import { BookRepositoryPort } from "@/modules/books/domain/ports/book.repository.port";
import { EventFactoryPort } from "@/modules/books/application/ports/event.factory.port";
import { CreateBookCommand } from "@/modules/books/application/commands/impl/create-book.command";
import { UploadIntentRepositoryPort } from "@/modules/books/domain/ports/upload-intent.repository.port";
import { BookSearchSuggestionRepositoryPort } from "@/modules/books/domain/ports/book-search-suggestion.repository.port";

@CommandHandler(CreateBookCommand)
export class CreateBookHandler implements ICommandHandler<CreateBookCommand, void> {
	public constructor(
		@Inject(SnowflakeIdService)
		private readonly snowflakeId: SnowflakeIdService,

		@Inject(BookRepositoryPort)
		private readonly bookRepo: BookRepositoryPort,

		@Inject(UploadIntentRepositoryPort)
		private readonly uploadIntentRepo: UploadIntentRepositoryPort,

		@Inject(BookSearchSuggestionRepositoryPort)
		private readonly suggestionRepo: BookSearchSuggestionRepositoryPort,

		@Inject(OutboxPort)
		private readonly outbox: OutboxPort,

		@Inject(EventFactoryPort)
		private readonly eventFactory: EventFactoryPort,

		@Inject(TransactionHost)
		private readonly txHost: TransactionHost,
	) {}

	public async execute(command: CreateBookCommand): Promise<void> {
		const { userId, uploadId, title, description, authors } = command.payload;

		const uploadIntent = await this.uploadIntentRepo.findByIdAndUserId({
			id: uploadId,
			userId,
		});

		if (!uploadIntent?.id) {
			throw new NotFoundException("Upload intent not found");
		}

		if (uploadIntent.status !== UploadIntentStatus.CONFIRMED) {
			throw new ConflictException("Upload intent is not confirmed");
		}

		const book = Book.create({
			id: this.snowflakeId.generate(),
			ownerId: userId,
			uploadIntentId: uploadIntent.id,
			title,
			description,
			authors,
		});

		await this.txHost.withTransaction(async () => {
			const created = await this.bookRepo.create(book);

			await this.suggestionRepo.syncBookSuggestions({
				id: this.snowflakeId.generate(),
				bookId: created.id,
				title,
				authors,
			});

			const bookCreatedEvent = this.eventFactory.createBookCreated({
				bookId: created.id,
				title: book.title,
				authors: book.authors,
				description: book.description,
				coverObjectKey: book.coverObjectKey,
				createdAt: book.createdAt,
			});

			const bookUploadedEvent = this.eventFactory.createBookUploaded({
				bookId: created.id,
				bucket: uploadIntent.bucket,
				objectName: uploadIntent.objectKey,
			});

			await this.outbox.appendMany([bookCreatedEvent, bookUploadedEvent]);
		});
	}
}
