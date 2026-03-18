import { createHash } from "node:crypto";

import { RedisService } from "@kigvuzyy/redis-nest";
import { Inject, Injectable, Logger } from "@nestjs/common";

import type {
	CacheSearchRerankInput,
	SearchRerankCacheEntry,
	SearchRerankCachePort,
} from "@/modules/search/domain/ports/search-rerank-cache.port";

import { ConfigService } from "@/infrastructure/config/config.service";
import { SearchRankingPolicy } from "@/modules/search/domain/services/search-ranking-policy";
import { searchRerankCacheEntrySchema } from "@/modules/search/infrastructure/schemas/redis-search-rerank-cache.schema";

const CACHE_KEY_PREFIX = "search:rerank-snapshot:v1";

@Injectable()
export class RedisSearchRerankCacheAdapter implements SearchRerankCachePort {
	private readonly logger = new Logger(RedisSearchRerankCacheAdapter.name);

	public constructor(
		@Inject(RedisService)
		private readonly redis: RedisService,

		@Inject(ConfigService)
		private readonly config: ConfigService,

		@Inject(SearchRankingPolicy)
		private readonly rankingPolicy: SearchRankingPolicy,
	) {}

	public async get(query: string): Promise<SearchRerankCacheEntry | null> {
		const key = this.buildKey(query);
		let cachedValue: string | null;

		try {
			cachedValue = await this.redis.get(key);
		} catch (error: unknown) {
			this.logger.warn(
				`Failed to read rerank cache for key "${key}". ${error instanceof Error ? error.message : String(error)}`,
			);

			return null;
		}

		if (cachedValue === null) {
			return null;
		}

		try {
			return await searchRerankCacheEntrySchema.parseAsync(JSON.parse(cachedValue));
		} catch (error: unknown) {
			this.logger.warn(
				`Invalid rerank cache payload for key "${key}". Dropping entry. ${error instanceof Error ? error.message : String(error)}`,
			);

			await this.redis.del(key).catch(() => void 0);

			return null;
		}
	}

	public async set(input: CacheSearchRerankInput): Promise<void> {
		const key = this.buildKey(input.query);
		const ttlSeconds = this.config.get("SEARCH_RERANK_CACHE_TTL_SECONDS");

		const payload = JSON.stringify({
			items: input.items,
			hasMoreAfterWindow: input.hasMoreAfterWindow,
		} satisfies SearchRerankCacheEntry);

		try {
			await this.redis.set(key, payload, "EX", ttlSeconds);
		} catch (error: unknown) {
			this.logger.warn(
				`Failed to write rerank cache for key "${key}". ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private buildKey(query: string): string {
		const normalizedQuery = this.rankingPolicy.normalizeQuery(query);
		const cacheWindow = this.config.get("SEARCH_RERANK_CACHE_WINDOW");
		const hash = createHash("sha256").update(normalizedQuery).digest("hex");

		return `${CACHE_KEY_PREFIX}:w${cacheWindow}:${hash}`;
	}
}
