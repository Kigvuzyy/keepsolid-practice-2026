import { Command } from "@nestjs/cqrs";

export interface HandleBookCoverExtractedPayload {
	eventId: string;
	bookId: bigint;
	bucket: string;
	s3FilePath: string;
	contentType: string;
}

export class HandleBookCoverExtractedCommand extends Command<void> {
	public constructor(public readonly payload: HandleBookCoverExtractedPayload) {
		super();
	}
}
