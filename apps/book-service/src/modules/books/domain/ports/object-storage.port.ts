export interface PresignedUrlResult {
	bucket: string;
	objectKey: string;
	url: string;
	method: "GET" | "PUT";
	expiresAt: string;
}

export interface PresignedUrlGetResult extends PresignedUrlResult {
	method: "GET";
}

export interface PresignedUrlPutResult extends PresignedUrlResult {
	method: "PUT";
}

export interface ObjectStat {
	size: number;
	etag?: string;
	lastModified?: Date;
	contentType?: string;
	metadata?: Record<string, string>;
}

export abstract class ObjectStoragePort {
	public abstract defaultBucket(): string;

	public abstract getObjectJson(params: { bucket: string; objectName: string }): Promise<unknown>;

	public abstract getObject(params: {
		bucket: string;
		objectName: string;
	}): Promise<NodeJS.ReadableStream>;

	public abstract presignPut(params: {
		bucket: string;
		objectKey: string;
		expiresSeconds: number;
	}): Promise<PresignedUrlPutResult>;

	public abstract presignGet(params: {
		bucket: string;
		objectKey: string;
		expiresSeconds: number;
	}): Promise<PresignedUrlGetResult>;

	public abstract remove(params: { bucket: string; objectKey: string }): Promise<void>;

	public abstract stat(params: { bucket: string; objectKey: string }): Promise<ObjectStat>;

	public abstract statOrNull(params: {
		bucket: string;
		objectKey: string;
	}): Promise<ObjectStat | null>;
}
