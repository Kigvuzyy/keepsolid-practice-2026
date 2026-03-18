import { CommandBus } from "@nestjs/cqrs";
import { Topics } from "@kigvuzyy/kafka-topics";
import { BookEvents } from "@kigvuzyy/kafka-contracts";
import { Ctx, EventPattern } from "@nestjs/microservices";
import { parseSnowflakeId } from "@kigvuzyy/snowflake-id";
import { KafkaConsumerHelper } from "@kigvuzyy/kafka-infra";
import { Controller, Inject, Logger } from "@nestjs/common";
import { IdempotencyPort } from "@kigvuzyy/idempotency-core";
import { createEventRouter, DebeziumEvent, specUnionValidatePipe } from "@kigvuzyy/kafka-nest";

import type { KafkaContext } from "@nestjs/microservices";
import type { SpecEnvelope } from "@kigvuzyy/kafka-contracts";

import { BOOK_TRANSPORT } from "@/infrastructure/messaging/kafka/kafka.transport-ids";
import {
	VectorizeChapterCommand,
	VectorizeChapterBatchCommand,
} from "@/modules/worker/application/commands/impl";

@Controller()
export class ChapterVectorizerConsumer {
	private readonly logger = new Logger(ChapterVectorizerConsumer.name);

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
	) {}

	@EventPattern(Topics.bookChaptersExtracted.name, BOOK_TRANSPORT)
	public async handleUnpack(
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

		if (await this.idempotency.isProcessed(eventId)) {
			await this.helper.commit(context);

			this.logger.warn(`[${eventId}] Duplicate ${env.type}, skipped`);

			return;
		}

		await this.route(env, {
			ChapterExtracted: async (e) => {
				const bookId = parseSnowflakeId(e.payload.bookId);

				await this.commandBus.execute(
					new VectorizeChapterCommand({
						bookId,
						chapterId: e.payload.chapterId,
						chapterIndex: e.payload.chapterIndex,
						bucket: e.payload.bucket,
						s3FilePath: e.payload.s3FilePath,
						coverS3FilePath: e.payload.coverS3FilePath,
					}),
				);
			},
			ChapterBatchExtracted: async (e) => {
				const bookId = parseSnowflakeId(e.payload.bookId);

				await this.commandBus.execute(
					new VectorizeChapterBatchCommand({
						bookId,
						batchIndex: e.payload.batchIndex,
						bucket: e.payload.bucket,
						s3FilePath: e.payload.s3FilePath,
						coverS3FilePath: e.payload.coverS3FilePath,
						chaptersCount: e.payload.chaptersCount,
						chapters: e.payload.chapters,
					}),
				);
			},
		});

		await this.idempotency.markProcessed(eventId);
		await this.helper.commit(context);

		this.logger.log(`[${eventId}] Processed ${env.type} OK.`);
	}
}
