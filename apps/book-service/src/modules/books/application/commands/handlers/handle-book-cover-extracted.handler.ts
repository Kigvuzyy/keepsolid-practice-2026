import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";

import type { ICommandHandler } from "@nestjs/cqrs";

import { BookRepositoryPort } from "@/modules/books/domain/ports/book.repository.port";
import { HandleBookCoverExtractedCommand } from "@/modules/books/application/commands/impl/handle-book-cover-extracted.command";

@CommandHandler(HandleBookCoverExtractedCommand)
export class HandleBookCoverExtractedHandler
	implements ICommandHandler<HandleBookCoverExtractedCommand, void>
{
	public constructor(
		@Inject(BookRepositoryPort)
		private readonly bookRepo: BookRepositoryPort,
	) {}

	public async execute(command: HandleBookCoverExtractedCommand): Promise<void> {
		const { bookId, bucket, s3FilePath } = command.payload;

		await this.bookRepo.assignCover({
			bookId,
			bucket,
			objectKey: s3FilePath,
		});
	}
}
