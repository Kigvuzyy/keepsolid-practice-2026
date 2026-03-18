import { Module } from "@nestjs/common";

import type { IdempotencyAdapterFactory } from "@/contracts";
import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type { IdempotencyModuleAsyncOptions, IdempotencyModuleOptions } from "@/idempotency.options";

import { IdempotencyPort } from "@/contracts";
import { IDEMPOTENCY_ADAPTER_FACTORY, IDEMPOTENCY_OPTIONS } from "@/constants";

@Module({})
export class IdempotencyModule {
	private static createIdempotencyProvider<TOptions, TTransactionContext = unknown>(): FactoryProvider<
		IdempotencyPort<TTransactionContext>
	> {
		return {
			provide: IdempotencyPort,
			useFactory: (
				adapter: IdempotencyAdapterFactory<TOptions, TTransactionContext>,
				options: TOptions,
			) => adapter.create(options),
			inject: [IDEMPOTENCY_ADAPTER_FACTORY, IDEMPOTENCY_OPTIONS],
		};
	}

	public static register<TOptions, TTransactionContext = unknown>(
		options: IdempotencyModuleOptions<TOptions, TTransactionContext>,
	): DynamicModule {
		const providers: Provider[] = [
			{ provide: IDEMPOTENCY_OPTIONS, useValue: options.options },
			{ provide: IDEMPOTENCY_ADAPTER_FACTORY, useClass: options.adapter },
			IdempotencyModule.createIdempotencyProvider<TOptions, TTransactionContext>(),
			...(options.extraProviders ?? []),
		];

		return {
			module: IdempotencyModule,
			imports: options.imports ?? [],
			providers,
			exports: [IdempotencyPort],
		};
	}

	public static registerAsync<TOptions, TTransactionContext = unknown>(
		options: IdempotencyModuleAsyncOptions<TOptions, TTransactionContext>,
	): DynamicModule {
		const optionsProvider: FactoryProvider<TOptions> = {
			provide: IDEMPOTENCY_OPTIONS,
			useFactory: async (...args: readonly unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		const providers: Provider[] = [
			optionsProvider,
			{ provide: IDEMPOTENCY_ADAPTER_FACTORY, useClass: options.adapter },
			IdempotencyModule.createIdempotencyProvider<TOptions, TTransactionContext>(),
			...(options.extraProviders ?? []),
		];

		return {
			module: IdempotencyModule,
			imports: options.imports ?? [],
			providers,
			exports: [IdempotencyPort],
		};
	}
}
