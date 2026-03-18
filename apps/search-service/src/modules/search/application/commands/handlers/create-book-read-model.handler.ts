import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";

import type { ICommandHandler } from "@nestjs/cqrs";

import { CreateBookReadModelCommand } from "@/modules/search/application/commands/impl/create-book-read-model.command";
import { BookSearchReadModelRepositoryPort } from "@/modules/search/domain/ports/book-read-model.repository.port";

@CommandHandler(CreateBookReadModelCommand)
export class CreateBookReadModelHandler
	implements ICommandHandler<CreateBookReadModelCommand, void>
{
	public constructor(
		@Inject(BookSearchReadModelRepositoryPort)
		public readonly bookSearchReadModelRepo: BookSearchReadModelRepositoryPort,
	) {}

	public async execute(command: CreateBookReadModelCommand): Promise<void> {
		const { bookId, title, authors, description, coverObjectKey, createdAt } = command.payload;

		await this.bookSearchReadModelRepo.save({
			bookId,
			title,
			authors,
			description,
			coverObjectKey,
			createdAt,
		});
	}
}
