import { APP_FILTER } from "@nestjs/core";
import { Global, Module } from "@nestjs/common";

import type { DynamicModule } from "@nestjs/common";
import type { ErrorCatalog } from "@/infrastructure/problem-details/problem.interface";

import { DEFAULT_CATALOG } from "@/infrastructure/problem-details/default.catalog";
import { ErrorRegistryService } from "@/infrastructure/problem-details/registry.service";
import { DomainExceptionFilter } from "@/infrastructure/problem-details/filters/domain-exception.filter";

@Global()
@Module({})
export class ProblemDetailsModule {
	public static forRoot(): DynamicModule {
		return {
			module: ProblemDetailsModule,
			providers: [
				ErrorRegistryService,
				{
					provide: APP_FILTER,
					useClass: DomainExceptionFilter,
				},
				{
					provide: "DEFAULT_ERRORS_INIT",
					useFactory: (registry: ErrorRegistryService) => {
						registry.register(DEFAULT_CATALOG);
					},
					inject: [ErrorRegistryService],
				},
			],
			exports: [ErrorRegistryService],
		};
	}

	public static forFeature(catalog: ErrorCatalog): DynamicModule {
		return {
			module: ProblemDetailsModule,
			providers: [
				{
					provide: `ERRORS_FEAT_${Math.random().toString(36).substring(7)}`,
					useFactory: (registry: ErrorRegistryService) => {
						registry.register(catalog);
					},
					inject: [ErrorRegistryService],
				},
			],
		};
	}
}
