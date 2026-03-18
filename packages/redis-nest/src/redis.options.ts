import type { InjectionToken, ModuleMetadata, Provider } from "@nestjs/common";
import type { RedisOptions } from "ioredis";

export interface RedisModuleOptions extends RedisOptions {
	readonly url?: string;
	readonly connectOnModuleInit?: boolean;
	readonly closeOnModuleDestroy?: boolean;
	readonly global?: boolean;
}

export interface RedisModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	useFactory(...args: unknown[]): Promise<RedisModuleOptions> | RedisModuleOptions;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
	global?: boolean;
}
