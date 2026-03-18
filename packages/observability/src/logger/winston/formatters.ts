import os from "node:os";
import process from "node:process";

import winston from "winston";
import { context, trace } from "@opentelemetry/api";

/**
 * Extracts generic trace attributes from the active OpenTelemetry context.
 */
export function getActiveTraceAttrs(): { trace_id?: string; span_id?: string } {
	const span = trace.getSpan(context.active());
	const sc = span?.spanContext();
	return sc ? { trace_id: sc.traceId, span_id: sc.spanId } : {};
}

/**
 * Injects infrastructure metadata (host, pid, service, env) into the log record.
 */
export function injectBaseFields(serviceName: string, environment: string) {
	return winston.format((info) => {
		info.service = serviceName;
		info.env = environment;
		info.pid = process.pid;
		info.host = os.hostname();
		return info;
	});
}

/**
 * Injects OpenTelemetry Trace ID and Span ID into the log record.
 */
export function injectTrace() {
	return winston.format((info) => {
		const { trace_id, span_id } = getActiveTraceAttrs();
		if (trace_id) info.trace_id = trace_id;
		if (span_id) info.span_id = span_id;
		return info;
	});
}

/**
 * Builds a developer-friendly console output format.
 */
export function buildConsoleFormat(pretty: boolean): winston.Logform.Format {
	const baseFormats = [winston.format.timestamp(), winston.format.errors({ stack: true })];

	if (!pretty) {
		return winston.format.combine(...baseFormats, winston.format.json());
	}

	return winston.format.combine(
		...baseFormats,
		winston.format.colorize(),
		winston.format.printf(({ timestamp, level, message, ...meta }) => {
			const hasMeta = Object.keys(meta).length > 0;
			const metaString = hasMeta ? ` ${JSON.stringify(meta)}` : "";
			return `${timestamp} ${level}: ${message}${metaString}`;
		}),
	);
}
