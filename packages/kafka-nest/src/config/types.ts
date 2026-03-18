import type { KafkaOptions } from "@nestjs/microservices";
import type { ModuleMetadata, Provider, Type } from "@nestjs/common";

export type KafkaOptionsConfig = NonNullable<KafkaOptions["options"]>;

export type ResolvedKafkaOptions = KafkaOptionsConfig & {
	client: NonNullable<KafkaOptionsConfig["client"]>;
	consumer: NonNullable<KafkaOptionsConfig["consumer"]>;
	subscribe: NonNullable<KafkaOptionsConfig["subscribe"]>;
	run: NonNullable<KafkaOptionsConfig["run"]>;
};

export interface KafkaOptionsOverride {
	client?: Partial<ResolvedKafkaOptions["client"]>;
	consumer?: Partial<ResolvedKafkaOptions["consumer"]>;
	subscribe?: Partial<ResolvedKafkaOptions["subscribe"]>;
	run?: Partial<ResolvedKafkaOptions["run"]>;

	producer?: KafkaOptionsConfig["producer"];
	serializer?: KafkaOptionsConfig["serializer"];
	deserializer?: KafkaOptionsConfig["deserializer"];
}

export interface KafkaModuleOptions {
	name?: string;
	options?: KafkaOptionsOverride;
}

export interface KafkaModuleOptionsFactory {
	createKafkaModuleOptions(): KafkaOptionsOverride | Promise<KafkaOptionsOverride>;
}

export interface KafkaModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	name?: string;

	useExisting?: Type<KafkaModuleOptionsFactory>;
	useClass?: Type<KafkaModuleOptionsFactory>;
	useFactory?(...args: unknown[]): KafkaOptionsOverride | Promise<KafkaOptionsOverride>;
	inject?: unknown[];

	extraProviders?: Provider[];
}
