import { Injectable } from "@nestjs/common";
import { formatSnowflakeId } from "@kigvuzyy/snowflake-id";
import { BookEvents, makeEvent } from "@kigvuzyy/kafka-contracts";
import { getActiveTraceContext } from "@kigvuzyy/observability/otel";

import type { SpecOutboxEnvelope } from "@kigvuzyy/kafka-contracts";
import type {
	EventFactoryPort,
	CreateBookUploadedPayload,
	CreateBookCreatedPayload,
} from "@/modules/books/application/ports/event.factory.port";

@Injectable()
export class EventFactory implements EventFactoryPort {
	private getMeta() {
		return {
			correlationId: null,
			causationId: null,
			...getActiveTraceContext(),
		};
	}

	public createBookCreated(
		payload: CreateBookCreatedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookCreated> {
		return makeEvent(
			BookEvents.BookCreated,
			{
				bookId: formatSnowflakeId(payload.bookId),
				title: payload.title,
				authors: payload.authors,
				description: payload.description,
				coverObjectKey: payload.coverObjectKey,
				createdAt: payload.createdAt.toISOString(),
			},
			this.getMeta(),
		);
	}

	public createBookUploaded(
		payload: CreateBookUploadedPayload,
	): SpecOutboxEnvelope<typeof BookEvents.BookUploaded> {
		return makeEvent(
			BookEvents.BookUploaded,
			{
				bookId: formatSnowflakeId(payload.bookId),
				bucket: payload.bucket,
				objectName: payload.objectName,
			},
			this.getMeta(),
		);
	}
}
