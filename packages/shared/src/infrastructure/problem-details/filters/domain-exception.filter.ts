import { Inject, Catch, HttpStatus, Logger } from "@nestjs/common";

import type { FastifyReply, FastifyRequest } from "fastify";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";

import { DomainError } from "@/domain/errors/base.error";
import { CommonError } from "@/domain/errors/common-error.codes";
import { ErrorRegistryService } from "@/infrastructure/problem-details/registry.service";

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(DomainExceptionFilter.name);

	public constructor(
		@Inject(ErrorRegistryService)
		private readonly registry: ErrorRegistryService,
	) {}

	public catch(exception: DomainError, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();

		const reply = ctx.getResponse<FastifyReply>();
		const request = ctx.getRequest<FastifyRequest>();

		const instance = request.url.split("?")[0];

		const descriptor = this.registry.get(exception.code);

		if (!descriptor) {
			this.logger.error(`Unknown DomainError: ${exception.code}`, exception.stack);

			this.sendJson(reply, HttpStatus.INTERNAL_SERVER_ERROR, {
				code: CommonError.INTERNAL_ERROR,
				title: "Internal Server Error",
				type: "about:blank",
				detail: `Unknown error code: ${exception.code}`,
				instance,
			});

			return;
		}

		this.sendJson(reply, descriptor.status, {
			type: descriptor.type,
			title: descriptor.title,
			status: descriptor.status,
			detail: descriptor.detail,
			code: exception.code,
			instance,
			meta: exception.meta,
			actionHints: descriptor.actionHints,
		});
	}

	private sendJson(reply: FastifyReply, status: number, body: Record<string, unknown>): void {
		reply.status(status).send(body);
	}
}
