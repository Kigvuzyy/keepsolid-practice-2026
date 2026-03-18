import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { OpenAIModule } from "@kigvuzyy/ai-core/openai";
import { TransactionHost } from "@nestjs-cls/transactional";
import { IdempotencyModule } from "@kigvuzyy/idempotency-core";
import { PrismaIdempotencyAdapterFactory } from "@kigvuzyy/idempotency-prisma-adapter";

import type { Prisma } from "database/client";
import type { PrismaIdempotencyAdapterOptions } from "@kigvuzyy/idempotency-prisma-adapter";

import { ConfigModule } from "@/infrastructure/config/config.module";
import { ConfigService } from "@/infrastructure/config/config.service";
import { SearchBooksHybridService } from "@/modules/search/application/services/search-books-hybrid.service";
import { SearchController } from "@/modules/search/presentation/controllers/search.controller";
import { SearchBooksHybridHandler } from "@/modules/search/application/queries/handlers";
import { BookRerankPort } from "@/modules/search/domain/ports/book-rerank.port";
import { BookSearchPort } from "@/modules/search/domain/ports/book-search.port";
import { SearchRerankCachePort } from "@/modules/search/domain/ports/search-rerank-cache.port";
import { SearchRerankCachePolicy } from "@/modules/search/domain/services/search-rerank-cache";
import { SearchRankingPolicy } from "@/modules/search/domain/services/search-ranking-policy";
import { HttpBookRerankAdapter } from "@/modules/search/infrastructure/adapters/http-book-rerank.adapter";
import { QdrantBookSearchAdapter } from "@/modules/search/infrastructure/adapters/qdrant-book-search.adapter";
import { RedisSearchRerankCacheAdapter } from "@/modules/search/infrastructure/adapters/redis-search-rerank-cache.adapter";
import { QdrantBookSearchMapper } from "@/modules/search/infrastructure/mappers/qdrant-book-search.mapper";
import { QdrantGroupedBookSearchQueryBuilder } from "@/modules/search/infrastructure/queries/qdrant-grouped-book-search.query";
import { BookCatalogConsumer } from "@/modules/search/presentation/consumers/book-catalog.consumer";
import {
	CreateBookReadModelHandler,
	SyncBookCoverHandler,
} from "@/modules/search/application/commands/handlers";
import { BookSearchReadModelRepositoryPort } from "@/modules/search/domain/ports/book-read-model.repository.port";
import { PrismaBookReadModelRepository } from "@/modules/search/infrastructure/persistence/prisma-book-read-model.repository";
import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";

type Tx = Prisma.TransactionClient;

@Module({
	imports: [
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

		OpenAIModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				apiKey: config.get("OPENAI_API_KEY"),
			}),
		}),

		CqrsModule,
	],
	controllers: [SearchController, BookCatalogConsumer],
	providers: [
		SearchRankingPolicy,
		SearchRerankCachePolicy,
		QdrantGroupedBookSearchQueryBuilder,
		QdrantBookSearchMapper,
		SearchBooksHybridService,
		SearchBooksHybridHandler,
		CreateBookReadModelHandler,
		SyncBookCoverHandler,
		{
			provide: BookSearchPort,
			useClass: QdrantBookSearchAdapter,
		},
		{
			provide: BookRerankPort,
			useClass: HttpBookRerankAdapter,
		},
		{
			provide: SearchRerankCachePort,
			useClass: RedisSearchRerankCacheAdapter,
		},
		{
			provide: BookSearchReadModelRepositoryPort,
			useClass: PrismaBookReadModelRepository,
		},
	],
})
export class SearchModule {}
