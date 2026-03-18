import { Inject, Injectable } from "@nestjs/common";

import type { SnowflakeIdModuleOptions } from "@/snowflake-id.options";

import { SNOWFLAKE_ID_MODULE_OPTIONS } from "@/snowflake-id.constants";
import { SnowflakeIdGenerator, registerBigIntToJSON } from "@/snowflake-id";

@Injectable()
export class SnowflakeIdService extends SnowflakeIdGenerator {
	public constructor(
		@Inject(SNOWFLAKE_ID_MODULE_OPTIONS)
		options: SnowflakeIdModuleOptions,
	) {
		super(options);

		if (options.registerBigIntToJSON ?? false) {
			registerBigIntToJSON();
		}
	}
}
