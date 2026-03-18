import type { IdempotencyAdapterFactory } from "@/contracts";
import type { InjectionToken, ModuleMetadata, Provider, Type } from "@nestjs/common";

export interface IdempotencyModuleOptions<
	TOptions,
	TTransactionContext = unknown,
	TAdapterFactory extends IdempotencyAdapterFactory<
		TOptions,
		TTransactionContext
	> = IdempotencyAdapterFactory<TOptions, TTransactionContext>,
> extends Pick<ModuleMetadata, "imports"> {
	adapter: Type<TAdapterFactory>;
	options: TOptions;
	extraProviders?: Provider[];
}

export interface IdempotencyModuleAsyncOptions<
	TOptions,
	TTransactionContext = unknown,
	TAdapterFactory extends IdempotencyAdapterFactory<
		TOptions,
		TTransactionContext
	> = IdempotencyAdapterFactory<TOptions, TTransactionContext>,
> extends Pick<ModuleMetadata, "imports"> {
	adapter: Type<TAdapterFactory>;
	useFactory(...args: readonly unknown[]): Promise<TOptions> | TOptions;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
}
