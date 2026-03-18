export { DomainError } from "@/domain/errors/base.error";
export type { ErrorMeta } from "@/domain/errors/error.types";

export { CommonError } from "@/domain/errors/common-error.codes";
export type { CommonErrorCode } from "@/domain/errors/common-error.codes";

export { AggregateRoot } from "@/domain/aggregate-root.base";
export type { BaseEntityProps } from "@/domain/aggregate-root.base";

export { ProblemDetailsModule } from "@/infrastructure/problem-details/problem-details.module";

export type {
	ErrorCatalog,
	ProblemDescriptor,
} from "@/infrastructure/problem-details/problem.interface";

export { ErrorRegistryService } from "@/infrastructure/problem-details/registry.service";

export { ZodValidationPipe, zodPipe } from "@/infrastructure/validation/zod.pipe";

export type { StoredChapterBatch } from "@/application/schemas/stored-chapter-batch.schema";
export { StoredChapterBatchSchema } from "@/application/schemas/stored-chapter-batch.schema";

export type { StoredChapter } from "@/application/schemas/stored-chapter.schema";
export { StoredChapterSchema } from "@/application/schemas/stored-chapter.schema";

/**
 * @privateRemarks This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild.
 */
export const version = "[VI]{{inject}}[/VI]" as string;
