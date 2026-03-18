import { Command } from "@nestjs/cqrs";

export interface HandleChapterBatchExtractedPayload {
	eventId: string;
	bookId: bigint;
	bucket: string;
	s3FilePath: string;
	chapters: readonly {
		chapterId: string;
		chapterIndex: number;
	}[];
}

export class HandleChapterBatchExtractedCommand extends Command<void> {
	public constructor(public readonly payload: HandleChapterBatchExtractedPayload) {
		super();
	}
}
