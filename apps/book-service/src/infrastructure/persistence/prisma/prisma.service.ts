import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "database/client";
import { Inject, Injectable } from "@nestjs/common";

import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "@/infrastructure/config/config.service";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	public constructor(
		@Inject(ConfigService)
		config: ConfigService,
	) {
		const adapter = new PrismaPg({
			connectionString: config.databaseUrl,
		});

		super({
			adapter,
			log: ["error", "warn"],
		});
	}

	public async onModuleInit() {
		await this.$connect();
	}

	public async onModuleDestroy() {
		await this.$disconnect();
	}
}
