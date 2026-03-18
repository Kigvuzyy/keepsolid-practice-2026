import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";

import type { ICommandHandler } from "@nestjs/cqrs";

import { SyncBookCoverCommand } from "@/modules/search/application/commands/impl/sync-book-cover.command";
import { BookSearchReadModelRepositoryPort } from "@/modules/search/domain/ports/book-read-model.repository.port";

@CommandHandler(SyncBookCoverCommand)
export class SyncBookCoverHandler implements ICommandHandler<SyncBookCoverCommand, void> {
	public constructor(
		@Inject(BookSearchReadModelRepositoryPort)
		public readonly bookSearchReadModelRepo: BookSearchReadModelRepositoryPort,
	) {}

	public async execute(command: SyncBookCoverCommand): Promise<void> {
		const { bookId, coverObjectKey } = command.payload;

		await this.bookSearchReadModelRepo.setCoverObjectKey({
			bookId,
			coverObjectKey,
		});
	}
}
