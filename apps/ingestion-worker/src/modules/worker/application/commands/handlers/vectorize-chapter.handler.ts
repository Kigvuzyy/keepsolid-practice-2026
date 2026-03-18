import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { StoredChapterSchema } from "@kigvuzyy/shared";

import type { ICommandHandler } from "@nestjs/cqrs";
import type { StoredChapter } from "@kigvuzyy/shared";

import { ObjectStoragePort } from "@/modules/worker/domain/ports/object-storage.port";
import { VectorizeChapterCommand } from "@/modules/worker/application/commands/impl/vectorize-chapter.command";
import { ChapterVectorizationService } from "@/modules/worker/application/services/chapter-vectorization.service";

@CommandHandler(VectorizeChapterCommand)
export class VectorizeChapterHandler implements ICommandHandler<VectorizeChapterCommand, void> {
	public constructor(
		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,

		@Inject(ChapterVectorizationService)
		private readonly chapterVectorization: ChapterVectorizationService,
	) {}

	public async execute(command: VectorizeChapterCommand): Promise<void> {
		const { bucket, s3FilePath, bookId, chapterId, chapterIndex, coverS3FilePath } =
			command.payload;

		const raw = await this.storage.getObjectJson({ bucket, objectName: s3FilePath });
		const chapter = await StoredChapterSchema.parseAsync(raw);

		this.ensureChapterMatchesCommand(chapter, chapterId, chapterIndex, s3FilePath);

		await this.chapterVectorization.vectorizeChapter({
			bookId,
			chapterId: chapter.chapterId,
			chapterIndex: chapter.chapterIndex,
			chapterTitle: chapter.chapterTitle,
			html: chapter.html,
			s3FilePath,
			coverS3FilePath,
		});
	}

	private ensureChapterMatchesCommand(
		chapter: StoredChapter,
		expectedChapterId: string,
		expectedChapterIndex: number,
		s3FilePath: string,
	): void {
		if (chapter.chapterId !== expectedChapterId) {
			throw new Error(
				`Stored chapter ${s3FilePath} has chapterId ${chapter.chapterId}, expected ${expectedChapterId}`,
			);
		}

		if (chapter.chapterIndex !== expectedChapterIndex) {
			throw new Error(
				`Stored chapter ${s3FilePath} has chapterIndex ${chapter.chapterIndex}, expected ${expectedChapterIndex}`,
			);
		}
	}
}
