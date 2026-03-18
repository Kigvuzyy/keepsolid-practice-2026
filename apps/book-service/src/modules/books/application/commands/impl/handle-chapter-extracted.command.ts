import { Command } from "@nestjs/cqrs";

export interface HandleChapterExtractedPayload {
	eventId: string;
	bookId: bigint;
	chapterId: string;
	chapterIndex: number;
	bucket: string;
	s3FilePath: string;
	title?: string | null;
}

export class HandleChapterExtractedCommand extends Command<void> {
	public constructor(public readonly payload: HandleChapterExtractedPayload) {
		super();
	}
}
