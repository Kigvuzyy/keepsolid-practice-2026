import { Command } from "@nestjs/cqrs";

export interface ChapterPayload {
	chapterId: string;
	chapterIndex: number;
}

export interface VectorizeChapterBatchPayload {
	bookId: bigint;
	batchIndex: number;
	bucket: string;
	s3FilePath: string;
	coverS3FilePath: string | null;
	chaptersCount: number;
	chapters: ChapterPayload[];
}

export class VectorizeChapterBatchCommand extends Command<void> {
	public constructor(public readonly payload: VectorizeChapterBatchPayload) {
		super();
	}
}
