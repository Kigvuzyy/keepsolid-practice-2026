import { AggregateRoot } from "@kigvuzyy/shared";

import type { BaseEntityProps } from "@kigvuzyy/shared";

export const UploadIntentStatus = {
	PENDING: "PENDING",
	CONFIRMED: "CONFIRMED",
	FAILED: "FAILED",
	EXPIRED: "EXPIRED",
	CANCELED: "CANCELED",
} as const;

export type UploadIntentStatusType = (typeof UploadIntentStatus)[keyof typeof UploadIntentStatus];

export interface UploadIntentProps extends BaseEntityProps<bigint> {
	userId: bigint;
	status: UploadIntentStatusType;
	bucket: string;
	objectKey: string;
	originalFileName: string;
	expectedContentType: string | null;
	expectedSizeBytes: bigint | null;
	actualContentType: string | null;
	actualSizeBytes: bigint | null;
	etag: string | null;
	presignedExpiresAt: Date;
	confirmedAt: Date | null;
	failedReason: string | null;
}

export interface CreateUploadIntentProps {
	id: bigint;
	userId: bigint;
	bucket: string;
	objectKey: string;
	originalFileName: string;
	expectedContentType?: string | null;
	expectedSizeBytes?: bigint | null;
	presignedExpiresAt: Date;
}

export interface ConfirmUploadIntentParams {
	actualSizeBytes: bigint;
	actualContentType?: string | null;
	etag?: string | null;
	confirmedAt?: Date;
}

export class UploadIntent extends AggregateRoot<UploadIntentProps, bigint> {
	private readonly _userId: bigint;

	private _status: UploadIntentStatusType;

	private readonly _bucket: string;

	private readonly _objectKey: string;

	private readonly _originalFileName: string;

	private readonly _expectedContentType: string | null;

	private readonly _expectedSizeBytes: bigint | null;

	private _actualContentType: string | null;

	private _actualSizeBytes: bigint | null;

	private _etag: string | null;

	private readonly _presignedExpiresAt: Date;

	private _confirmedAt: Date | null;

	private _failedReason: string | null;

	private constructor(props: UploadIntentProps) {
		super(props);

		this._userId = props.userId;
		this._status = props.status;
		this._bucket = props.bucket;
		this._objectKey = props.objectKey;
		this._originalFileName = props.originalFileName;
		this._expectedContentType = props.expectedContentType;
		this._expectedSizeBytes = props.expectedSizeBytes;
		this._actualContentType = props.actualContentType;
		this._actualSizeBytes = props.actualSizeBytes;
		this._etag = props.etag;
		this._presignedExpiresAt = props.presignedExpiresAt;
		this._confirmedAt = props.confirmedAt;
		this._failedReason = props.failedReason;
	}

	public static create(props: CreateUploadIntentProps): UploadIntent {
		return new UploadIntent({
			id: props.id,
			version: 1,
			userId: props.userId,
			status: UploadIntentStatus.PENDING,
			bucket: props.bucket,
			objectKey: props.objectKey,
			originalFileName: props.originalFileName,
			expectedContentType: props.expectedContentType ?? null,
			expectedSizeBytes: props.expectedSizeBytes ?? null,
			actualContentType: null,
			actualSizeBytes: null,
			etag: null,
			presignedExpiresAt: props.presignedExpiresAt,
			confirmedAt: null,
			failedReason: null,
		});
	}

	public static restore(props: UploadIntentProps): UploadIntent {
		return new UploadIntent(props);
	}

	public get userId(): bigint {
		return this._userId;
	}

	public get status(): UploadIntentStatusType {
		return this._status;
	}

	public get bucket(): string {
		return this._bucket;
	}

	public get objectKey(): string {
		return this._objectKey;
	}

	public get originalFileName(): string {
		return this._originalFileName;
	}

	public get expectedContentType(): string | null {
		return this._expectedContentType;
	}

	public get expectedSizeBytes(): bigint | null {
		return this._expectedSizeBytes;
	}

	public get actualContentType(): string | null {
		return this._actualContentType;
	}

	public get actualSizeBytes(): bigint | null {
		return this._actualSizeBytes;
	}

	public get etag(): string | null {
		return this._etag;
	}

	public get presignedExpiresAt(): Date {
		return this._presignedExpiresAt;
	}

	public get confirmedAt(): Date | null {
		return this._confirmedAt;
	}

	public get failedReason(): string | null {
		return this._failedReason;
	}

	public confirm(params: ConfirmUploadIntentParams): void {
		this.assertPending("confirm");

		if (params.actualSizeBytes <= 0n) {
			throw new Error("Upload size must be greater than 0");
		}

		this._status = UploadIntentStatus.CONFIRMED;
		this._actualSizeBytes = params.actualSizeBytes;
		this._actualContentType = params.actualContentType ?? null;
		this._etag = params.etag ?? null;
		this._confirmedAt = params.confirmedAt ?? new Date();
		this._failedReason = null;
		this.touch();
	}

	public fail(reason: string): void {
		this.assertPending("fail");

		const normalizedReason = reason.trim();
		if (normalizedReason.length === 0) {
			throw new Error("Failure reason is required");
		}

		this._status = UploadIntentStatus.FAILED;
		this._failedReason = normalizedReason;
		this.touch();
	}

	public cancel(reason?: string): void {
		this.assertPending("cancel");

		this._status = UploadIntentStatus.CANCELED;
		this._failedReason = reason?.trim() ?? null;
		this.touch();
	}

	public expire(now: Date = new Date()): boolean {
		if (this._status !== UploadIntentStatus.PENDING) {
			return false;
		}

		if (this._presignedExpiresAt > now) {
			return false;
		}

		this._status = UploadIntentStatus.EXPIRED;
		this._failedReason = "Upload URL expired";
		this.touch();

		return true;
	}

	public belongsTo(userId: bigint): boolean {
		return this._userId === userId;
	}

	public toPrimitives(): UploadIntentProps {
		return {
			id: this._id,
			version: this._version,
			userId: this._userId,
			status: this._status,
			bucket: this._bucket,
			objectKey: this._objectKey,
			originalFileName: this._originalFileName,
			expectedContentType: this._expectedContentType,
			expectedSizeBytes: this._expectedSizeBytes,
			actualContentType: this._actualContentType,
			actualSizeBytes: this._actualSizeBytes,
			etag: this._etag,
			presignedExpiresAt: this._presignedExpiresAt,
			confirmedAt: this._confirmedAt,
			failedReason: this._failedReason,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
		};
	}

	private assertPending(action: string): void {
		if (this._status !== UploadIntentStatus.PENDING) {
			throw new Error(`Cannot ${action} upload intent with status ${this._status}`);
		}
	}
}
