import { ClsModule } from "nestjs-cls";
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { RedisModule } from "@kigvuzyy/redis-nest";
import { QdrantModule } from "@kigvuzyy/qdrant-nest";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { ProblemDetailsModule } from "@kigvuzyy/shared";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";

import { HealthModule } from "@/modules/health/health.module";
import { SearchModule } from "@/modules/search/search.module";
import { ConfigModule } from "@/infrastructure/config/config.module";
import { ConfigService } from "@/infrastructure/config/config.service";
import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";

@Module({
	imports: [
		ClsModule.forRoot({
			global: true,
			plugins: [
				new ClsPluginTransactional({
					imports: [PrismaModule],
					adapter: new TransactionalAdapterPrisma<PrismaService>({
						prismaInjectionToken: PrismaService,
						sqlFlavor: "postgresql",
					}),
					enableTransactionProxy: true,
				}),
			],
		}),

		QdrantModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				host: config.get("QDRANT_HOST"),
				port: config.get("QDRANT_PORT"),
				apiKey: config.get("QDRANT_API_KEY"),
				https: config.get("QDRANT_HTTPS"),
				collectionName: config.get("QDRANT_COLLECTION_BOOK_CHUNKS"),
				vectorSize: config.get("OPENAI_EMBEDDING_DIMENSIONS"),
				payloadIndexes: [
					{ fieldName: "bookId", fieldSchema: "keyword" },
					{ fieldName: "chapterId", fieldSchema: "keyword" },
					{ fieldName: "chapterIndex", fieldSchema: "integer" },
					{ fieldName: "isSearchable", fieldSchema: "bool" },
				],
			}),
		}),

		RedisModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				connectOnModuleInit: true,
				closeOnModuleDestroy: true,
				host: config.get("REDIS_HOST"),
				port: config.get("REDIS_PORT"),
			}),
		}),

		ProblemDetailsModule.forRoot(),
		ConfigModule,
		HealthModule,
		SearchModule,
	],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},
	],
})
export class AppModule {}
