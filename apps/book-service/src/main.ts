import "dotenv/config";
import "reflect-metadata";

import { Partitioners } from "kafkajs";
import { NestFactory } from "@nestjs/core";
import { Logger, VersioningType } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { KafkaCustomTransport } from "@kigvuzyy/kafka-nest";
import { WinstonNestLogger } from "@kigvuzyy/observability/logger/nest";
import { createWinstonLogger } from "@kigvuzyy/observability/logger/winston";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { KafkaOptions, MicroserviceOptions } from "@nestjs/microservices";

import { AppModule } from "@/app.module";
import { ConfigService } from "@/infrastructure/config/config.service";
import { BOOK_TRANSPORT } from "@/infrastructure/messaging/kafka/kafka.transport-ids";

const bootstrap = async (): Promise<void> => {
	const logger = createWinstonLogger();

	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
		bufferLogs: true,
	});

	const config = app.get(ConfigService);

	app.useLogger(new WinstonNestLogger(logger));
	app.flushLogs();

	app.setGlobalPrefix("api");

	app.enableVersioning({
		type: VersioningType.URI,
	});

	const microserviceOptions = {
		options: {
			client: {
				clientId: config.get("KAFKA_CLIENT_ID"),
				brokers: config.get("KAFKA_BROKERS"),
			},
			consumer: {
				groupId: config.get("KAFKA_GROUP_ID"),
				allowAutoTopicCreation: true,
			},
			subscribe: {
				fromBeginning: true,
			},
			run: {
				autoCommit: false,
				eachBatchAutoResolve: true,
			},
			producer: {
				createPartitioner: Partitioners.DefaultPartitioner,
			},
		},
	} satisfies KafkaOptions;

	app.connectMicroservice<MicroserviceOptions>({
		strategy: new KafkaCustomTransport(microserviceOptions.options, BOOK_TRANSPORT),
	});

	await app.init();
	await app.startAllMicroservices();
	await app.listen({
		host: "0.0.0.0",
		port: config.port,
	});

	Logger.log(`[${config.serviceName}] started on http://0.0.0.0:${config.port}`, "Bootstrap");
};

void bootstrap();
