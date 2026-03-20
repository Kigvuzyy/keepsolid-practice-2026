import type { LoggerService } from "@nestjs/common";
import type { AppLogger } from "../winston/create-winston-logger.js";

type Meta = Readonly<Record<string, unknown>>;

export class WinstonNestLogger implements LoggerService {
	public constructor(private readonly logger: AppLogger) {}

	public log(message: unknown, context?: string): void {
		this.logger.info(message, this.createMeta(context));
	}

	public warn(message: unknown, context?: string): void {
		this.logger.warn(message, this.createMeta(context));
	}

	public error(message: unknown, traceOrStack?: string, context?: string): void {
		const meta: Record<string, unknown> = {};
		if (context) meta.context = context;
		if (traceOrStack) meta.stack = traceOrStack;

		this.logger.error(message, meta);
	}

	public debug(message: unknown, context?: string): void {
		this.logger.debug(message, this.createMeta(context));
	}

	public verbose(message: unknown, context?: string): void {
		this.logger.verbose(message, this.createMeta(context));
	}

	private createMeta(context?: string): Meta | undefined {
		return context ? { context } : undefined;
	}
}
