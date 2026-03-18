import type { ErrorMeta } from "@/domain/errors/error.types";

export class DomainError extends Error {
	public constructor(
		public readonly code: string,
		public readonly meta?: ErrorMeta,
		message?: string,
	) {
		super(message ?? code);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = DomainError.name;
	}
}
