import z from "zod";
import { createZodDto } from "nestjs-zod";

const MAX_SIZE = 200 * 1_024 * 1_024;
const ALLOWED_CONTENT_TYPES = ["application/epub+zip", "application/octet-stream"] as const;
const snowflakeIdSchema = z.string().regex(/^\d+$/);

export const getPresignedUploadUrlSchema = z.object({
	fileName: z.string().min(1),
	contentType: z.string().min(1),
	contentLength: z.number().min(1),
});

export class GetPresignedUploadUrlDto extends createZodDto(getPresignedUploadUrlSchema) {}

export const getPresignedUploadUrlResponseSchema = z.object({
	bucket: z.string(),
	objectKey: z.string(),
	url: z.string(),
	expiresAt: z.string(),
});

export class GetPresignedUploadUrlResponseDto extends createZodDto(
	getPresignedUploadUrlResponseSchema,
) {}

export const createUploadIntentSchema = z.object({
	fileName: z
		.string()
		.trim()
		.min(1)
		.max(255)
		.refine((v) => !/[\\/]/.test(v), "fileName must not contain path separators"),
	contentType: z
		.string()
		.regex(/^[\w.+-]+\/[\w.+-]+$/)
		.refine(
			(v) => ALLOWED_CONTENT_TYPES.includes(v as (typeof ALLOWED_CONTENT_TYPES)[number]),
			"Unsupported contentType",
		),
	contentLength: z.number().int().positive().max(MAX_SIZE),
});

export class CreateUploadIntentDto extends createZodDto(createUploadIntentSchema) {}

export const createUploadIntentResponseSchema = z.object({
	uploadId: z.string(),
	bucket: z.string(),
	objectKey: z.string(),
	url: z.string(),
	expiresAt: z.iso.datetime(),
});

export class CreateUploadIntentResponseDto extends createZodDto(createUploadIntentResponseSchema) {}

export const confirmUploadIntentSchema = z.object({
	uploadId: snowflakeIdSchema,
});

export class ConfirmUploadIntentDto extends createZodDto(confirmUploadIntentSchema) {}

export const createBookSchema = z.object({
	uploadId: snowflakeIdSchema,
	title: z.string().min(1).max(255),
	description: z.string().nullish().default(null),
	authors: z.array(z.string()).nonempty(),
});

export class CreateBookDto extends createZodDto(createBookSchema) {}
