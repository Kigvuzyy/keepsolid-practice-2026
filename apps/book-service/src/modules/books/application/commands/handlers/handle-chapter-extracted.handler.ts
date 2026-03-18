import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { StoredChapterSchema } from "@kigvuzyy/shared";
import { SnowflakeIdService } from "@kigvuzyy/snowflake-id";

import type { ICommandHandler } from "@nestjs/cqrs";

import { BookChapter } from "@/modules/books/domain/entities";
import { ObjectStoragePort } from "@/modules/books/domain/ports/object-storage.port";
import { BookChapterRepositoryPort } from "@/modules/books/domain/ports/book-chapter.repository.port";
import { HandleChapterExtractedCommand } from "@/modules/books/application/commands/impl/handle-chapter-extracted.command";

@CommandHandler(HandleChapterExtractedCommand)
export class HandleChapterExtractedHandler
	implements ICommandHandler<HandleChapterExtractedCommand, void>
{
	public constructor(
		@Inject(BookChapterRepositoryPort)
		private readonly chapterRepo: BookChapterRepositoryPort,

		@Inject(SnowflakeIdService)
		private readonly snowflakeId: SnowflakeIdService,

		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,
	) {}

	public async execute(command: HandleChapterExtractedCommand): Promise<void> {
		const { bookId, bucket, s3FilePath, title } = command.payload;

		const raw = await this.storage.getObjectJson({ bucket, objectName: s3FilePath });
		const chapter = await StoredChapterSchema.parseAsync(raw);

		const createdChapter = BookChapter.create({
			id: this.snowflakeId.generate(),
			bookId: bookId,
			html: chapter.html,
			externalChapterId: chapter.chapterId,
			chapterIndex: chapter.chapterIndex,
			title: title,
			bucket: bucket,
			objectKey: s3FilePath,
		});

		await this.chapterRepo.upsert(createdChapter);
	}
}
