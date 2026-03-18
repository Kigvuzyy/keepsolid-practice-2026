import { Injectable, Logger } from "@nestjs/common";

import type {
	ErrorCatalog,
	ProblemDescriptor,
} from "@/infrastructure/problem-details/problem.interface.ts";

@Injectable()
export class ErrorRegistryService {
	private readonly logger = new Logger(ErrorRegistryService.name);

	private readonly map = new Map<string, ProblemDescriptor>();

	public register(catalog: ErrorCatalog): void {
		for (const [code, desc] of Object.entries(catalog)) {
			if (this.map.has(code)) {
				this.logger.warn(`Overwriting error code: ${code}`);
			}

			this.map.set(code, desc);
		}
	}

	public get(code: string): ProblemDescriptor | undefined {
		return this.map.get(code);
	}
}
