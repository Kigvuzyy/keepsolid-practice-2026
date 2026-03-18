import type { InjectionToken, ModuleMetadata, Provider } from "@nestjs/common";

export interface MinioModuleOptions {
	readonly endPoint: string;
	readonly port: number;
	readonly useSSL: boolean;
	readonly accessKey: string;
	readonly secretKey: string;
	readonly global?: boolean;
}

export interface MinioModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	useFactory(...args: unknown[]): MinioModuleOptions | Promise<MinioModuleOptions>;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
	global?: boolean;
}
