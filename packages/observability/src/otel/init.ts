import process from "node:process";

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
	SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";

import FastifyOtelInstrumentation from "@fastify/otel";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { KafkaJsInstrumentation } from "@opentelemetry/instrumentation-kafkajs";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";

import type { OtelEnv } from "#env";

let sdkInstance: NodeSDK | null = null;

const DIAG_LEVEL_MAP: Record<NonNullable<OtelEnv["diag"]>, DiagLogLevel> = {
	error: DiagLogLevel.ERROR,
	info: DiagLogLevel.INFO,
	debug: DiagLogLevel.DEBUG,
};

export interface InitOtelOptions {
	readonly env: OtelEnv;
}

function getDiagLevel(level?: OtelEnv["diag"]): DiagLogLevel {
	return level ? DIAG_LEVEL_MAP[level] : DiagLogLevel.ERROR;
}

export function initOtel(options: InitOtelOptions): void {
	if (sdkInstance) {
		return;
	}

	diag.setLogger(new DiagConsoleLogger(), getDiagLevel(options.env.diag));

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: options.env.serviceName,
		[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: options.env.environment,
		[ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
	});

	const traceExporter = new OTLPTraceExporter({
		url: `${options.env.otlpEndpoint}/v1/traces`,
	});

	const metricReader = new PeriodicExportingMetricReader({
		exporter: new OTLPMetricExporter({
			url: `${options.env.otlpEndpoint}/v1/metrics`,
		}),
		exportIntervalMillis: options.env.metricExportIntervalMs,
	});

	const autoInstrumentations = getNodeAutoInstrumentations({
		"@opentelemetry/instrumentation-fs": { enabled: false },
		"@opentelemetry/instrumentation-ioredis": { enabled: true },
		"@opentelemetry/instrumentation-redis": { enabled: true },
	});

	sdkInstance = new NodeSDK({
		resource,
		traceExporter,
		metricReader,
		instrumentations: [
			...autoInstrumentations,

			new NestInstrumentation(),
			new PrismaInstrumentation(),
			new KafkaJsInstrumentation(),
			new FastifyOtelInstrumentation({ registerOnInitialization: true }),
		],
	});

	sdkInstance.start();

	registerShutdownHooks();
}

export function isOtelStarted(): boolean {
	return sdkInstance !== null;
}

function registerShutdownHooks() {
	const shutdown = async () => {
		try {
			await sdkInstance?.shutdown();
		} catch (err) {
			console.error("Error shutting down OpenTelemetry SDK:", err);
		}
	};

	process.once("SIGTERM", () => void shutdown());
	process.once("SIGINT", () => void shutdown());
}
