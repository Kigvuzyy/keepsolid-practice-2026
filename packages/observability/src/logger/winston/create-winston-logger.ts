import process from "node:process";
import { inspect } from "node:util";

import winston from "winston";
import type TransportStream from "winston-transport";

import { readOtelEnv } from "#env";
import { OtelLogsTransport } from "@/logger/winston/otel-logs-transport.js";
import { buildConsoleFormat, injectBaseFields, injectTrace } from "@/logger/winston/formatters.js";

type Meta = Readonly<Record<string, unknown>>;

export interface CreateLoggerParams {
	readonly serviceName: string;
	readonly environment: string;
	readonly level?: string;
	readonly pretty?: boolean;
	readonly otelLogsEnabled?: boolean;
}

export interface AppLogger {
	info(message: unknown, meta?: Meta): void;
	warn(message: unknown, meta?: Meta): void;
	error(message: unknown, meta?: Meta): void;
	debug(message: unknown, meta?: Meta): void;
	verbose(message: unknown, meta?: Meta): void;
	readonly raw: winston.Logger;
}

function normalizeMessage(message: unknown): { msg: string; meta?: Meta } {
	if (message instanceof Error) {
		return {
			msg: message.message,
			meta: {
				err: {
					name: message.name,
					message: message.message,
					stack: message.stack,
				},
			},
		};
	}

	if (typeof message === "string") {
		return { msg: message };
	}

	try {
		return {
			msg: "non_string_message",
			meta: { payload: inspect(message, { depth: 6, breakLength: 80 }) },
		};
	} catch {
		return { msg: "serialization_error", meta: { payload: "Usage error: unprintable object" } };
	}
}

export function createWinstonLogger(
	params: CreateLoggerParams = {
		...readOtelEnv(),
		otelLogsEnabled: true,
	},
): AppLogger {
	const level = params.level ?? process.env.LOG_LEVEL ?? "info";
	const pretty = params.pretty ?? process.env.LOG_PRETTY === "true";

	const enrichFormat = winston.format.combine(
		injectBaseFields(params.serviceName, params.environment)(),
		injectTrace()(),
	);

	const transports: TransportStream[] = [
		new winston.transports.Console({
			format: winston.format.combine(enrichFormat, buildConsoleFormat(pretty)),
		}),
	];

	if (params.otelLogsEnabled ?? process.env.OTEL_LOGS_ENABLED === "true") {
		transports.push(
			new OtelLogsTransport({
				loggerName: "app",
				format: enrichFormat,
			}),
		);
	}

	const rawLogger = winston.createLogger({
		level,
		transports,
		exitOnError: false,
	});

	const writeLog = (
		severity: "debug" | "error" | "info" | "verbose" | "warn",
		message: unknown,
		meta?: Meta,
	): void => {
		const { msg, meta: normalizedMeta } = normalizeMessage(message);

		const finalMeta =
			normalizedMeta || meta ? { ...(normalizedMeta ?? {}), ...(meta ?? {}) } : undefined;

		rawLogger.log(severity, msg, finalMeta);
	};

	return {
		raw: rawLogger,
		info: (msg, meta) => writeLog("info", msg, meta),
		warn: (msg, meta) => writeLog("warn", msg, meta),
		error: (msg, meta) => writeLog("error", msg, meta),
		debug: (msg, meta) => writeLog("debug", msg, meta),
		verbose: (msg, meta) => writeLog("verbose", msg, meta),
	};
}
