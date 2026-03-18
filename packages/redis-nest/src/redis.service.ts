import Redis from "ioredis";
import { Inject, Injectable } from "@nestjs/common";

import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { RedisModuleOptions } from "@/redis.options";

import { REDIS_MODULE_OPTIONS } from "@/redis.constants";

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
	private readonly connectOnModuleInitEnabled: boolean;

	private readonly closeOnModuleDestroyEnabled: boolean;

	public constructor(
		@Inject(REDIS_MODULE_OPTIONS)
		options: RedisModuleOptions,
	) {
		const {
			url,
			global: _global,
			connectOnModuleInit = false,
			closeOnModuleDestroy = true,
			...redisOptions
		} = options;

		if (url) {
			super(url, redisOptions);
		} else {
			super(redisOptions);
		}

		this.connectOnModuleInitEnabled = connectOnModuleInit;
		this.closeOnModuleDestroyEnabled = closeOnModuleDestroy;
	}

	public async onModuleInit(): Promise<void> {
		if (!this.connectOnModuleInitEnabled || this.status !== "wait") {
			return;
		}

		await this.connect();
	}

	public async onModuleDestroy(): Promise<void> {
		if (!this.closeOnModuleDestroyEnabled || this.status === "end") {
			return;
		}

		if (this.status === "wait") {
			this.disconnect(false);
			return;
		}

		try {
			await this.quit();
		} catch {
			this.disconnect(false);
		}
	}
}
