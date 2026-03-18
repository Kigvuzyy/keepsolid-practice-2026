import { Module } from "@nestjs/common";

import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type {
	SnowflakeIdModuleAsyncOptions,
	SnowflakeIdModuleOptions,
} from "@/snowflake-id.options";

import { SNOWFLAKE_ID_MODULE_OPTIONS } from "@/snowflake-id.constants";
import { SnowflakeIdService } from "@/snowflake-id.service";

@Module({})
export class SnowflakeIdModule {
	public static register(options: SnowflakeIdModuleOptions): DynamicModule {
		const providers: Provider[] = [
			{
				provide: SNOWFLAKE_ID_MODULE_OPTIONS,
				useValue: options,
			},
			SnowflakeIdService,
		];

		return {
			module: SnowflakeIdModule,
			global: options.global ?? false,
			providers,
			exports: [SnowflakeIdService],
		};
	}

	public static registerAsync(options: SnowflakeIdModuleAsyncOptions): DynamicModule {
		const optionsProvider: FactoryProvider<SnowflakeIdModuleOptions> = {
			provide: SNOWFLAKE_ID_MODULE_OPTIONS,
			useFactory: async (...args: unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		return {
			module: SnowflakeIdModule,
			global: options.global ?? false,
			imports: options.imports ?? [],
			providers: [optionsProvider, SnowflakeIdService, ...(options.extraProviders ?? [])],
			exports: [SnowflakeIdService],
		};
	}
}
