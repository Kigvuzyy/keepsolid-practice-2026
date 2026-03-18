import { CommandBus } from "@nestjs/cqrs";
import { Topics } from "@kigvuzyy/kafka-topics";
import { BookEvents } from "@kigvuzyy/kafka-contracts";
import { parseSnowflakeId } from "@kigvuzyy/snowflake-id";
import { Ctx, EventPattern } from "@nestjs/microservices";
import { KafkaConsumerHelper } from "@kigvuzyy/kafka-infra";
import { Inject, Controller, Logger } from "@nestjs/common";
import { IdempotencyPort } from "@kigvuzyy/idempotency-core";
import { InjectTransactionHost } from "@nestjs-cls/transactional";
import { createEventRouter, DebeziumEvent, specUnionValidatePipe } from "@kigvuzyy/kafka-nest";

import type { KafkaContext } from "@nestjs/microservices";
import type { SpecEnvelope } from "@kigvuzyy/kafka-contracts";
import type { TransactionHost } from "@nestjs-cls/transactional";

import { BOOK_TRANSPORT } from "@/infrastructure/messaging/kafka/kafka.transport-ids";
import { HandleChapterExtractedCommand } from "@/modules/books/application/commands/impl/handle-chapter-extracted.command";
import { HandleChapterBatchExtractedCommand } from "@/modules/books/application/commands/impl/handle-chapter-batch-extracted.command";

@Controller()
export class ChapterExtractedConsumer {
	private readonly logger = new Logger(ChapterExtractedConsumer.name);

	private readonly helper = new KafkaConsumerHelper(this.logger, {
		allowKeyFallback: false,
	});

	private readonly route = createEventRouter(
		BookEvents.ChapterExtracted,
		BookEvents.ChapterBatchExtracted,
	);

	public constructor(
		@Inject(CommandBus)
		private readonly commandBus: CommandBus,

		@Inject(IdempotencyPort)
		private readonly idempotency: IdempotencyPort,

		@InjectTransactionHost()
		private readonly txHost: TransactionHost,
	) {}

	@EventPattern(Topics.bookChaptersExtracted.name, BOOK_TRANSPORT)
	public async handleChapterExtracted(
		@DebeziumEvent(
			specUnionValidatePipe(BookEvents.ChapterExtracted, BookEvents.ChapterBatchExtracted),
		)
		env:
			| SpecEnvelope<typeof BookEvents.ChapterBatchExtracted>
			| SpecEnvelope<typeof BookEvents.ChapterExtracted>,

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

			await this.route(env, {
				ChapterExtracted: async (e) => {
					await this.commandBus.execute(
						new HandleChapterExtractedCommand({
							eventId,
							bookId: parseSnowflakeId(e.payload.bookId),
							chapterId: e.payload.chapterId,
							chapterIndex: e.payload.chapterIndex,
							bucket: e.payload.bucket,
							s3FilePath: e.payload.s3FilePath,
						}),
					);

					processed = true;
				},
				ChapterBatchExtracted: async (e) => {
					await this.commandBus.execute(
						new HandleChapterBatchExtractedCommand({
							eventId,
							bookId: parseSnowflakeId(e.payload.bookId),
							bucket: e.payload.bucket,
							s3FilePath: e.payload.s3FilePath,
							chapters: e.payload.chapters,
						}),
					);

					processed = true;
				},
			});

			if (!processed) {
				return;
			}

			await this.idempotency.markProcessed(eventId, tx);
		});

		await this.helper.commit(context);

		if (!processed) {
			this.logger.warn(`[${eventId}] Duplicate ${env.type}, skipped`);
			return;
		}

		this.logger.log(`[${eventId}] Processed ${env.type} OK.`);
	}
}
