import { Command } from "@nestjs/cqrs";

export interface SyncBookCoverPayload {
	bookId: bigint;
	coverObjectKey: string;
}

export class SyncBookCoverCommand extends Command<void> {
	public constructor(public readonly payload: SyncBookCoverPayload) {
		super();
	}
}
