import { withTimeout } from "@kigvuzyy/ts-utils";
import { MinioService } from "@kigvuzyy/minio-nest";
import { Inject, Injectable } from "@nestjs/common";
import { HealthIndicatorService } from "@nestjs/terminus";

import type { HealthIndicatorResult } from "@nestjs/terminus";

const READINESS_TIMEOUT_MS = 1_000;

@Injectable()
export class MinioHealthIndicator {
	public constructor(
		@Inject(HealthIndicatorService)
		private readonly healthIndicatorService: HealthIndicatorService,

		@Inject(MinioService)
		private readonly minio: MinioService,
	) {}

	public async isHealthy(key: string): Promise<HealthIndicatorResult> {
		const indicator = this.healthIndicatorService.check(key);

		try {
			await withTimeout(
				this.minio.listBuckets(),
				READINESS_TIMEOUT_MS,
				"MinIO health check timed out",
			);

			return indicator.up();
		} catch (error: unknown) {
			return indicator.down({
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
