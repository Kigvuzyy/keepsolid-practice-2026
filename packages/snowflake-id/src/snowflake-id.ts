export interface SnowflakeMachineId {
	workerId: number;
	dataCenterId: number;
}

export interface SnowflakeIdOptions {
	customEpoch?: Date | number;
	machineId?: Partial<SnowflakeMachineId>;
	onClockBackward?: "throw" | "wait";
}

export interface SnowflakeIdDecoded {
	id: bigint;
	dateTime: Date;
	timestamp: bigint;
	dataCenterId: bigint;
	workerId: bigint;
	sequence: bigint;
	epoch: number;
}

declare global {
	interface BigInt {
		toJSON: string;
	}
}

export function registerBigIntToJSON(): void {
	if (Object.prototype.hasOwnProperty.call(BigInt.prototype, "toJSON")) {
		return;
	}

	Object.defineProperty(BigInt.prototype, "toJSON", {
		value: function toJSON(this: bigint): string {
			return this.toString();
		},
		writable: true,
		configurable: true,
		enumerable: false,
	});
}

export class SnowflakeIdGenerator {
	public static readonly DEFAULT_EPOCH = Date.parse("2026-01-01T00:00:00.000Z");

	private static readonly TOTAL_BITS = 64n;

	private static readonly UNUSED_SIGN_BITS = 1n;

	private static readonly TIMESTAMP_BITS = 41n;

	private static readonly DATA_CENTER_ID_BITS = 5n;

	private static readonly WORKER_ID_BITS = 5n;

	private static readonly SEQUENCE_BITS = 12n;

	private static readonly WORKER_ID_SHIFT = SnowflakeIdGenerator.SEQUENCE_BITS;

	private static readonly DATA_CENTER_ID_SHIFT =
		SnowflakeIdGenerator.WORKER_ID_BITS + SnowflakeIdGenerator.SEQUENCE_BITS;

	private static readonly TIMESTAMP_SHIFT =
		SnowflakeIdGenerator.DATA_CENTER_ID_BITS +
		SnowflakeIdGenerator.WORKER_ID_BITS +
		SnowflakeIdGenerator.SEQUENCE_BITS;

	private static readonly MAX_WORKER_ID = (1 << Number(SnowflakeIdGenerator.WORKER_ID_BITS)) - 1;

	private static readonly MAX_DATA_CENTER_ID =
		(1 << Number(SnowflakeIdGenerator.DATA_CENTER_ID_BITS)) - 1;

	private static readonly MAX_SEQUENCE = (1 << Number(SnowflakeIdGenerator.SEQUENCE_BITS)) - 1;

	private static readonly MAX_TIMESTAMP = (1n << SnowflakeIdGenerator.TIMESTAMP_BITS) - 1n;

	private static readonly SEQUENCE_MASK = (1n << SnowflakeIdGenerator.SEQUENCE_BITS) - 1n;

	private static readonly WORKER_ID_MASK = (1n << SnowflakeIdGenerator.WORKER_ID_BITS) - 1n;

	private static readonly DATA_CENTER_ID_MASK =
		(1n << SnowflakeIdGenerator.DATA_CENTER_ID_BITS) - 1n;

	private readonly epoch: number;

	private readonly workerId: number;

	private readonly dataCenterId: number;

	private readonly onClockBackward: "throw" | "wait";

	private lastTimestamp = -1;

	private sequence = 0;

	public constructor(options: SnowflakeIdOptions = {}) {
		this.epoch = SnowflakeIdGenerator.normalizeEpoch(
			options.customEpoch ?? SnowflakeIdGenerator.DEFAULT_EPOCH,
		);

		const machineId = options.machineId ?? {};

		this.workerId = machineId.workerId ?? 0;
		this.dataCenterId = machineId.dataCenterId ?? 0;
		this.onClockBackward = options.onClockBackward ?? "throw";

		SnowflakeIdGenerator.assertIntegerInRange(
			"workerId",
			this.workerId,
			0,
			SnowflakeIdGenerator.MAX_WORKER_ID,
		);

		SnowflakeIdGenerator.assertIntegerInRange(
			"dataCenterId",
			this.dataCenterId,
			0,
			SnowflakeIdGenerator.MAX_DATA_CENTER_ID,
		);
	}

	public getMachineId(): Readonly<SnowflakeMachineId> {
		return {
			workerId: this.workerId,
			dataCenterId: this.dataCenterId,
		};
	}

	public getEpoch(): number {
		return this.epoch;
	}

	public generate(): bigint {
		const { timestamp, sequence } = this.nextState();

		return (
			(BigInt(timestamp) << SnowflakeIdGenerator.TIMESTAMP_SHIFT) |
			(BigInt(this.dataCenterId) << SnowflakeIdGenerator.DATA_CENTER_ID_SHIFT) |
			(BigInt(this.workerId) << SnowflakeIdGenerator.WORKER_ID_SHIFT) |
			BigInt(sequence)
		);
	}

	public generateString(): string {
		return this.generate().toString();
	}

	public decode(id: bigint | string): SnowflakeIdDecoded {
		const value = typeof id === "bigint" ? id : BigInt(id);

		const sequence = value & SnowflakeIdGenerator.SEQUENCE_MASK;
		const workerId =
			(value >> SnowflakeIdGenerator.WORKER_ID_SHIFT) & SnowflakeIdGenerator.WORKER_ID_MASK;
		const dataCenterId =
			(value >> SnowflakeIdGenerator.DATA_CENTER_ID_SHIFT) &
			SnowflakeIdGenerator.DATA_CENTER_ID_MASK;
		const timestamp = value >> SnowflakeIdGenerator.TIMESTAMP_SHIFT;

		return {
			id: value,
			timestamp,
			sequence,
			workerId,
			dataCenterId,
			epoch: this.epoch,
			dateTime: new Date(Number(timestamp) + this.epoch),
		};
	}

	public static get layout(): Readonly<{
		totalBits: bigint;
		unusedSignBits: bigint;
		timestampBits: bigint;
		dataCenterIdBits: bigint;
		workerIdBits: bigint;
		sequenceBits: bigint;
		maxWorkerId: number;
		maxDataCenterId: number;
		maxSequence: number;
	}> {
		return {
			totalBits: SnowflakeIdGenerator.TOTAL_BITS,
			unusedSignBits: SnowflakeIdGenerator.UNUSED_SIGN_BITS,
			timestampBits: SnowflakeIdGenerator.TIMESTAMP_BITS,
			dataCenterIdBits: SnowflakeIdGenerator.DATA_CENTER_ID_BITS,
			workerIdBits: SnowflakeIdGenerator.WORKER_ID_BITS,
			sequenceBits: SnowflakeIdGenerator.SEQUENCE_BITS,
			maxWorkerId: SnowflakeIdGenerator.MAX_WORKER_ID,
			maxDataCenterId: SnowflakeIdGenerator.MAX_DATA_CENTER_ID,
			maxSequence: SnowflakeIdGenerator.MAX_SEQUENCE,
		};
	}

	private nextState(): { timestamp: number; sequence: number } {
		let now = this.currentTimestamp();

		if (now < this.lastTimestamp) {
			if (this.onClockBackward === "throw") {
				throw new Error(
					`System clock moved backwards: current=${now}, last=${this.lastTimestamp}`,
				);
			}

			now = this.waitUntil(this.lastTimestamp);
		}

		if (now === this.lastTimestamp) {
			if (this.sequence >= SnowflakeIdGenerator.MAX_SEQUENCE) {
				now = this.waitUntil(this.lastTimestamp + 1);
				this.lastTimestamp = now;
				this.sequence = 0;

				return { timestamp: now, sequence: this.sequence };
			}

			this.sequence += 1;

			return { timestamp: now, sequence: this.sequence };
		}

		this.lastTimestamp = now;
		this.sequence = 0;

		return { timestamp: now, sequence: this.sequence };
	}

	private waitUntil(targetTimestamp: number): number {
		let timestamp = this.currentTimestamp();

		while (timestamp < targetTimestamp) {
			timestamp = this.currentTimestamp();
		}

		return timestamp;
	}

	private currentTimestamp(): number {
		const timestamp = Date.now() - this.epoch;

		if (timestamp < 0) {
			throw new Error(
				`Current time is before custom epoch: timestamp=${timestamp}, epoch=${this.epoch}`,
			);
		}

		if (BigInt(timestamp) > SnowflakeIdGenerator.MAX_TIMESTAMP) {
			throw new Error("Snowflake timestamp overflow: epoch range exceeded");
		}

		return timestamp;
	}

	private static normalizeEpoch(value: Date | number): number {
		const epoch = value instanceof Date ? value.getTime() : value;

		if (!Number.isFinite(epoch) || !Number.isInteger(epoch) || epoch < 0) {
			throw new TypeError("customEpoch must be a non-negative integer timestamp");
		}

		return epoch;
	}

	private static assertIntegerInRange(
		field: string,
		value: number,
		min: number,
		max: number,
	): void {
		if (!Number.isInteger(value) || value < min || value > max) {
			throw new RangeError(`${field} must be an integer between ${min} and ${max}`);
		}
	}
}
