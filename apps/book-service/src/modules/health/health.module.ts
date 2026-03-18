import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { HealthController } from "@/modules/health/presentation/controllers/health.controller";

@Module({
	imports: [TerminusModule, PrismaModule],
	controllers: [HealthController],
})
export class HealthModule {}
