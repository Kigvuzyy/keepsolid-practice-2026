const DECIMAL_BIGINT_PATTERN = /^\d+$/;

export const parseSnowflakeId = (value: string): bigint => {
	if (!DECIMAL_BIGINT_PATTERN.test(value)) {
		throw new TypeError(`Expected decimal Snowflake ID string, received "${value}"`);
	}

	return BigInt(value);
};

export const formatSnowflakeId = (value: bigint): string => value.toString();
