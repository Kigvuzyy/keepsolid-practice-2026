import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { SnowflakeIdService } from "@kigvuzyy/snowflake-id";
import { StoredChapterBatchSchema } from "@kigvuzyy/shared";

import type { ICommandHandler } from "@nestjs/cqrs";

import { BookChapter } from "@/modules/books/domain/entities";
import { ObjectStoragePort } from "@/modules/books/domain/ports/object-storage.port";
import { BookChapterRepositoryPort } from "@/modules/books/domain/ports/book-chapter.repository.port";
import { HandleChapterBatchExtractedCommand } from "@/modules/books/application/commands/impl/handle-chapter-batch-extracted.command";

@CommandHandler(HandleChapterBatchExtractedCommand)
export class HandleChapterBatchExtractedHandler
	implements ICommandHandler<HandleChapterBatchExtractedCommand, void>
{
	public constructor(
		@Inject(BookChapterRepositoryPort)
		private readonly chapterRepo: BookChapterRepositoryPort,

		@Inject(SnowflakeIdService)
		private readonly snowflakeId: SnowflakeIdService,

		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,
	) {}

	public async execute(command: HandleChapterBatchExtractedCommand): Promise<void> {
		const { bookId, bucket, s3FilePath } = command.payload;

		const raw = await this.storage.getObjectJson({ bucket, objectName: s3FilePath });
		const batch = await StoredChapterBatchSchema.parseAsync(raw);

		for (const chapter of batch.chapters) {
			const createdChapter = BookChapter.create({
				id: this.snowflakeId.generate(),
				bookId: bookId,
				html: chapter.html,
				externalChapterId: chapter.chapterId,
				chapterIndex: chapter.chapterIndex,
				bucket: bucket,
				objectKey: s3FilePath,
			});

			await this.chapterRepo.upsert(createdChapter);
		}
	}
}
