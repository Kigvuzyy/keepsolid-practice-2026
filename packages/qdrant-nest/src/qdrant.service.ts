import { Inject, Injectable } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { runInSpan } from "@kigvuzyy/observability/span";

import type { OnModuleInit } from "@nestjs/common";
import type { QdrantModuleOptions, QdrantPayloadFieldSchema } from "@/qdrant.options";

import {
	QDRANT_BM25_MODEL,
	QDRANT_DENSE_VECTOR_NAME,
	QDRANT_MODULE_OPTIONS,
	QDRANT_SPARSE_VECTOR_NAME,
} from "@/qdrant.constants";

@Injectable()
export class QdrantService extends QdrantClient implements OnModuleInit {
	private readonly collectionName: string;

	private readonly vectorSize: number;

	private readonly denseVectorName: string;

	private readonly sparseVectorName: string;

	private readonly sparseModel: string;

	private readonly ensureCollectionEnabled: boolean;

	private readonly onDiskPayload: boolean;

	private readonly payloadIndexes: readonly {
		fieldName: string;
		fieldSchema: QdrantPayloadFieldSchema;
	}[];

	public constructor(
		@Inject(QDRANT_MODULE_OPTIONS)
		options: QdrantModuleOptions,
	) {
		super({
			host: options.host,
			port: options.port,
			...(typeof options.https === "boolean" ? { https: options.https } : {}),
			...(options.apiKey ? { apiKey: options.apiKey } : {}),
		});

		this.collectionName = options.collectionName;
		this.vectorSize = options.vectorSize;
		this.denseVectorName = options.denseVectorName ?? QDRANT_DENSE_VECTOR_NAME;
		this.sparseVectorName = options.sparseVectorName ?? QDRANT_SPARSE_VECTOR_NAME;
		this.sparseModel = options.sparseModel ?? QDRANT_BM25_MODEL;
		this.ensureCollectionEnabled = options.ensureCollection ?? true;
		this.onDiskPayload = options.onDiskPayload ?? true;
		this.payloadIndexes = options.payloadIndexes ?? [];
	}

	public getCollectionName(): string {
		return this.collectionName;
	}

	public getBookChunksCollection(): string {
		return this.getCollectionName();
	}

	public async onModuleInit(): Promise<void> {
		if (!this.ensureCollectionEnabled) {
			return;
		}

		await this.ensureConfiguredCollection();
	}

	public override async getCollections(): ReturnType<QdrantClient["getCollections"]> {
		return runInSpan("qdrant.get_collections", this.buildAttrs("get_collections"), async () =>
			super.getCollections(),
		);
	}

	public override async getCollection(
		collectionName: Parameters<QdrantClient["getCollection"]>[0],
	): ReturnType<QdrantClient["getCollection"]> {
		return runInSpan(
			"qdrant.get_collection",
			this.buildAttrs("get_collection", collectionName),
			async () => super.getCollection(collectionName),
		);
	}

	public override async createCollection(
		collectionName: Parameters<QdrantClient["createCollection"]>[0],
		args: Parameters<QdrantClient["createCollection"]>[1],
	): ReturnType<QdrantClient["createCollection"]> {
		return runInSpan(
			"qdrant.create_collection",
			this.buildAttrs("create_collection", collectionName),
			async () => super.createCollection(collectionName, args),
		);
	}

	public override async createPayloadIndex(
		collectionName: Parameters<QdrantClient["createPayloadIndex"]>[0],
		args: Parameters<QdrantClient["createPayloadIndex"]>[1],
	): ReturnType<QdrantClient["createPayloadIndex"]> {
		return runInSpan(
			"qdrant.create_payload_index",
			this.buildAttrs("create_payload_index", collectionName, {
				"qdrant.field_name": typeof args.field_name === "string" ? args.field_name : "",
				"qdrant.wait": Boolean(args.wait),
			}),
			async () => super.createPayloadIndex(collectionName, args),
		);
	}

	public override async query(
		collectionName: Parameters<QdrantClient["query"]>[0],
		args: Parameters<QdrantClient["query"]>[1],
	): ReturnType<QdrantClient["query"]> {
		return runInSpan(
			"qdrant.query",
			this.buildAttrs("query", collectionName, {
				"qdrant.limit": typeof args.limit === "number" ? args.limit : 0,
				"qdrant.offset": typeof args.offset === "number" ? args.offset : 0,
				"qdrant.prefetch_count": Array.isArray(args.prefetch) ? args.prefetch.length : 0,
			}),
			async () => super.query(collectionName, args),
		);
	}

	public override async queryGroups(
		collectionName: Parameters<QdrantClient["queryGroups"]>[0],
		args: Parameters<QdrantClient["queryGroups"]>[1],
	): ReturnType<QdrantClient["queryGroups"]> {
		return runInSpan(
			"qdrant.query_groups",
			this.buildAttrs("query_groups", collectionName, {
				"qdrant.limit": typeof args.limit === "number" ? args.limit : 0,
				"qdrant.group_size": typeof args.group_size === "number" ? args.group_size : 0,
				"qdrant.group_by": typeof args.group_by === "string" ? args.group_by : "",
				"qdrant.prefetch_count": Array.isArray(args.prefetch) ? args.prefetch.length : 0,
			}),
			async () => super.queryGroups(collectionName, args),
		);
	}

	public override async upsert(
		collectionName: Parameters<QdrantClient["upsert"]>[0],
		args: Parameters<QdrantClient["upsert"]>[1] & { points?: unknown },
	): ReturnType<QdrantClient["upsert"]> {
		const pointsCount = Array.isArray(args.points) ? (args.points?.length ?? 0) : 0;

		return runInSpan(
			"qdrant.upsert",
			this.buildAttrs("upsert", collectionName, {
				"qdrant.points_count": pointsCount,
				"qdrant.wait": Boolean(args.wait),
			}),
			async () => super.upsert(collectionName, args),
		);
	}

	public override async delete(
		collectionName: Parameters<QdrantClient["delete"]>[0],
		args: Parameters<QdrantClient["delete"]>[1],
	): ReturnType<QdrantClient["delete"]> {
		return runInSpan(
			"qdrant.delete",
			this.buildAttrs("delete", collectionName, {
				"qdrant.wait": Boolean(args.wait),
			}),
			async () => super.delete(collectionName, args),
		);
	}

	private async ensureConfiguredCollection(): Promise<void> {
		const collections = await this.getCollections();
		const exists = collections.collections.some(
			(collection) => collection.name === this.collectionName,
		);

		if (!exists) {
			await this.createHybridCollection();
		} else {
			await this.ensureHybridCollectionShape();
		}

		for (const index of this.payloadIndexes) {
			await this.ensurePayloadIndex(index.fieldName, index.fieldSchema);
		}
	}

	private async createHybridCollection(): Promise<void> {
		try {
			await this.createCollection(this.collectionName, {
				vectors: {
					[this.denseVectorName]: {
						size: this.vectorSize,
						distance: "Cosine",
					},
				},
				sparse_vectors: {
					[this.sparseVectorName]: {
						modifier: "idf",
					},
				},
				on_disk_payload: this.onDiskPayload,
				metadata: {
					denseVectorName: this.denseVectorName,
					sparseVectorName: this.sparseVectorName,
					sparseModel: this.sparseModel,
				},
			});
		} catch (error: unknown) {
			const recheck = await this.getCollections();
			const createdByAnotherInstance = recheck.collections.some(
				(collection) => collection.name === this.collectionName,
			);

			if (!createdByAnotherInstance) {
				throw error;
			}
		}
	}

	private async ensureHybridCollectionShape(): Promise<void> {
		const collection = await this.getCollection(this.collectionName);
		const params = collection.config?.params;
		const vectors = params?.vectors;
		const sparseVectors = params?.sparse_vectors;
		const denseVector = this.extractNamedVector(vectors, this.denseVectorName);
		const sparseVector = sparseVectors?.[this.sparseVectorName];

		if (!denseVector) {
			throw new Error(
				`Qdrant collection \"${this.collectionName}\" does not have named dense vector \"${this.denseVectorName}\". Use a new collection name or recreate the collection for hybrid search.`,
			);
		}

		if (denseVector.size !== this.vectorSize) {
			throw new Error(
				`Qdrant collection \"${this.collectionName}\" dense vector size ${denseVector.size} does not match expected size ${this.vectorSize}. Use a new collection name or recreate the collection.`,
			);
		}

		if (!sparseVector) {
			throw new Error(
				`Qdrant collection \"${this.collectionName}\" does not have sparse vector \"${this.sparseVectorName}\". Use a new collection name or recreate the collection for hybrid search.`,
			);
		}
	}

	private extractNamedVector(
		vectors: unknown,
		vectorName: string,
	): { size: number; distance: string } | null {
		if (!vectors || typeof vectors !== "object" || Array.isArray(vectors)) {
			return null;
		}

		const candidate = (vectors as Record<string, unknown>)[vectorName];

		if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
			return null;
		}

		const size = (candidate as Record<string, unknown>).size;
		const distance = (candidate as Record<string, unknown>).distance;

		if (typeof size !== "number" || typeof distance !== "string") {
			return null;
		}

		return { size, distance };
	}

	private async ensurePayloadIndex(
		fieldName: string,
		fieldSchema: QdrantPayloadFieldSchema,
	): Promise<void> {
		try {
			await this.createPayloadIndex(this.collectionName, {
				field_name: fieldName,
				field_schema: fieldSchema,
				wait: true,
			});
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

			if (!message.includes("already exists")) {
				throw error;
			}
		}
	}

	private buildAttrs(
		operation: string,
		collectionName?: string,
		extra?: Record<string, boolean | number | string>,
	): Record<string, boolean | number | string> {
		const attrs: Record<string, boolean | number | string> = {
			"db.system": "qdrant",
			"db.operation.name": operation,
		};

		if (collectionName) {
			attrs["db.collection.name"] = collectionName;
		}

		if (extra) {
			Object.assign(attrs, extra);
		}

		return attrs;
	}
}
