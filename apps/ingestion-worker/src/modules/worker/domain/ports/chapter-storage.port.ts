export interface ChapterPayload {
	chapterId: string;
	chapterTitle: string;
	chapterIndex: number;
	html: string;
}

export interface UploadedChapterRef {
	chapterId: string;
	chapterIndex: number;
}

export interface UploadedSingleChapter {
	kind: "chapter";
	bucket: string;
	objectName: string;
	chapterId: string;
	chapterIndex: number;
}

export interface UploadedChapterBatch {
	kind: "batch";
	bucket: string;
	objectName: string;
	batchIndex: number;
	chapters: UploadedChapterRef[];
}

export type UploadedChapterObject = UploadedChapterBatch | UploadedSingleChapter;

export interface PersistChapterResult {
	uploadedObjects: UploadedChapterObject[];
}

export abstract class ChapterStoragePort {
	public abstract persistChapter(payload: ChapterPayload): Promise<PersistChapterResult>;

	public abstract flush(): Promise<UploadedChapterBatch | null>;

	public abstract getTotalUploadedBytes(): number;
}
