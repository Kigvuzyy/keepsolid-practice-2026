import type { SpecOutboxEnvelope, BookEvents } from "@kigvuzyy/kafka-contracts";

export interface CreateBookCreatedPayload {
	bookId: bigint;
	title: string;
	authors: string[];
	description: string | null;
	coverObjectKey: string | null;
	createdAt: Date;
}

export interface CreateBookUploadedPayload {
	bookId: bigint;
	bucket: string;
	objectName: string;
}

export abstract class EventFactoryPort {
	public abstract createBookCreated(
		payload: CreateBookCreatedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookCreated>;

	public abstract createBookUploaded(
		payload: CreateBookUploadedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookUploaded>;
}
