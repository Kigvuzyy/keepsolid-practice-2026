import { Module } from "@nestjs/common";

import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type { RedisModuleAsyncOptions, RedisModuleOptions } from "@/redis.options";

import { RedisService } from "@/redis.service";
import { REDIS_MODULE_OPTIONS } from "@/redis.constants";

@Module({})
export class RedisModule {
	public static register(options: RedisModuleOptions): DynamicModule {
		const providers: Provider[] = [
			{
				provide: REDIS_MODULE_OPTIONS,
				useValue: options,
			},
			RedisService,
		];

		return {
			module: RedisModule,
			global: options.global ?? false,
			providers,
			exports: [RedisService],
		};
	}

	public static registerAsync(options: RedisModuleAsyncOptions): DynamicModule {
		const optionsProvider: FactoryProvider<RedisModuleOptions> = {
			provide: REDIS_MODULE_OPTIONS,
			useFactory: async (...args: unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		return {
			module: RedisModule,
			global: options.global ?? false,
			imports: options.imports ?? [],
			providers: [optionsProvider, RedisService, ...(options.extraProviders ?? [])],
			exports: [RedisService],
		};
	}
}
