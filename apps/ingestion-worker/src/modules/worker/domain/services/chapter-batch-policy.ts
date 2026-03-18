import { Injectable } from "@nestjs/common";

export interface ChapterBatchPolicyConfig {
	smallChapterMaxBytes: number;
	batchMaxChapters: number;
	batchMaxBytes: number;
}

@Injectable()
export class ChapterBatchPolicy {
	public static readonly DEFAULT_SMALL_CHAPTER_MAX_BYTES = 8 * 1024;

	public static readonly DEFAULT_BATCH_MAX_CHAPTERS = 24;

	public static readonly DEFAULT_BATCH_MAX_BYTES = 512 * 1024;

	public readonly config: ChapterBatchPolicyConfig;

	public constructor(config?: Partial<ChapterBatchPolicyConfig>) {
		this.config = {
			smallChapterMaxBytes: Math.max(
				256,
				config?.smallChapterMaxBytes ?? ChapterBatchPolicy.DEFAULT_SMALL_CHAPTER_MAX_BYTES,
			),
			batchMaxChapters: Math.max(
				2,
				config?.batchMaxChapters ?? ChapterBatchPolicy.DEFAULT_BATCH_MAX_CHAPTERS,
			),
			batchMaxBytes: Math.max(
				2 * 1024,
				config?.batchMaxBytes ?? ChapterBatchPolicy.DEFAULT_BATCH_MAX_BYTES,
			),
		};
	}

	public isSmallChapter(chapterJsonBytes: number): boolean {
		return chapterJsonBytes <= this.config.smallChapterMaxBytes;
	}

	public shouldFlushBeforeAppend(
		pendingItemsCount: number,
		pendingBytes: number,
		nextChapterBytes: number,
	): boolean {
		if (pendingItemsCount === 0) {
			return false;
		}

		return (
			pendingItemsCount >= this.config.batchMaxChapters ||
			pendingBytes + nextChapterBytes > this.config.batchMaxBytes
		);
	}

	public shouldFlushAfterAppend(pendingItemsCount: number, pendingBytes: number): boolean {
		return (
			pendingItemsCount >= this.config.batchMaxChapters ||
			pendingBytes >= this.config.batchMaxBytes
		);
	}
}
