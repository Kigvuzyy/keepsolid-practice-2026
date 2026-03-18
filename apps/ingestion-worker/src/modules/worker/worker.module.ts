import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { OutboxModule } from "@kigvuzyy/outbox-core";
import { OpenAIModule } from "@kigvuzyy/ai-core/openai";
import { SnowflakeIdModule } from "@kigvuzyy/snowflake-id";
import { TransactionHost } from "@nestjs-cls/transactional";
import { IdempotencyModule } from "@kigvuzyy/idempotency-core";
import { PrismaOutboxAdapterFactory } from "@kigvuzyy/outbox-prisma-adapter";
import { PrismaIdempotencyAdapterFactory } from "@kigvuzyy/idempotency-prisma-adapter";

import type { Prisma } from "database/client";
import type { PrismaOutboxAdapterOptions } from "@kigvuzyy/outbox-prisma-adapter";
import type { PrismaIdempotencyAdapterOptions } from "@kigvuzyy/idempotency-prisma-adapter";

import { ConfigModule } from "@/infrastructure/config/config.module";
import { ConfigService } from "@/infrastructure/config/config.service";
import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";
import { WORKER_CONTROLLERS, WORKER_PROVIDERS } from "@/modules/worker/worker.providers";

type Tx = Prisma.TransactionClient;

@Module({
	imports: [
		OpenAIModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				apiKey: config.get("OPENAI_API_KEY"),
			}),
		}),

		SnowflakeIdModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				machineId: {
					dataCenterId: config.get("SNOWFLAKE_DATA_CENTER_ID"),
					workerId: config.get("SNOWFLAKE_WORKER_ID"),
				},
			}),
		}),

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
			inject: [PrismaService],
			useFactory: (prisma: PrismaService): PrismaIdempotencyAdapterOptions<Tx> => ({
				model: prisma.processed,
				resolve: (tx?: Tx) => (tx ? tx.processed : prisma.processed),
			}),
		}),

		CqrsModule,
		PrismaModule,
	],
	controllers: WORKER_CONTROLLERS,
	providers: WORKER_PROVIDERS,
})
export class WorkerModule {}
