import { Command } from "@nestjs/cqrs";

export interface ConfirmUploadIntentPayload {
	userId: bigint;
	uploadId: bigint;
}

export class ConfirmUploadIntentCommand extends Command<void> {
	public constructor(public readonly payload: ConfirmUploadIntentPayload) {
		super();
	}
}
