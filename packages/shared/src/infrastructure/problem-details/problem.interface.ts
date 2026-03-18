import type { HttpStatus } from "@nestjs/common";

export interface ProblemDescriptor {
	type: string;
	title: string;
	status: HttpStatus;
	detail?: string;
	actionHints?: string[];
}

export type ErrorCatalog<Code extends string = string> = Record<Code, ProblemDescriptor>;
