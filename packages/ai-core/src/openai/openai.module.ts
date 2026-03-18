import process from "node:process";

import { Module } from "@nestjs/common";
import OpenAI from "openai";

import type { DynamicModule, FactoryProvider, Provider } from "@nestjs/common";
import type { OpenAIModuleAsyncOptions, OpenAIModuleOptions } from "@/openai/openai.options";

import { OpenAIEmbeddingsService } from "@/openai/openai-embeddings.service";
import { OPENAI_CLIENT, OPENAI_MODULE_OPTIONS } from "@/openai/openai.constants";

@Module({})
export class OpenAIModule {
	public static register(options: OpenAIModuleOptions = {}): DynamicModule {
		const providers: Provider[] = [
			{
				provide: OPENAI_MODULE_OPTIONS,
				useValue: options,
			},
			this.createClientProvider([OPENAI_MODULE_OPTIONS]),
			OpenAIEmbeddingsService,
		];

		return {
			module: OpenAIModule,
			providers,
			exports: [OPENAI_CLIENT, OpenAIEmbeddingsService],
		};
	}

	public static registerAsync(options: OpenAIModuleAsyncOptions): DynamicModule {
		const optionsProvider: FactoryProvider = {
			provide: OPENAI_MODULE_OPTIONS,
			useFactory: async (...args: unknown[]) => options.useFactory(...args),
			inject: options.inject ?? [],
		};

		return {
			module: OpenAIModule,
			imports: options.imports ?? [],
			providers: [
				optionsProvider,
				this.createClientProvider([OPENAI_MODULE_OPTIONS]),
				OpenAIEmbeddingsService,
				...(options.extraProviders ?? []),
			],
			exports: [OPENAI_CLIENT, OpenAIEmbeddingsService],
		};
	}

	private static createClientProvider(inject: [typeof OPENAI_MODULE_OPTIONS]): FactoryProvider {
		return {
			provide: OPENAI_CLIENT,
			useFactory: (options: OpenAIModuleOptions) => {
				const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;

				if (!apiKey) {
					throw new Error(
						"OpenAI API key is required. Pass apiKey to OpenAiModule.register(...) or set OPENAI_API_KEY.",
					);
				}

				return new OpenAI({
					apiKey,
					baseURL: options.baseURL,
					organization: options.organization,
					project: options.project,
					timeout: options.timeout,
					maxRetries: options.maxRetries,
				});
			},
			inject,
		};
	}
}
