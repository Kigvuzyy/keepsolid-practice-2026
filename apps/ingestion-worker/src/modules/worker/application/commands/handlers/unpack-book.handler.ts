import { CommandHandler } from "@nestjs/cqrs";
import { Inject, Logger } from "@nestjs/common";
import { OutboxPort } from "@kigvuzyy/outbox-core";

import type { ICommandHandler } from "@nestjs/cqrs";
import type { BookCoverAsset } from "@/modules/worker/domain/ports/epub-chapter-reader.port";
import type {
	ChapterPayload,
	UploadedChapterBatch,
	UploadedChapterObject,
	UploadedSingleChapter,
} from "@/modules/worker/domain/ports/chapter-storage.port";

import { ObjectKeyFactory } from "@/modules/worker/domain/services/object-key-factory";
import { EventFactoryPort } from "@/modules/worker/application/ports/event.factory.port";
import { ChapterBatchPolicy } from "@/modules/worker/domain/services/chapter-batch-policy";
import { EpubChapterReaderPort } from "@/modules/worker/domain/ports/epub-chapter-reader.port";
import { UnpackBookCommand } from "@/modules/worker/application/commands/impl/unpack-book.command";
import { ChapterStorageFactoryPort } from "@/modules/worker/domain/ports/chapter-storage-factory.port";
import { BookCoverStorageService } from "@/modules/worker/application/services/book-cover-storage.service";
import { BookVectorizationProgressService } from "@/modules/worker/application/services/book-vectorization-progress.service";

@CommandHandler(UnpackBookCommand)
export class UnpackBookHandler implements ICommandHandler<UnpackBookCommand, void> {
	private readonly logger = new Logger(UnpackBookHandler.name);

	public constructor(
		@Inject(ObjectKeyFactory)
		private readonly keyFactory: ObjectKeyFactory,

		@Inject(EpubChapterReaderPort)
		private readonly chapterReader: EpubChapterReaderPort,

		@Inject(ChapterStorageFactoryPort)
		private readonly chapterStorageFactory: ChapterStorageFactoryPort,

		@Inject(ChapterBatchPolicy)
		private readonly batchPolicy: ChapterBatchPolicy,

		@Inject(OutboxPort)
		private readonly outbox: OutboxPort,

		@Inject(EventFactoryPort)
		private readonly eventFactory: EventFactoryPort,

		@Inject(BookVectorizationProgressService)
		private readonly vectorizationProgress: BookVectorizationProgressService,

		@Inject(BookCoverStorageService)
		private readonly coverStorage: BookCoverStorageService,
	) {}

	public async execute(command: UnpackBookCommand): Promise<void> {
		const { sourceBucket, sourceObjectName, targetBucket, targetPrefix, bookId } =
			command.payload;

		const readSession = await this.chapterReader.open({
			sourceBucket,
			sourceObjectName,
		});

		const resolvedTargetPrefix = this.keyFactory.resolveTargetPrefix(
			readSession.getContext().sourceEpub,
			targetPrefix,
		);

		const chapterStorage = this.chapterStorageFactory.create({
			targetBucket,
			targetPrefix: resolvedTargetPrefix,
			batchPolicy: this.batchPolicy,
		});

		let expectedChaptersCount = 0;

		try {
			const coverS3FilePath = await this.persistCoverIfPresent({
				bookId,
				targetBucket,
				targetPrefix: resolvedTargetPrefix,
				coverAsset: readSession.getCoverAsset(),
			});

			for await (const chapter of readSession.extractChapters()) {
				const payload: ChapterPayload = {
					chapterId: chapter.chapterId,
					chapterTitle: chapter.chapterTitle,
					chapterIndex: chapter.chapterIndex,
					html: chapter.html,
				};

				const { uploadedObjects } = await chapterStorage.persistChapter(payload);

				await this.appendUploadedObjects(bookId, uploadedObjects, coverS3FilePath);
				expectedChaptersCount += 1;
			}

			const flushedBatch = await chapterStorage.flush();

			if (flushedBatch) {
				await this.appendUploadedObjects(bookId, [flushedBatch], coverS3FilePath);
			}

			if (expectedChaptersCount > 0) {
				await this.vectorizationProgress.planBookVectorization({
					bookId,
					expectedChaptersCount,
				});
			}
		} finally {
			readSession.close();
		}
	}

	private async persistCoverIfPresent(params: {
		bookId: bigint;
		targetBucket: string;
		targetPrefix: string;
		coverAsset: BookCoverAsset | null;
	}): Promise<string | null> {
		if (!params.coverAsset) {
			return null;
		}

		let uploadedCover: {
			bucket: string;
			objectName: string;
			contentType: string;
		};

		try {
			uploadedCover = await this.coverStorage.persistCover({
				targetBucket: params.targetBucket,
				targetPrefix: params.targetPrefix,
				coverAsset: params.coverAsset,
			});
		} catch (error: unknown) {
			this.logger.warn(
				`Book cover upload skipped for ${params.bookId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);

			return null;
		}

		try {
			await this.appendBookCoverExtracted(params.bookId, uploadedCover);
		} catch (error: unknown) {
			this.logger.warn(
				`Book cover event append skipped for ${params.bookId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}

		return uploadedCover.objectName;
	}

	private async appendUploadedObjects(
		bookId: bigint,
		uploadedObjects: UploadedChapterObject[],
		coverS3FilePath: string | null,
	): Promise<void> {
		for (const uploadedObject of uploadedObjects) {
			if (uploadedObject.kind === "chapter") {
				await this.appendChapterExtracted(bookId, uploadedObject, coverS3FilePath);
				continue;
			}

			await this.appendChapterBatchExtracted(bookId, uploadedObject, coverS3FilePath);
		}
	}

	private async appendChapterExtracted(
		bookId: bigint,
		uploadedChapter: UploadedSingleChapter,
		coverS3FilePath: string | null,
	): Promise<void> {
		const event = this.eventFactory.createChapterExtracted({
			bookId,
			bucket: uploadedChapter.bucket,
			chapterId: uploadedChapter.chapterId,
			chapterIndex: uploadedChapter.chapterIndex,
			s3FilePath: uploadedChapter.objectName,
			coverS3FilePath,
		});

		await this.outbox.append(event);
	}

	private async appendBookCoverExtracted(
		bookId: bigint,
		uploadedCover: {
			bucket: string;
			objectName: string;
			contentType: string;
		},
	): Promise<void> {
		const event = this.eventFactory.createBookCoverExtracted({
			bookId,
			bucket: uploadedCover.bucket,
			s3FilePath: uploadedCover.objectName,
			contentType: uploadedCover.contentType,
		});

		await this.outbox.append(event);
	}

	private async appendChapterBatchExtracted(
		bookId: bigint,
		uploadedBatch: UploadedChapterBatch,
		coverS3FilePath: string | null,
	): Promise<void> {
		const event = this.eventFactory.createChapterBatchExtracted({
			bookId,
			bucket: uploadedBatch.bucket,
			batchIndex: uploadedBatch.batchIndex,
			s3FilePath: uploadedBatch.objectName,
			coverS3FilePath,
			chapters: uploadedBatch.chapters,
		});

		await this.outbox.append(event);
	}
}
