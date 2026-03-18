import { OutboxPort } from "@kigvuzyy/outbox-core";
import { Inject, Injectable } from "@nestjs/common";
import { TransactionHost } from "@nestjs-cls/transactional";
import { SnowflakeIdService } from "@kigvuzyy/snowflake-id";

import type {
	PlanBookVectorizationInput,
	RecordChapterVectorizedInput,
	MarkBookVectorizationFailedInput,
} from "@/modules/worker/domain/ports/book-vectorization-progress.repository.port";

import { EventFactoryPort } from "@/modules/worker/application/ports/event.factory.port";
import { BookVectorizationProgressRepositoryPort } from "@/modules/worker/domain/ports/book-vectorization-progress.repository.port";
import { ChapterVectorStorePort } from "@/modules/worker/domain/ports/chapter-vector-store.port";

@Injectable()
export class BookVectorizationProgressService {
	public constructor(
		@Inject(BookVectorizationProgressRepositoryPort)
		private readonly repository: BookVectorizationProgressRepositoryPort,

		@Inject(OutboxPort)
		private readonly outbox: OutboxPort,

		@Inject(EventFactoryPort)
		private readonly eventFactory: EventFactoryPort,

		@Inject(SnowflakeIdService)
		private readonly snowflakeId: SnowflakeIdService,

		@Inject(TransactionHost)
		private readonly txHost: TransactionHost,

		@Inject(ChapterVectorStorePort)
		private readonly vectorStore: ChapterVectorStorePort,
	) {}

	public async planBookVectorization(input: PlanBookVectorizationInput): Promise<void> {
		await this.txHost.withTransaction(async () => {
			const planned = await this.repository.savePlannedState(input);

			if (planned.shouldEmitStarted) {
				await this.outbox.append(
					this.eventFactory.createBookVectorizationStarted({
						bookId: input.bookId,
						expectedChaptersCount: planned.state.expectedChaptersCount,
					}),
				);
			}

			await this.reconcileProgress({
				bookId: input.bookId,
				expectedChaptersCount: planned.state.expectedChaptersCount,
				emitProgress: true,
			});
		});
	}

	public async recordChapterVectorized(
		input: Omit<RecordChapterVectorizedInput, "id">,
	): Promise<void> {
		await this.txHost.withTransaction(async () => {
			const saved = await this.repository.saveVectorizedChapter({
				...input,
				id: this.snowflakeId.generate(),
			});

			if (saved.inserted) {
				await this.outbox.append(
					this.eventFactory.createChapterVectorized({
						bookId: input.bookId,
						chapterId: input.chapterId,
						chunksCount: input.chunksCount,
					}),
				);
			}

			const state = await this.repository.findStateByBookId({
				bookId: input.bookId,
			});

			if (!state) {
				return;
			}

			await this.reconcileProgress({
				bookId: input.bookId,
				expectedChaptersCount: state.expectedChaptersCount,
				emitProgress: saved.inserted,
			});
		});
	}

	public async markFailed(input: MarkBookVectorizationFailedInput): Promise<void> {
		await this.txHost.withTransaction(async () => {
			await this.repository.markFailed(input);

			await this.outbox.append(
				this.eventFactory.createBookVectorizationFailed({
					bookId: input.bookId,
					reason: input.reason,
				}),
			);
		});
	}

	private async reconcileProgress(params: {
		bookId: bigint;
		expectedChaptersCount: number;
		emitProgress: boolean;
	}): Promise<void> {
		const doneChaptersCount = await this.repository.countVectorizedChapters({
			bookId: params.bookId,
		});

		if (doneChaptersCount >= params.expectedChaptersCount) {
			const markedCompleted = await this.repository.markCompleted({
				bookId: params.bookId,
			});

			if (!markedCompleted) {
				return;
			}

			await this.vectorStore.setBookSearchable({
				bookId: params.bookId,
				isSearchable: true,
			});

			await this.outbox.append(
				this.eventFactory.createBookVectorizationCompleted({
					bookId: params.bookId,
					doneChaptersCount,
					expectedChaptersCount: params.expectedChaptersCount,
				}),
			);

			return;
		}

		if (!params.emitProgress) {
			return;
		}

		await this.outbox.append(
			this.eventFactory.createBookVectorizationProgress({
				bookId: params.bookId,
				doneChaptersCount,
				expectedChaptersCount: params.expectedChaptersCount,
			}),
		);
	}
}
