import { Command } from "@nestjs/cqrs";

import type { CreateUploadIntentResponseDto } from "@/modules/books/application/dtos";

export interface CreateUploadIntentPayload {
	userId: bigint;
	fileName: string;
	contentType: string;
	contentLength: number;
}

export class CreateUploadIntentCommand extends Command<CreateUploadIntentResponseDto> {
	public constructor(public readonly payload: CreateUploadIntentPayload) {
		super();
	}
}
