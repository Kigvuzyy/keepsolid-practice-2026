import { HttpStatus } from "@nestjs/common";

import type { CommonErrorCode } from "@/domain/errors/common-error.codes";
import type { ErrorCatalog } from "@/infrastructure/problem-details/problem.interface";

import { CommonError } from "@/domain/errors/common-error.codes";

export const DEFAULT_CATALOG: ErrorCatalog<CommonErrorCode> = {
	[CommonError.VALIDATION_FAILED]: {
		type: "/problems/common/validation-failed",
		title: "Validation Failed",
		status: HttpStatus.BAD_REQUEST,
		detail: "Request validation failed",
	},
	[CommonError.INTERNAL_ERROR]: {
		type: "/problems/common/internal-server-error",
		title: "Internal Server Error",
		status: HttpStatus.INTERNAL_SERVER_ERROR,
		detail: "An unexpected error occurred",
	},
	[CommonError.NO_BEARER_TOKEN]: {
		status: HttpStatus.UNAUTHORIZED,
		type: "/problems/common/no-bearer-token",
		title: "No bearer token",
		detail: "An authorization header with a Bearer token is required.",
	},
	[CommonError.ACCESS_TOKEN_INVALID]: {
		status: HttpStatus.UNAUTHORIZED,
		type: "/problems/common/access-token-invalid",
		title: "Invalid access token",
		detail: "The provided access token is invalid or has expired.",
	},
	[CommonError.FORBIDDEN]: {
		status: HttpStatus.FORBIDDEN,
		type: "/problems/common/forbidden",
		title: "Forbidden",
		detail: "You do not have permission to perform this action.",
	},
};
