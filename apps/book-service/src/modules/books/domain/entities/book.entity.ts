import { AggregateRoot } from "@kigvuzyy/shared";

import type { BaseEntityProps } from "@kigvuzyy/shared";

export const BookStatus = {
	UPLOADED: "UPLOADED",
	PROCESSING: "PROCESSING",
	READY: "READY",
	FAILED: "FAILED",
	DELETED: "DELETED",
} as const;

export type BookStatusValue = (typeof BookStatus)[keyof typeof BookStatus];

export interface BookProps extends BaseEntityProps<bigint> {
	ownerId: bigint;
	status: BookStatusValue;
	title: string;
	description: string | null;
	authors: string[];
	coverBucket: string | null;
	coverObjectKey: string | null;
	uploadIntentId: bigint;
	failedReason: string | null;
}

export interface CreateBookProps {
	id: bigint;
	ownerId: bigint;
	title: string;
	description?: string | null;
	authors?: string[];
	uploadIntentId: bigint;
}

export interface UpdateBookMetadataProps {
	title?: string | undefined;
	description?: string | null | undefined;
	authors?: string[] | undefined;
}

export class Book extends AggregateRoot<BookProps, bigint> {
	private readonly _ownerId: bigint;

	private _status: BookStatusValue;

	private _title: string;

	private _description: string | null;

	private _authors: string[];

	private _coverBucket: string | null;

	private _coverObjectKey: string | null;

	private readonly _uploadIntentId: bigint;

	private _failedReason: string | null;

	private constructor(props: BookProps) {
		super(props);

		this._ownerId = props.ownerId;
		this._status = props.status;
		this._title = props.title;
		this._description = props.description;
		this._authors = [...props.authors];
		this._coverBucket = props.coverBucket;
		this._coverObjectKey = props.coverObjectKey;
		this._uploadIntentId = props.uploadIntentId;
		this._failedReason = props.failedReason;
	}

	public static create(props: CreateBookProps): Book {
		return new Book({
			id: props.id,
			version: 1,
			ownerId: props.ownerId,
			status: BookStatus.UPLOADED,
			title: props.title,
			description: props.description ?? null,
			authors: props.authors ?? [],
			coverBucket: null,
			coverObjectKey: null,
			uploadIntentId: props.uploadIntentId,
			failedReason: null,
		});
	}

	public static restore(props: BookProps): Book {
		return new Book(props);
	}

	public get ownerId(): bigint {
		return this._ownerId;
	}

	public get status(): BookStatusValue {
		return this._status;
	}

	public get title(): string {
		return this._title;
	}

	public get description(): string | null {
		return this._description;
	}

	public get authors(): string[] {
		return [...this._authors];
	}

	public get coverBucket(): string | null {
		return this._coverBucket;
	}

	public get coverObjectKey(): string | null {
		return this._coverObjectKey;
	}

	public get uploadIntentId(): bigint {
		return this._uploadIntentId;
	}

	public get failedReason(): string | null {
		return this._failedReason;
	}

	public updateMetadata(props: UpdateBookMetadataProps): void {
		if (props.title !== undefined) {
			this._title = props.title;
		}

		if (props.description !== undefined) {
			this._description = props.description;
		}

		if (props.authors !== undefined) {
			this._authors = [...props.authors];
		}

		this.touch();
	}

	public markProcessing(): void {
		this.assertNotDeleted("mark processing");

		this._status = BookStatus.PROCESSING;
		this._failedReason = null;
		this.touch();
	}

	public markReady(): void {
		this.assertNotDeleted("mark ready");

		this._status = BookStatus.READY;
		this._failedReason = null;
		this.touch();
	}

	public markFailed(reason: string): void {
		this.assertNotDeleted("mark failed");

		const normalizedReason = reason.trim();
		if (normalizedReason.length === 0) {
			throw new Error("Failure reason is required");
		}

		this._status = BookStatus.FAILED;
		this._failedReason = normalizedReason;
		this.touch();
	}

	public assignCover(params: { bucket: string; objectKey: string }): void {
		this.assertNotDeleted("assign cover");

		const bucket = params.bucket.trim();
		const objectKey = params.objectKey.trim();

		if (bucket.length === 0) {
			throw new Error("Cover bucket is required");
		}

		if (objectKey.length === 0) {
			throw new Error("Cover object key is required");
		}

		this._coverBucket = bucket;
		this._coverObjectKey = objectKey;
		this.touch();
	}

	public markDeleted(reason?: string): void {
		if (this._status === BookStatus.DELETED) {
			return;
		}

		this._status = BookStatus.DELETED;
		this._failedReason = reason?.trim() ?? null;
		this.touch();
	}

	public toPrimitives(): BookProps {
		return {
			id: this._id,
			version: this._version,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
			ownerId: this._ownerId,
			status: this._status,
			title: this._title,
			description: this._description,
			authors: [...this._authors],
			coverBucket: this._coverBucket,
			coverObjectKey: this._coverObjectKey,
			uploadIntentId: this._uploadIntentId,
			failedReason: this._failedReason,
		};
	}

	private assertNotDeleted(action: string): void {
		if (this._status === BookStatus.DELETED) {
			throw new Error(`Cannot ${action} for deleted book`);
		}
	}
}
