import { Command } from "@nestjs/cqrs";

export interface VectorizeChapterPayload {
	bookId: bigint;
	chapterId: string;
	chapterIndex: number;
	bucket: string;
	s3FilePath: string;
	coverS3FilePath: string | null;
}

export class VectorizeChapterCommand extends Command<void> {
	public constructor(public readonly payload: VectorizeChapterPayload) {
		super();
	}
}
