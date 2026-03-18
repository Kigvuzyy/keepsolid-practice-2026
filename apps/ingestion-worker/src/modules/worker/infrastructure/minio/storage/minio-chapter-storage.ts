import { Buffer } from "node:buffer";

import type { MinioService } from "@kigvuzyy/minio-nest";
import type { ObjectKeyFactory } from "@/modules/worker/domain/services/object-key-factory";
import type { ChapterBatchPolicy } from "@/modules/worker/domain/services/chapter-batch-policy";
import type {
	ChapterPayload,
	ChapterStoragePort,
	PersistChapterResult,
	UploadedChapterBatch,
	UploadedChapterObject,
} from "@/modules/worker/domain/ports/chapter-storage.port";

interface PendingBatchEntry {
	payload: ChapterPayload;
	jsonBytes: number;
}

export interface MinioChapterStorageConfig {
	targetBucket: string;
	targetPrefix: string;
	batchPolicy: ChapterBatchPolicy;
}

export class MinioChapterStorage implements ChapterStoragePort {
	private readonly pendingBatchEntries: PendingBatchEntry[] = [];

	private pendingBatchBytes = 0;

	private batchIndex = 0;

	private totalUploadedBytes = 0;

	public constructor(
		private readonly minioClient: MinioService,
		private readonly keyFactory: ObjectKeyFactory,
		private readonly config: MinioChapterStorageConfig,
	) {}

	public async persistChapter(payload: ChapterPayload): Promise<PersistChapterResult> {
		const uploadedObjects: UploadedChapterObject[] = [];

		const chapterJson = `${JSON.stringify(payload)}\n`;
		const chapterBuffer = Buffer.from(chapterJson, "utf8");
		const chapterJsonBytes = chapterBuffer.length;

		if (this.config.batchPolicy.isSmallChapter(chapterJsonBytes)) {
			if (
				this.config.batchPolicy.shouldFlushBeforeAppend(
					this.pendingBatchEntries.length,
					this.pendingBatchBytes,
					chapterJsonBytes,
				)
			) {
				const flushedBatch = await this.flush();

				if (flushedBatch) {
					uploadedObjects.push(flushedBatch);
				}
			}

			this.pendingBatchEntries.push({
				payload,
				jsonBytes: chapterJsonBytes,
			});

			this.pendingBatchBytes += chapterJsonBytes;

			if (
				this.config.batchPolicy.shouldFlushAfterAppend(
					this.pendingBatchEntries.length,
					this.pendingBatchBytes,
				)
			) {
				const flushedBatch = await this.flush();

				if (flushedBatch) {
					uploadedObjects.push(flushedBatch);
				}
			}

			return {
				uploadedObjects,
			};
		}

		const flushedBatch = await this.flush();

		if (flushedBatch) {
			uploadedObjects.push(flushedBatch);
		}

		const chapterObjectName = this.keyFactory.buildChapterObjectName(
			this.config.targetPrefix,
			payload.chapterIndex,
			payload.chapterId,
		);

		await this.uploadJson(chapterObjectName, chapterBuffer);

		return {
			uploadedObjects: [
				...uploadedObjects,
				{
					kind: "chapter",
					bucket: this.config.targetBucket,
					objectName: chapterObjectName,
					chapterId: payload.chapterId,
					chapterIndex: payload.chapterIndex,
				},
			],
		};
	}

	public async flush(): Promise<UploadedChapterBatch | null> {
		if (this.pendingBatchEntries.length === 0) {
			return null;
		}

		this.batchIndex += 1;

		const batchObjectName = this.keyFactory.buildBatchObjectName(
			this.config.targetPrefix,
			this.batchIndex,
		);

		const batchChapters = this.pendingBatchEntries.map((entry) => ({
			chapterId: entry.payload.chapterId,
			chapterIndex: entry.payload.chapterIndex,
		}));

		const batchPayload = {
			batchIndex: this.batchIndex,
			chapters: this.pendingBatchEntries.map((entry) => entry.payload),
		};

		const batchJson = `${JSON.stringify(batchPayload)}\n`;
		const batchBuffer = Buffer.from(batchJson, "utf-8");

		await this.uploadJson(batchObjectName, batchBuffer);

		this.pendingBatchEntries.length = 0;
		this.pendingBatchBytes = 0;

		return {
			kind: "batch",
			bucket: this.config.targetBucket,
			objectName: batchObjectName,
			batchIndex: this.batchIndex,
			chapters: batchChapters,
		};
	}

	public getTotalUploadedBytes(): number {
		return this.totalUploadedBytes;
	}

	private async uploadJson(objectName: string, buffer: Buffer): Promise<void> {
		await this.minioClient.putObject(
			this.config.targetBucket,
			objectName,
			buffer,
			buffer.length,
			{ "Content-Type": "application/json; charset=utf-8" },
		);

		this.totalUploadedBytes += buffer.length;
	}
}
