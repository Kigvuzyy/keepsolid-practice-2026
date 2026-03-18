import { Command } from "@nestjs/cqrs";

export interface UnpackBookPayload {
	bookId: bigint;
	targetBucket: string;
	targetPrefix?: string;
	sourceBucket: string;
	sourceObjectName: string;
}

export class UnpackBookCommand extends Command<void> {
	public constructor(public readonly payload: UnpackBookPayload) {
		super();
	}
}
