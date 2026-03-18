import { Global, Module } from "@nestjs/common";

import { ConfigService } from "@/infrastructure/config/config.service";

@Global()
@Module({
	providers: [ConfigService],
	exports: [ConfigService],
})
export class ConfigModule {}
