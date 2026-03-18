import { Module } from "@nestjs/common";

import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type { MinioModuleAsyncOptions, MinioModuleOptions } from "@/minio.options";

import { MinioService } from "@/minio.service";
import { MINIO_MODULE_OPTIONS } from "@/minio.constants";

@Module({})
export class MinioModule {
	public static register(options: MinioModuleOptions): DynamicModule {
		const providers: Provider[] = [
			{
				provide: MINIO_MODULE_OPTIONS,
				useValue: options,
			},
			MinioService,
		];

		return {
			module: MinioModule,
			global: options.global ?? false,
			providers,
			exports: [MinioService],
		};
	}

	public static registerAsync(options: MinioModuleAsyncOptions): DynamicModule {
		const optionsProvider: FactoryProvider<MinioModuleOptions> = {
			provide: MINIO_MODULE_OPTIONS,
			useFactory: async (...args: unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		return {
			module: MinioModule,
			global: options.global ?? false,
			imports: options.imports ?? [],
			providers: [optionsProvider, MinioService, ...(options.extraProviders ?? [])],
			exports: [MinioService],
		};
	}
}
