import process from "node:process";

import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

import type { DynamicModule, Type, Provider } from "@nestjs/common";
import type {
	KafkaModuleOptions,
	KafkaModuleAsyncOptions,
	KafkaModuleOptionsFactory,
	ResolvedKafkaOptions,
} from "@/config/types";

import { KAFKA_CLIENT } from "@/constants";
import { mergeOptions } from "@/config/merge-options";
import { buildDefaultOptions } from "@/config/defaults";

@Module({})
export class KafkaModule {
	public static register(cfg?: KafkaModuleOptions): DynamicModule {
		const name = cfg?.name ?? KAFKA_CLIENT;

		const defaults: ResolvedKafkaOptions = buildDefaultOptions(process.env);
		const options: ResolvedKafkaOptions = mergeOptions(defaults, cfg?.options);

		return {
			module: KafkaModule,
			imports: [ClientsModule.register([{ name, transport: Transport.KAFKA, options }])],
			exports: [ClientsModule],
		};
	}

	public static registerAsync(cfg: KafkaModuleAsyncOptions): DynamicModule {
		const name = cfg.name ?? KAFKA_CLIENT;

		if (cfg.useFactory) {
			const asyncClient = ClientsModule.registerAsync([
				{
					name,
					imports: cfg.imports ?? [],
					inject: cfg.inject ?? [],
					extraProviders: cfg.extraProviders ?? [],
					useFactory: async (...args: unknown[]) => {
						const defaults = buildDefaultOptions(process.env);
						const override = await cfg.useFactory!(...args);
						const options = mergeOptions(defaults, override);
						return { transport: Transport.KAFKA, options };
					},
				},
			]);

			return {
				module: KafkaModule,
				imports: [...(cfg.imports ?? []), asyncClient],
				exports: [ClientsModule],
			};
		}

		const target: Type<KafkaModuleOptionsFactory> = (cfg.useExisting ?? cfg.useClass)!;

		const maybeFactoryProvider: Provider[] =
			cfg.useClass && cfg.useClass !== cfg.useExisting
				? [{ provide: cfg.useClass, useClass: cfg.useClass }]
				: [];

		const asyncClient = ClientsModule.registerAsync([
			{
				name,
				imports: cfg.imports ?? [],
				inject: [target],
				extraProviders: cfg.extraProviders ?? [],
				useFactory: async (factory: KafkaModuleOptionsFactory) => {
					const defaults = buildDefaultOptions(process.env);
					const override = await factory.createKafkaModuleOptions();
					const options = mergeOptions(defaults, override);
					return { transport: Transport.KAFKA, options };
				},
			},
		]);

		return {
			module: KafkaModule,
			imports: [...(cfg.imports ?? []), asyncClient],
			providers: [...maybeFactoryProvider],
			exports: [ClientsModule],
		};
	}
}
