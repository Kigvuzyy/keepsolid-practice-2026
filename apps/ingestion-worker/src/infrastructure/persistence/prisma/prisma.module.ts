import { Module } from "@nestjs/common";

import { ConfigModule } from "@/infrastructure/config/config.module";
import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";

@Module({
	imports: [ConfigModule],
	providers: [PrismaService],
	exports: [PrismaService],
})
export class PrismaModule {}
