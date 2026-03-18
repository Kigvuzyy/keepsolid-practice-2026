import { Topics } from "@kigvuzyy/kafka-topics";
import { BookEvents } from "@kigvuzyy/kafka-contracts";
import { Ctx, EventPattern } from "@nestjs/microservices";
import { KafkaConsumerHelper } from "@kigvuzyy/kafka-infra";
import { Inject, Controller, Logger } from "@nestjs/common";
import { IdempotencyPort } from "@kigvuzyy/idempotency-core";
import { InjectTransactionHost } from "@nestjs-cls/transactional";
import { parseSnowflakeId, SnowflakeIdService } from "@kigvuzyy/snowflake-id";
import {
	createEventRouter,
	DebeziumEvent,
	specUnionValidatePipe,
	specValidatePipe,
} from "@kigvuzyy/kafka-nest";

import type { KafkaContext } from "@nestjs/microservices";
import type { SpecEnvelope } from "@kigvuzyy/kafka-contracts";
import type { TransactionHost } from "@nestjs-cls/transactional";

import { BOOK_TRANSPORT } from "@/infrastructure/messaging/kafka/kafka.transport-ids";
import { BookVectorizationProjectionRepositoryPort } from "@/modules/books/domain/ports/book-vectorization-projection.repository.port";

@Controller()
export class BookVectorizationProgressConsumer {
	private readonly logger = new Logger(BookVectorizationProgressConsumer.name);

	private readonly helper = new KafkaConsumerHelper(this.logger, {
		allowKeyFallback: false,
	});

	private readonly vectorizationRoute = createEventRouter(
		BookEvents.BookVectorizationStarted,
		BookEvents.BookVectorizationProgress,
		BookEvents.BookVectorizationCompleted,
		BookEvents.BookVectorizationFailed,
	);

	public constructor(
		@Inject(BookVectorizationProjectionRepositoryPort)
		private readonly repository: BookVectorizationProjectionRepositoryPort,

		@Inject(SnowflakeIdService)
		private readonly snowflakeId: SnowflakeIdService,

		@Inject(IdempotencyPort)
		private readonly idempotency: IdempotencyPort,

		@InjectTransactionHost()
		private readonly txHost: TransactionHost,
	) {}

	@EventPattern(Topics.bookChaptersVectorized.name, BOOK_TRANSPORT)
	public async handleChapterVectorized(
		@DebeziumEvent(specValidatePipe(BookEvents.ChapterVectorized))
		env: SpecEnvelope<typeof BookEvents.ChapterVectorized>,

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

			await this.repository.upsertVectorizedChapter({
				id: this.snowflakeId.generate(),
				bookId: parseSnowflakeId(env.payload.bookId),
				externalChapterId: env.payload.chapterId,
				chunksCount: env.payload.chunksCount,
			});

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

	@EventPattern(Topics.bookVectorization.name, BOOK_TRANSPORT)
	public async handleVectorizationProgress(
		@DebeziumEvent(
			specUnionValidatePipe(
				BookEvents.BookVectorizationStarted,
				BookEvents.BookVectorizationProgress,
				BookEvents.BookVectorizationCompleted,
				BookEvents.BookVectorizationFailed,
			),
		)
		env:
			| SpecEnvelope<typeof BookEvents.BookVectorizationCompleted>
			| SpecEnvelope<typeof BookEvents.BookVectorizationFailed>
			| SpecEnvelope<typeof BookEvents.BookVectorizationProgress>
			| SpecEnvelope<typeof BookEvents.BookVectorizationStarted>,

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

			await this.vectorizationRoute(env, {
				BookVectorizationStarted: async (e) => {
					await this.repository.markStarted({
						bookId: parseSnowflakeId(e.payload.bookId),
						expectedChaptersCount: e.payload.expectedChaptersCount,
					});
				},
				BookVectorizationProgress: async (e) => {
					await this.repository.syncProgress({
						bookId: parseSnowflakeId(e.payload.bookId),
						expectedChaptersCount: e.payload.expectedChaptersCount,
					});
				},
				BookVectorizationCompleted: async (e) => {
					await this.repository.markCompleted({
						bookId: parseSnowflakeId(e.payload.bookId),
						expectedChaptersCount: e.payload.expectedChaptersCount,
					});
				},
				BookVectorizationFailed: async (e) => {
					await this.repository.markFailed({
						bookId: parseSnowflakeId(e.payload.bookId),
						reason: e.payload.reason,
					});
				},
			});

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
