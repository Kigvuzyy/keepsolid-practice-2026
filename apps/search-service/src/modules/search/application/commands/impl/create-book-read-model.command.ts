import { Command } from "@nestjs/cqrs";

export interface CreateBookReadModelPayload {
	bookId: bigint;
	title: string;
	authors: string[];
	description: string | null;
	coverObjectKey: string | null;
	createdAt: Date;
}

export class CreateBookReadModelCommand extends Command<void> {
	public constructor(public readonly payload: CreateBookReadModelPayload) {
		super();
	}
}
