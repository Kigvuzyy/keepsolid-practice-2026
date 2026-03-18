import { Command } from "@nestjs/cqrs";

export interface CreateBookPayload {
	userId: bigint;
	uploadId: bigint;
	title: string;
	description: string | null;
	authors: string[];
}

export class CreateBookCommand extends Command<void> {
	public constructor(public readonly payload: CreateBookPayload) {
		super();
	}
}
