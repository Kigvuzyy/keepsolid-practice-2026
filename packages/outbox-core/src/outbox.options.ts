import type { OutboxAdapterFactory } from "@/contracts";
import type { InjectionToken, ModuleMetadata, Provider, Type } from "@nestjs/common";

export interface OutboxModuleOptions<
	TOptions,
	TTransactionContext = unknown,
	TAdapterFactory extends OutboxAdapterFactory<
		TOptions,
		TTransactionContext
	> = OutboxAdapterFactory<TOptions, TTransactionContext>,
> extends Pick<ModuleMetadata, "imports"> {
	adapter: Type<TAdapterFactory>;
	options: TOptions;
	extraProviders?: Provider[];
}

export interface OutboxModuleAsyncOptions<
	TOptions,
	TTransactionContext = unknown,
	TAdapterFactory extends OutboxAdapterFactory<
		TOptions,
		TTransactionContext
	> = OutboxAdapterFactory<TOptions, TTransactionContext>,
> extends Pick<ModuleMetadata, "imports"> {
	adapter: Type<TAdapterFactory>;
	useFactory(...args: readonly unknown[]): Promise<TOptions> | TOptions;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
}
