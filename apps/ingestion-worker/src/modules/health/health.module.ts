import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { MinioHealthIndicator } from "@/modules/health/infrastructure/indicators/minio.health-indicator";
import { QdrantHealthIndicator } from "@/modules/health/infrastructure/indicators/qdrant.health-indicator";
import { HealthController } from "@/modules/health/presentation/controllers/health.controller";

@Module({
	imports: [TerminusModule, PrismaModule],
	controllers: [HealthController],
	providers: [MinioHealthIndicator, QdrantHealthIndicator],
})
export class HealthModule {}
