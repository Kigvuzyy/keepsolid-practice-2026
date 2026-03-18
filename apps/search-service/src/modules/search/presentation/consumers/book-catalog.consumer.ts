import { CommandBus } from "@nestjs/cqrs";
import { Topics } from "@kigvuzyy/kafka-topics";
import { BookEvents } from "@kigvuzyy/kafka-contracts";
import { parseSnowflakeId } from "@kigvuzyy/snowflake-id";
import { Ctx, EventPattern } from "@nestjs/microservices";
import { KafkaConsumerHelper } from "@kigvuzyy/kafka-infra";
import { Controller, Inject, Logger } from "@nestjs/common";
import { IdempotencyPort } from "@kigvuzyy/idempotency-core";
import { InjectTransactionHost } from "@nestjs-cls/transactional";
import { DebeziumEvent, specValidatePipe } from "@kigvuzyy/kafka-nest";

import type { KafkaContext } from "@nestjs/microservices";
import type { SpecEnvelope } from "@kigvuzyy/kafka-contracts";
import type { TransactionHost } from "@nestjs-cls/transactional";

import { BOOK_TRANSPORT } from "@/infrastructure/messaging/kafka/kafka.transport-ids";
import {
	CreateBookReadModelCommand,
	SyncBookCoverCommand,
} from "@/modules/search/application/commands/impl";

@Controller()
export class BookCatalogConsumer {
	private readonly logger = new Logger(BookCatalogConsumer.name);

	private readonly helper = new KafkaConsumerHelper(this.logger, {
		allowKeyFallback: false,
	});

	public constructor(
		@Inject(CommandBus)
		private readonly commandBus: CommandBus,

		@Inject(IdempotencyPort)
		private readonly idempotency: IdempotencyPort,

		@InjectTransactionHost()
		private readonly txHost: TransactionHost,
	) {}

	@EventPattern(Topics.bookCatalog.name, BOOK_TRANSPORT)
	public async handleChange(
		@DebeziumEvent(specValidatePipe(BookEvents.BookCreated))
		env: SpecEnvelope<typeof BookEvents.BookCreated>,

		@Ctx() context: KafkaContext,
	): Promise<void> {
		const meta = this.helper.getMeta(context);

		if (!meta) {
			await this.helper.commit(context);
			return;
		}

		const { eventId } = meta;
		let processed = false;

		await this.txHost.withTransaction(async () => {
			const tx = this.txHost.tx;

			if (await this.idempotency.isProcessed(eventId, tx)) {
				return;
			}

			await this.commandBus.execute(
				new CreateBookReadModelCommand({
					bookId: parseSnowflakeId(env.payload.bookId),
					title: env.payload.title,
					authors: env.payload.authors,
					description: env.payload.description,
					coverObjectKey: env.payload.coverObjectKey,
					createdAt: new Date(env.payload.createdAt),
				}),
			);

			await this.idempotency.markProcessed(eventId, tx);
			processed = true;
		});

		await this.helper.commit(context);

		if (!processed) {
			this.logger.warn(`[${eventId}] Duplicate ${env.type}, skipped`);
			return;
		}

		this.logger.log(`[${eventId}] Processed ${env.type} OK.`);
	}

	@EventPattern(Topics.bookAssetsExtracted.name, BOOK_TRANSPORT)
	public async handleCover(
		@DebeziumEvent(specValidatePipe(BookEvents.BookCoverExtracted))
		env: SpecEnvelope<typeof BookEvents.BookCoverExtracted>,

		@Ctx() context: KafkaContext,
	): Promise<void> {
		const meta = this.helper.getMeta(context);

		if (!meta) {
			await this.helper.commit(context);
			return;
		}

		const { eventId } = meta;
		let processed = false;

		await this.txHost.withTransaction(async () => {
			const tx = this.txHost.tx;

			if (await this.idempotency.isProcessed(eventId, tx)) {
				return;
			}

			await this.commandBus.execute(
				new SyncBookCoverCommand({
					bookId: parseSnowflakeId(env.payload.bookId),
					coverObjectKey: env.payload.s3FilePath,
				}),
			);

			await this.idempotency.markProcessed(eventId, tx);
			processed = true;
		});

		await this.helper.commit(context);

		if (!processed) {
			this.logger.warn(`[${eventId}] Duplicate ${env.type}, skipped`);
			return;
		}

		this.logger.log(`[${eventId}] Processed ${env.type} OK.`);
	}
}
