import { parseEnvelope } from "@kigvuzyy/kafka-envelope";
import { BadRequestException, createParamDecorator } from "@nestjs/common";

import type { ExecutionContext } from "@nestjs/common";
import type { KafkaContext } from "@nestjs/microservices";
import type { AnyEnvelope } from "@kigvuzyy/kafka-envelope";

export const DebeziumEvent = createParamDecorator(
	(_: unknown, ctx: ExecutionContext): AnyEnvelope => {
		const context = ctx.switchToRpc().getContext<KafkaContext>();
		const message = context.getMessage();

		try {
			return parseEnvelope(message.headers ?? {}, message.key, message.value);
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Unknown error";
			throw new BadRequestException(`Invalid Infrastructure Headers: ${msg}`);
		}
	},
);
