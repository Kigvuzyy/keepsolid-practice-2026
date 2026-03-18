import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import { StoredChapterBatchSchema } from "@kigvuzyy/shared";

import type { ICommandHandler } from "@nestjs/cqrs";
import type { StoredChapterBatch } from "@kigvuzyy/shared";
import type {
	ChapterPayload,
	VectorizeChapterBatchPayload,
} from "@/modules/worker/application/commands/impl/vectorize-chapter-batch.command";

import { ObjectStoragePort } from "@/modules/worker/domain/ports/object-storage.port";
import { ChapterVectorizationService } from "@/modules/worker/application/services/chapter-vectorization.service";
import { VectorizeChapterBatchCommand } from "@/modules/worker/application/commands/impl/vectorize-chapter-batch.command";

const CHAPTER_BATCH_CONCURRENCY = 2;

@CommandHandler(VectorizeChapterBatchCommand)
export class VectorizeChapterBatchHandler
	implements ICommandHandler<VectorizeChapterBatchCommand, void>
{
	public constructor(
		@Inject(ObjectStoragePort)
		private readonly storage: ObjectStoragePort,

		@Inject(ChapterVectorizationService)
		private readonly chapterVectorization: ChapterVectorizationService,
	) {}

	public async execute(command: VectorizeChapterBatchCommand): Promise<void> {
		const { bookId, bucket, s3FilePath, coverS3FilePath } = command.payload;

		const raw = await this.storage.getObjectJson({ bucket, objectName: s3FilePath });
		const batch = await StoredChapterBatchSchema.parseAsync(raw);

		this.ensureBatchMatchesCommand(batch, command.payload, s3FilePath);

		await this.runWithConcurrency(
			batch.chapters,
			CHAPTER_BATCH_CONCURRENCY,
			async (chapter) => {
				await this.chapterVectorization.vectorizeChapter({
					bookId,
					chapterId: chapter.chapterId,
					chapterIndex: chapter.chapterIndex,
					chapterTitle: chapter.chapterTitle,
					html: chapter.html,
					s3FilePath,
					coverS3FilePath,
				});
			},
		);
	}

	private ensureBatchMatchesCommand(
		file: StoredChapterBatch,
		payload: VectorizeChapterBatchPayload,
		s3FilePath: string,
	): void {
		if (file.batchIndex !== payload.batchIndex) {
			throw new Error(
				`Stored chapter batch ${s3FilePath} has batchIndex ${file.batchIndex}, expected ${payload.batchIndex}`,
			);
		}

		if (file.chapters.length !== payload.chaptersCount) {
			throw new Error(
				`Stored chapter batch ${s3FilePath} has ${file.chapters.length} chapters, expected ${payload.chaptersCount}`,
			);
		}

		this.ensureExpectedChaptersMatch(file, payload.chapters, s3FilePath);
	}

	private ensureExpectedChaptersMatch(
		file: StoredChapterBatch,
		expectedChapters: ChapterPayload[],
		s3FilePath: string,
	): void {
		if (file.chapters.length !== expectedChapters.length) {
			throw new Error(
				`Stored chapter batch ${s3FilePath} chapter list size ${file.chapters.length} does not match payload size ${expectedChapters.length}`,
			);
		}

		const expectedKeys = new Set(
			expectedChapters.map((chapter) =>
				this.buildChapterKey(chapter.chapterId, chapter.chapterIndex),
			),
		);

		for (const chapter of file.chapters) {
			const key = this.buildChapterKey(chapter.chapterId, chapter.chapterIndex);

			if (!expectedKeys.delete(key)) {
				throw new Error(
					`Stored chapter batch ${s3FilePath} contains unexpected chapter ${key}`,
				);
			}
		}

		if (expectedKeys.size > 0) {
			throw new Error(
				`Stored chapter batch ${s3FilePath} is missing expected chapters: ${Array.from(expectedKeys).join(", ")}`,
			);
		}
	}

	private buildChapterKey(chapterId: string, chapterIndex: number): string {
		return `${chapterId}:${chapterIndex}`;
	}

	private async runWithConcurrency<T>(
		items: readonly T[],
		concurrency: number,
		worker: (item: T) => Promise<void>,
	): Promise<void> {
		if (items.length === 0) {
			return;
		}

		let nextIndex = 0;
		const workerCount = Math.min(concurrency, items.length);

		const runners = Array.from({ length: workerCount }, async () => {
			while (nextIndex < items.length) {
				const currentIndex = nextIndex;
				nextIndex += 1;

				await worker(items[currentIndex]!);
			}
		});

		await Promise.all(runners);
	}
}
