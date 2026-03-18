import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { HealthController } from "@/modules/health/presentation/controllers/health.controller";
import { QdrantHealthIndicator } from "@/modules/health/infrastructure/indicators/qdrant.health-indicator";

@Module({
	imports: [TerminusModule, PrismaModule],
	controllers: [HealthController],
	providers: [QdrantHealthIndicator],
})
export class HealthModule {}
