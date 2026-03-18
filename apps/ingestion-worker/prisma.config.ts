import process from "node:process";

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema",
	migrations: {
		path: "./prisma/schema/migrations",
	},
	datasource: {
		url: process.env.DATABASE_URL ? env("DATABASE_URL") : "postgresql://localhost:5432/prisma",
	},
});
