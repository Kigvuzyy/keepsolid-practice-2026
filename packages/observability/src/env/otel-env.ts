import process from "node:process";

import {
	DEFAULT_ENV,
	DEFAULT_METRIC_INTERVAL_MS,
	DEFAULT_OTEL_ENDPOINT,
	DEFAULT_SERVICE_NAME,
	EnvKeys,
} from "@/env/constants";

export type OtelDiagLevel = "debug" | "error" | "info";

export interface OtelEnv {
	readonly serviceName: string;
	readonly environment: string;
	readonly otlpEndpoint: string;
	readonly metricExportIntervalMs: number;
	readonly diag?: OtelDiagLevel;
}

export function readOtelEnv(): OtelEnv {
	const otlpEndpointRaw =
		process.env[EnvKeys.OTEL_EXPORTER_OTLP_ENDPOINT] ?? DEFAULT_OTEL_ENDPOINT;
	const otlpEndpoint = otlpEndpointRaw.replace(/\/$/, "");

	const serviceName =
		process.env[EnvKeys.OTEL_SERVICE_NAME] ??
		process.env[EnvKeys.SERVICE_NAME] ??
		DEFAULT_SERVICE_NAME;

	const environment =
		process.env[EnvKeys.DEPLOY_ENV] ?? process.env[EnvKeys.NODE_ENV] ?? DEFAULT_ENV;

	const metricIntervalInput = process.env[EnvKeys.OTEL_METRIC_EXPORT_INTERVAL_MS];
	const metricExportIntervalMs = metricIntervalInput
		? Number(metricIntervalInput)
		: DEFAULT_METRIC_INTERVAL_MS;

	const diag = (process.env[EnvKeys.OTEL_DIAG] as OtelDiagLevel) ?? "error";

	return {
		serviceName,
		environment,
		otlpEndpoint,
		metricExportIntervalMs,
		diag,
	};
}
