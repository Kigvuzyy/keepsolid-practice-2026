import type { Buffer } from "node:buffer";

export interface ReaderOpenInput {
	sourceBucket: string;
	sourceObjectName: string;
	sourceHtmlCacheMaxEntries?: number;
}

export interface ReaderContext {
	sourceBucket: string;
	sourceObjectName: string;
	sourceEpub: string;
	objectSize: number;
	readMode: "buffer" | "random-access";
	downloadMs?: number;
	readerStats?: {
		chunkSize: number;
		maxCachedChunks: number;
		cachedChunks: number;
		fetchCount: number;
		cacheHitCount: number;
		cacheMissCount: number;
		bytesFetched: number;
		bytesRequested: number;
		bytesServedFromCache: number;
	};
	bookTitle: string;
	author: string | null;
	coverImageDataUrl: string | null;
	chaptersInEpub: number;
	phasesMs: {
		indexZip: number;
		parseArchive: number;
		buildDescriptors: number;
		loadCover: number;
	};
}

export interface BookCoverAsset {
	bytes: Buffer;
	mediaType: string;
	fileExtension: string;
}

export interface ParsedChapterItem {
	chapterId: string;
	chapterTitle: string;
	chapterIndex: number;
	html: string;
	plainTextChars: number;
	isAnchored: boolean;
}

export abstract class EpubChapterReadSessionPort {
	public abstract extractChapters(): AsyncGenerator<ParsedChapterItem, void, undefined>;

	public abstract getCoverAsset(): BookCoverAsset | null;

	public abstract close(): void;

	public abstract getContext(): ReaderContext;
}

export abstract class EpubChapterReaderPort {
	public abstract open(input: ReaderOpenInput): Promise<EpubChapterReadSessionPort>;
}
