import type { InjectionToken, ModuleMetadata, Provider } from "@nestjs/common";

export type QdrantPayloadFieldSchema = "bool" | "integer" | "keyword";

export interface QdrantPayloadIndexOptions {
	readonly fieldName: string;
	readonly fieldSchema: QdrantPayloadFieldSchema;
}

export interface QdrantModuleOptions {
	readonly host: string;
	readonly port: number;
	readonly apiKey?: string;
	readonly https?: boolean;
	readonly collectionName: string;
	readonly vectorSize: number;
	readonly denseVectorName?: string;
	readonly sparseVectorName?: string;
	readonly sparseModel?: string;
	readonly ensureCollection?: boolean;
	readonly onDiskPayload?: boolean;
	readonly payloadIndexes?: readonly QdrantPayloadIndexOptions[];
	readonly global?: boolean;
}

export interface QdrantModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	useFactory(...args: unknown[]): Promise<QdrantModuleOptions> | QdrantModuleOptions;
	inject?: InjectionToken[];
	extraProviders?: Provider[];
	global?: boolean;
}
