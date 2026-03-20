import { z } from "zod";

const booleanFromEnv = (defaultValue: boolean) =>
	z
		.preprocess((v) => {
			if (v === true) return true;
			if (v === false) return false;
			if (v === 1) return true;
			if (v === 0) return false;
			if (typeof v === "string") {
				const s = v.trim().toLowerCase();
				if (s === "true" || s === "1") return true;
				if (s === "" || s === "false" || s === "0") return false;
			}

			return v;
		}, z.boolean())
		.default(defaultValue);

const boolTrueOnly = booleanFromEnv(false);

const commaSeparated = z.preprocess((val) => {
	if (Array.isArray(val)) return val;
	if (typeof val !== "string") return val;

	return val
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}, z.array(z.string()));

export const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

	PORT: z.coerce.number().int().min(1).max(65535).default(3002),
	SERVICE_NAME: z.string().min(1).default("search-service"),
	APP_VERSION: z.string().min(1).default("1.0.0"),

	OTEL_DIAG: z.string().default(""),
	OTEL_SERVICE_NAME: z.string().min(1).default("search-service"),
	OTEL_EXPORTER_OTLP_ENDPOINT: z.string().min(1).optional(),

	PG_HOST: z.string().min(1),
	PG_USER: z.string().min(1),
	PG_PASSWORD: z.string().min(1),
	PG_DATABASE: z.string().min(1),
	PG_CONNECTION_LIMIT: z.string().min(1).default("10"),

	KAFKA_CLIENT_ID: z.string().min(1),
	KAFKA_BROKERS: commaSeparated,
	KAFKA_GROUP_ID: z.string().min(1),

	S3_ENDPOINT: z.string().min(1),
	S3_PORT: z.coerce.number().int().min(1).max(65535).default(9000),
	S3_USE_SSL: boolTrueOnly,
	S3_ACCESS_KEY: z.string().min(1),
	S3_SECRET_KEY: z.string().min(1),
	S3_BUCKET: z.string().min(1).default("book-files"),

	QDRANT_HOST: z.string().min(1),
	QDRANT_PORT: z.coerce.number().int().min(1).max(65535).default(6333),
	QDRANT_HTTPS: boolTrueOnly,
	QDRANT_API_KEY: z.string().min(1),
	QDRANT_COLLECTION_BOOK_CHUNKS: z.string().min(1).default("book_chunks_v1"),

	REDIS_HOST: z.string().min(1),
	REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),

	RERANK_SERVICE_URL: z.string().url().default("http://localhost:3004"),
	RERANK_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
	RERANK_DEFAULT_WINDOW: z.coerce.number().int().positive().default(40),
	RERANK_MAX_CANDIDATES: z.coerce.number().int().positive().default(100),
	SEARCH_RERANK_CACHE_WINDOW: z.coerce.number().int().positive().default(100),
	SEARCH_RERANK_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),

	OPENAI_API_KEY: z.string().min(1),
	OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
});

export type AppEnv = z.infer<typeof envSchema>;
