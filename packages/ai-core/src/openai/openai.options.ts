import type { ModuleMetadata, InjectionToken, Provider } from "@nestjs/common";

export interface OpenAIModuleOptions {
	apiKey?: string;
	baseURL?: string;
	organization?: string;
	project?: string;
	timeout?: number;
	maxRetries?: number;
}

export interface OpenAIModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	useFactory(...args: unknown[]): OpenAIModuleOptions | Promise<OpenAIModuleOptions>;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
}
