import { withTimeout } from "@kigvuzyy/ts-utils";
import { Inject, Injectable } from "@nestjs/common";
import { QdrantService } from "@kigvuzyy/qdrant-nest";
import { HealthIndicatorService } from "@nestjs/terminus";

import type { HealthIndicatorResult } from "@nestjs/terminus";

const READINESS_TIMEOUT_MS = 1_000;

@Injectable()
export class QdrantHealthIndicator {
	public constructor(
		@Inject(HealthIndicatorService)
		private readonly healthIndicatorService: HealthIndicatorService,

		@Inject(QdrantService)
		private readonly qdrant: QdrantService,
	) {}

	public async isHealthy(key: string): Promise<HealthIndicatorResult> {
		const indicator = this.healthIndicatorService.check(key);
		const collectionName = this.qdrant.getBookChunksCollection();

		try {
			await withTimeout(
				this.qdrant.getCollection(collectionName),
				READINESS_TIMEOUT_MS,
				"Qdrant health check timed out",
			);

			return indicator.up({
				collection: collectionName,
			});
		} catch (error: unknown) {
			return indicator.down({
				message: error instanceof Error ? error.message : String(error),
				collection: collectionName,
			});
		}
	}
}
