import { setImmediate } from "node:timers";

import TransportStream from "winston-transport";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";

import type { Logger, AnyValue, AnyValueMap } from "@opentelemetry/api-logs";

function safeSerialize(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
		return String(value);
	}

	if (value instanceof Error) {
		return JSON.stringify({
			name: value.name,
			message: value.message,
			stack: value.stack,
		});
	}

	if (typeof value === "symbol") {
		return value.description ? `Symbol(${value.description})` : "Symbol()";
	}

	if (typeof value === "function") {
		return `[Function: ${value.name || "anonymous"}]`;
	}

	try {
		const json = JSON.stringify(value);
		if (json !== undefined) return json;
	} catch {}

	return Object.prototype.toString.call(value);
}

function toOtelValue(value: unknown): AnyValue | undefined {
	if (value === undefined || value === null) return undefined;

	if (typeof value === "string") return value;
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value;

	if (Array.isArray(value)) {
		return value
			.map((item) => toOtelValue(item))
			.filter((item): item is AnyValue => item !== undefined);
	}

	return safeSerialize(value);
}

function extractAttributes(info: Record<string, unknown>): AnyValueMap {
	const attributes: AnyValueMap = {};

	for (const [key, value] of Object.entries(info)) {
		if (key === "level" || key === "message") continue;

		const converted = toOtelValue(value);
		if (converted !== undefined) {
			attributes[key] = converted;
		}
	}

	return attributes;
}

function getSeverity(level: string): { number: SeverityNumber; text: string } {
	switch (level) {
		case "error":
		case "emerg":
		case "crit":
		case "alert":
			return { number: SeverityNumber.ERROR, text: "ERROR" };
		case "warn":
		case "warning":
			return { number: SeverityNumber.WARN, text: "WARN" };
		case "info":
		case "notice":
		case "http":
			return { number: SeverityNumber.INFO, text: "INFO" };
		case "debug":
		case "verbose":
			return { number: SeverityNumber.DEBUG, text: "DEBUG" };
		case "silly":
			return { number: SeverityNumber.TRACE, text: "TRACE" };
		default:
			return { number: SeverityNumber.INFO, text: "INFO" };
	}
}

export interface OtelLogsTransportOptions extends TransportStream.TransportStreamOptions {
	readonly loggerName?: string;
}

export class OtelLogsTransport extends TransportStream {
	private readonly otelLogger: Logger;

	public constructor(options: OtelLogsTransportOptions = {}) {
		super(options);
		this.otelLogger = logs.getLogger(options.loggerName ?? "app");
	}

	public override log(info: unknown, callback: () => void): void {
		setImmediate(() => {
			if (typeof info !== "object" || info === null) {
				callback();
				return;
			}

			const infoObj = info as Record<string, unknown>;
			const level = typeof infoObj.level === "string" ? infoObj.level : "info";
			const { number: severityNumber, text: severityText } = getSeverity(level);

			this.otelLogger.emit({
				severityNumber,
				severityText,
				body: safeSerialize(infoObj.message),
				attributes: extractAttributes(infoObj),
			});

			callback();
		});
	}
}
