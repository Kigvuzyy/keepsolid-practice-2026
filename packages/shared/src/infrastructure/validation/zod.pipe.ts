import { createZodValidationPipe } from "nestjs-zod";

import type { ZodError, ZodType } from "zod";
import type { ZodValidationPipe as NestZodValidationPipe } from "nestjs-zod";

import { DomainError } from "@/domain/errors/base.error";
import { CommonError } from "@/domain/errors/common-error.codes";

export const ZodValidationPipe: typeof NestZodValidationPipe = createZodValidationPipe({
	createValidationException: (error: unknown) => {
		const issues = (error as ZodError).issues ?? [];

		return new DomainError(CommonError.VALIDATION_FAILED, {
			context: { issues },
		});
	},
});

export const zodPipe = <T extends ZodType>(schema: T) => new ZodValidationPipe(schema);
