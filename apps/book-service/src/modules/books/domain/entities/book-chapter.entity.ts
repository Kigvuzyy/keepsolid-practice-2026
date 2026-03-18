import { AggregateRoot } from "@kigvuzyy/shared";

import type { BaseEntityProps } from "@kigvuzyy/shared";

export interface BookChapterProps extends BaseEntityProps<bigint> {
	bookId: bigint;
	html: string;
	externalChapterId: string;
	chapterIndex: number;
	title: string | null;
	bucket: string | null;
	objectKey: string | null;
}

export interface CreateBookChapterProps {
	id: bigint;
	bookId: bigint;
	html: string;
	externalChapterId: string;
	chapterIndex: number;
	title?: string | null;
	bucket?: string | null;
	objectKey?: string | null;
}

export class BookChapter extends AggregateRoot<BookChapterProps, bigint> {
	private readonly _bookId: bigint;

	private readonly _html: string;

	private readonly _externalChapterId: string;

	private readonly _chapterIndex: number;

	private readonly _title: string | null;

	private readonly _bucket: string | null;

	private readonly _objectKey: string | null;

	private constructor(props: BookChapterProps) {
		super(props);

		this._html = props.html;
		this._bookId = props.bookId;
		this._externalChapterId = props.externalChapterId;
		this._chapterIndex = props.chapterIndex;
		this._title = props.title;
		this._bucket = props.bucket;
		this._objectKey = props.objectKey;
	}

	public static create(props: CreateBookChapterProps): BookChapter {
		const externalChapterId = props.externalChapterId.trim();

		if (externalChapterId.length === 0) {
			throw new Error("Chapter id is required");
		}

		if (!Number.isInteger(props.chapterIndex) || props.chapterIndex <= 0) {
			throw new Error("Chapter index must be a positive integer");
		}

		return new BookChapter({
			id: props.id,
			version: 1,
			html: props.html,
			bookId: props.bookId,
			externalChapterId,
			chapterIndex: props.chapterIndex,
			title: this.normalizeOptionalText(props.title),
			bucket: this.normalizeOptionalText(props.bucket),
			objectKey: this.normalizeOptionalText(props.objectKey),
		});
	}

	public static restore(props: BookChapterProps): BookChapter {
		return new BookChapter(props);
	}

	public get html(): string {
		return this._html;
	}

	public get bookId(): bigint {
		return this._bookId;
	}

	public get externalChapterId(): string {
		return this._externalChapterId;
	}

	public get chapterIndex(): number {
		return this._chapterIndex;
	}

	public get title(): string | null {
		return this._title;
	}

	public get bucket(): string | null {
		return this._bucket;
	}

	public get objectKey(): string | null {
		return this._objectKey;
	}

	public toPrimitives(): BookChapterProps {
		return {
			id: this._id,
			version: this._version,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
			html: this._html,
			bookId: this._bookId,
			externalChapterId: this._externalChapterId,
			chapterIndex: this._chapterIndex,
			title: this._title,
			bucket: this._bucket,
			objectKey: this._objectKey,
		};
	}

	private static normalizeOptionalText(value: string | null | undefined): string | null {
		const normalized = value?.trim();
		return normalized ?? null;
	}
}
