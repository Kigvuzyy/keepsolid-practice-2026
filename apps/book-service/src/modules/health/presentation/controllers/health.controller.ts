import process from "node:process";

import { Controller, Get, Inject, VERSION_NEUTRAL } from "@nestjs/common";
import {
	HealthCheck,
	HealthCheckService,
	MemoryHealthIndicator,
	PrismaHealthIndicator,
} from "@nestjs/terminus";

import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
	public constructor(
		@Inject(HealthCheckService)
		private readonly health: HealthCheckService,

		@Inject(MemoryHealthIndicator)
		private readonly memory: MemoryHealthIndicator,

		@Inject(PrismaHealthIndicator)
		private readonly prismaIndicator: PrismaHealthIndicator,

		@Inject(PrismaService)
		private readonly prisma: PrismaService,
	) {}

	@Get("live")
	public live() {
		return {
			status: "ok",
			uptime: Math.floor(process.uptime()),
		};
	}

	@Get("ready")
	@HealthCheck()
	public async ready() {
		return this.health.check([
			async () => this.prismaIndicator.pingCheck("database", this.prisma, { timeout: 1_000 }),
			async () => this.memory.checkHeap("memory_heap", 300 * 1_024 * 1_024),
		]);
	}
}
