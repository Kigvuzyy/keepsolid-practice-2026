import { ClsModule } from "nestjs-cls";
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MinioModule } from "@kigvuzyy/minio-nest";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { ProblemDetailsModule } from "@kigvuzyy/shared";
import { SnowflakeIdModule } from "@kigvuzyy/snowflake-id";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";

import { BooksModule } from "@/modules/books/books.module";
import { HealthModule } from "@/modules/health/health.module";
import { ConfigModule } from "@/infrastructure/config/config.module";
import { ConfigService } from "./infrastructure/config/config.service";
import { PrismaModule } from "@/infrastructure/persistence/prisma/prisma.module";
import { PrismaService } from "@/infrastructure/persistence/prisma/prisma.service";

@Module({
	imports: [
		ClsModule.forRoot({
			global: true,
			plugins: [
				new ClsPluginTransactional({
					imports: [PrismaModule],
					adapter: new TransactionalAdapterPrisma<PrismaService>({
						prismaInjectionToken: PrismaService,
						sqlFlavor: "postgresql",
					}),
					enableTransactionProxy: true,
				}),
			],
		}),

		MinioModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				endPoint: config.get("S3_ENDPOINT"),
				port: config.get("S3_PORT"),
				useSSL: config.get("S3_USE_SSL"),
				accessKey: config.get("S3_ACCESS_KEY"),
				secretKey: config.get("S3_SECRET_KEY"),
				region: config.get("S3_REGION"),
			}),
		}),

		SnowflakeIdModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				registerBigIntToJSON: true,
				machineId: {
					dataCenterId: config.get("SNOWFLAKE_DATA_CENTER_ID"),
					workerId: config.get("SNOWFLAKE_WORKER_ID"),
				},
			}),
		}),

		ProblemDetailsModule.forRoot(),
		ConfigModule,
		BooksModule,
		HealthModule,
	],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},
	],
})
export class AppModule {}
