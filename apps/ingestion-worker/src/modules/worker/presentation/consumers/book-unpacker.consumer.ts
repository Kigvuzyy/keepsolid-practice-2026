import { CommandBus } from "@nestjs/cqrs";
import { BookEvents } from "@kigvuzyy/kafka-contracts";
import { Ctx, EventPattern } from "@nestjs/microservices";
import { parseSnowflakeId } from "@kigvuzyy/snowflake-id";
import { KafkaConsumerHelper } from "@kigvuzyy/kafka-infra";
import { Controller, Inject, Logger } from "@nestjs/common";
import { IdempotencyPort } from "@kigvuzyy/idempotency-core";
import { DebeziumEvent, specValidatePipe } from "@kigvuzyy/kafka-nest";

import type { KafkaContext } from "@nestjs/microservices";
import type { SpecEnvelope } from "@kigvuzyy/kafka-contracts";

import { UnpackBookCommand } from "@/modules/worker/application/commands/impl";
import { BOOK_TRANSPORT } from "@/infrastructure/messaging/kafka/kafka.transport-ids";

@Controller()
export class BookUnpackerConsumer {
	private readonly logger = new Logger(BookUnpackerConsumer.name);

	private readonly helper = new KafkaConsumerHelper(this.logger, {
		allowKeyFallback: false,
	});

	public constructor(
		@Inject(CommandBus)
		private readonly commandBus: CommandBus,

		@Inject(IdempotencyPort)
		private readonly idempotency: IdempotencyPort,
	) {}

	@EventPattern(BookEvents.BookUploaded.topic.name, BOOK_TRANSPORT)
	public async handleUnpack(
		@DebeziumEvent(specValidatePipe(BookEvents.BookUploaded))
		env: SpecEnvelope<typeof BookEvents.BookUploaded>,

		@Ctx() context: KafkaContext,
	): Promise<void> {
		const meta = this.helper.getMeta(context);

		if (!meta) {
			await this.helper.commit(context);
			return;
		}

		const { eventId } = meta;

		if (await this.idempotency.isProcessed(eventId)) {
			await this.helper.commit(context);

			this.logger.warn(`[${eventId}] Duplicate ${env.type}, skipped`);

			return;
		}

		const bookId = parseSnowflakeId(env.payload.bookId);

		await this.commandBus.execute(
			new UnpackBookCommand({
				bookId,
				targetBucket: "book-files",
				targetPrefix: `books/${bookId.toString()}`,
				sourceBucket: env.payload.bucket,
				sourceObjectName: env.payload.objectName,
			}),
		);

		await this.idempotency.markProcessed(eventId);
		await this.helper.commit(context);

		this.logger.log(`[${eventId}] Processed ${env.type} OK.`);
	}
}
