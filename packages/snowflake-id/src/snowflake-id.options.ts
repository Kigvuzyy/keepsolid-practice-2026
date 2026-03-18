import type { InjectionToken, ModuleMetadata, Provider } from "@nestjs/common";

import type { SnowflakeIdOptions } from "@/snowflake-id";

export interface SnowflakeIdModuleOptions extends SnowflakeIdOptions {
	readonly global?: boolean;
	readonly registerBigIntToJSON?: boolean;
}

export interface SnowflakeIdModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	useFactory(...args: unknown[]): Promise<SnowflakeIdModuleOptions> | SnowflakeIdModuleOptions;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
	global?: boolean;
}
