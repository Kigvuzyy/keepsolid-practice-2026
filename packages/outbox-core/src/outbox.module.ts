import { Module } from "@nestjs/common";

import type { OutboxAdapterFactory } from "@/contracts";
import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type { OutboxModuleAsyncOptions, OutboxModuleOptions } from "@/outbox.options";

import { OutboxPort } from "@/contracts";
import { OUTBOX_ADAPTER_FACTORY, OUTBOX_OPTIONS } from "@/constants";

@Module({})
export class OutboxModule {
	private static createOutboxProvider<TOptions, TTransactionContext = unknown>(): FactoryProvider<
		OutboxPort<TTransactionContext>
	> {
		return {
			provide: OutboxPort,
			useFactory: (
				adapter: OutboxAdapterFactory<TOptions, TTransactionContext>,
				options: TOptions,
			) => adapter.create(options),
			inject: [OUTBOX_ADAPTER_FACTORY, OUTBOX_OPTIONS],
		};
	}

	public static register<TOptions, TTransactionContext = unknown>(
		options: OutboxModuleOptions<TOptions, TTransactionContext>,
	): DynamicModule {
		const providers: Provider[] = [
			{ provide: OUTBOX_OPTIONS, useValue: options.options },
			{ provide: OUTBOX_ADAPTER_FACTORY, useClass: options.adapter },
			OutboxModule.createOutboxProvider<TOptions, TTransactionContext>(),
			...(options.extraProviders ?? []),
		];

		return {
			module: OutboxModule,
			imports: options.imports ?? [],
			providers,
			exports: [OutboxPort],
		};
	}

	public static registerAsync<TOptions, TTransactionContext = unknown>(
		options: OutboxModuleAsyncOptions<TOptions, TTransactionContext>,
	): DynamicModule {
		const optionsProvider: FactoryProvider<TOptions> = {
			provide: OUTBOX_OPTIONS,
			useFactory: async (...args: readonly unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		const providers: Provider[] = [
			optionsProvider,
			{ provide: OUTBOX_ADAPTER_FACTORY, useClass: options.adapter },
			OutboxModule.createOutboxProvider<TOptions, TTransactionContext>(),
			...(options.extraProviders ?? []),
		];

		return {
			module: OutboxModule,
			imports: options.imports ?? [],
			providers,
			exports: [OutboxPort],
		};
	}
}
