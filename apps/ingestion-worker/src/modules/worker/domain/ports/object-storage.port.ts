import type { Buffer } from "node:buffer";

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

	public abstract stat(params: { bucket: string; objectKey: string }): Promise<ObjectStat>;

	public abstract getObject(params: {
		bucket: string;
		objectName: string;
	}): Promise<NodeJS.ReadableStream>;

	public abstract getPartialObject(params: {
		bucket: string;
		objectName: string;
		offset: number;
		length: number;
	}): Promise<NodeJS.ReadableStream>;

	public abstract putObject(params: {
		bucket: string;
		objectName: string;
		data: Buffer | NodeJS.ReadableStream | string;
		size?: number;
		metaData?: Record<string, string>;
	}): Promise<unknown>;
}
