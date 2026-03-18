import process from "node:process";

import { Injectable } from "@nestjs/common";

import type { ZodError } from "zod";
import type { AppEnv } from "@/infrastructure/config/env.schema";

import { envSchema } from "@/infrastructure/config/env.schema";

const formatZodError = (error: ZodError): string => {
	return error.issues
		.map((issue) => {
			const path = issue.path.join(".") || "env";
			return `- ${path}: ${issue.message}`;
		})
		.join("\n");
};

@Injectable()
export class ConfigService {
	private readonly env: AppEnv;

	public constructor() {
		const parsedEnv = envSchema.safeParse(process.env);

		if (!parsedEnv.success) {
			throw new Error(`Invalid environment variables:\n${formatZodError(parsedEnv.error)}`);
		}

		this.env = parsedEnv.data;
	}

	public get nodeEnv() {
		return this.env.NODE_ENV;
	}

	public get isProduction() {
		return this.env.NODE_ENV === "production";
	}

	public get port() {
		return this.env.PORT;
	}

	public get serviceName() {
		return this.env.SERVICE_NAME;
	}

	public get appVersion() {
		return this.env.APP_VERSION;
	}

	public get databaseUrl() {
		return `postgresql://${this.env.PG_USER}:${this.env.PG_PASSWORD}@${this.env.PG_HOST}/${this.env.PG_DATABASE}?connection_limit=${this.env.PG_CONNECTION_LIMIT}`;
	}

	public get<K extends keyof AppEnv>(key: K): AppEnv[K] {
		return this.env[key];
	}
}
