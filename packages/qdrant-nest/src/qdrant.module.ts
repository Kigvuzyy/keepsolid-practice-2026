import { Module } from "@nestjs/common";

import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type { QdrantModuleAsyncOptions, QdrantModuleOptions } from "@/qdrant.options";

import { QdrantService } from "@/qdrant.service";
import { QDRANT_MODULE_OPTIONS } from "@/qdrant.constants";

@Module({})
export class QdrantModule {
	public static register(options: QdrantModuleOptions): DynamicModule {
		const providers: Provider[] = [
			{
				provide: QDRANT_MODULE_OPTIONS,
				useValue: options,
			},
			QdrantService,
		];

		return {
			module: QdrantModule,
			global: options.global ?? false,
			providers,
			exports: [QdrantService],
		};
	}

	public static registerAsync(options: QdrantModuleAsyncOptions): DynamicModule {
		const optionsProvider: FactoryProvider<QdrantModuleOptions> = {
			provide: QDRANT_MODULE_OPTIONS,
			useFactory: async (...args: unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		return {
			module: QdrantModule,
			global: options.global ?? false,
			imports: options.imports ?? [],
			providers: [optionsProvider, QdrantService, ...(options.extraProviders ?? [])],
			exports: [QdrantService],
		};
	}
}
