import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { OutboxModule } from "@kigvuzyy/outbox-core";
import { IdempotencyModule } from "@kigvuzyy/idempotency-core";
import { TransactionHost } from "@nestjs-cls/transactional";
import { PrismaOutboxAdapterFactory } from "@kigvuzyy/outbox-prisma-adapter";
import { PrismaIdempotencyAdapterFactory } from "@kigvuzyy/idempotency-prisma-adapter";

import type { Prisma } from "database/client";
import type { PrismaOutboxAdapterOptions } from "@kigvuzyy/outbox-prisma-adapter";
import type { PrismaIdempotencyAdapterOptions } from "@kigvuzyy/idempotency-prisma-adapter";

import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import { ObjectStoragePort } from "@/modules/books/domain/ports/object-storage.port";
import { BooksController } from "@/modules/books/presentation/controllers/books.controller";
import { ChapterExtractedConsumer } from "@/modules/books/presentation/consumers/chapter-extracted.consumer";
import { BookVectorizationProgressConsumer } from "@/modules/books/presentation/consumers/book-vectorization-progress.consumer";
import {
	GetPresignedUploadUrlHandler,
	SuggestBookSearchHandler,
} from "@/modules/books/application/queries/handlers";
import { UploadIntentRepositoryPort } from "@/modules/books/domain/ports/upload-intent.repository.port";
import { BookVectorizationProjectionRepositoryPort } from "@/modules/books/domain/ports/book-vectorization-projection.repository.port";
import { BookSearchSuggestionRepositoryPort } from "@/modules/books/domain/ports/book-search-suggestion.repository.port";
import { MinioObjectStorageAdapter } from "@/modules/books/infrastructure/adapters/minio-object-storage.adapter";
import { PrismaUploadIntentRepository } from "@/modules/books/infrastructure/persistence/prisma-upload-intent.repository";
import { PrismaBookVectorizationProjectionRepository } from "@/modules/books/infrastructure/persistence/prisma-book-vectorization-projection.repository";
import { PrismaBookSearchSuggestionRepository } from "@/modules/books/infrastructure/persistence/prisma-book-search-suggestion.repository";
import {
	CreateUploadIntentHandler,
	ConfirmUploadIntentHandler,
	CreateBookHandler,
	HandleBookCoverExtractedHandler,
	HandleChapterExtractedHandler,
	HandleChapterBatchExtractedHandler,
} from "@/modules/books/application/commands/handlers";
import { BookRepositoryPort } from "./domain/ports/book.repository.port";
import { BookChapterRepositoryPort } from "./domain/ports/book-chapter.repository.port";
import { PrismaBookRepository } from "./infrastructure/persistence/prisma-book.repository";
import { PrismaBookChapterRepository } from "./infrastructure/persistence/prisma-book-chapter.repository";
import { EventFactory } from "./infrastructure/factories/event.factory";
import { EventFactoryPort } from "./application/ports/event.factory.port";
import { BookAssetsExtractedConsumer } from "./presentation/consumers/book-assets-extracted.consumer";

type Tx = Prisma.TransactionClient;

const QueryHandlers = [GetPresignedUploadUrlHandler, SuggestBookSearchHandler];

const CommandHandlers = [
	CreateUploadIntentHandler,
	ConfirmUploadIntentHandler,
	CreateBookHandler,
	HandleBookCoverExtractedHandler,
	HandleChapterExtractedHandler,
	HandleChapterBatchExtractedHandler,
];

const Consumers = [
	ChapterExtractedConsumer,
	BookVectorizationProgressConsumer,
	BookAssetsExtractedConsumer,
];

@Module({
	imports: [
		OutboxModule.registerAsync<PrismaOutboxAdapterOptions<Tx>, Tx>({
			adapter: PrismaOutboxAdapterFactory,
			imports: [PrismaModule],
			inject: [PrismaService, TransactionHost],
			useFactory: (
				prisma: PrismaService,
				txHost: TransactionHost<{ tx: Tx }>,
			): PrismaOutboxAdapterOptions<Tx> => ({
				model: prisma.outbox,
				resolve: (tx?: Tx) => (tx ?? txHost.tx).outbox,
			}),
		}),

		IdempotencyModule.registerAsync<PrismaIdempotencyAdapterOptions<Tx>, Tx>({
			adapter: PrismaIdempotencyAdapterFactory,
			imports: [PrismaModule],
			inject: [PrismaService, TransactionHost],
			useFactory: (
				prisma: PrismaService,
				txHost: TransactionHost<{ tx: Tx }>,
			): PrismaIdempotencyAdapterOptions<Tx> => ({
				model: prisma.processed,
				resolve: (tx?: Tx) => (tx ?? txHost.tx).processed,
			}),
		}),

		CqrsModule,
		PrismaModule,
	],
	controllers: [BooksController, ...Consumers],
	providers: [
		...QueryHandlers,
		...CommandHandlers,

		{
			provide: ObjectStoragePort,
			useClass: MinioObjectStorageAdapter,
		},
		{
			provide: UploadIntentRepositoryPort,
			useClass: PrismaUploadIntentRepository,
		},
		{
			provide: BookRepositoryPort,
			useClass: PrismaBookRepository,
		},
		{
			provide: BookChapterRepositoryPort,
			useClass: PrismaBookChapterRepository,
		},
		{
			provide: BookVectorizationProjectionRepositoryPort,
			useClass: PrismaBookVectorizationProjectionRepository,
		},
		{
			provide: BookSearchSuggestionRepositoryPort,
			useClass: PrismaBookSearchSuggestionRepository,
		},
		{
			provide: EventFactoryPort,
			useClass: EventFactory,
		},
	],
})
export class BooksModule {}
