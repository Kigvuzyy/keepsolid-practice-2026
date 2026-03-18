import { ClsModule } from "nestjs-cls";
import { Module } from "@nestjs/common";
import { MinioModule } from "@kigvuzyy/minio-nest";
import { QdrantModule } from "@kigvuzyy/qdrant-nest";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";

import { HealthModule } from "@/modules/health/health.module";
import { WorkerModule } from "@/modules/worker/worker.module";
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

		MinioModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				endPoint: config.get("S3_ENDPOINT"),
				port: config.get("S3_PORT"),
				useSSL: config.get("S3_USE_SSL"),
				accessKey: config.get("S3_ACCESS_KEY"),
				secretKey: config.get("S3_SECRET_KEY"),
			}),
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

		ConfigModule,
		HealthModule,
		WorkerModule,
	],
})
export class AppModule {}
