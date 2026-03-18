import { Inject, Injectable, Scope } from "@nestjs/common";

import type { ParsedArchive } from "@/modules/worker/infrastructure/epub/types";

import { ZipEntryReader } from "@/modules/worker/infrastructure/epub/zip/zip-entry-reader";

@Injectable({ scope: Scope.TRANSIENT })
export class BoundedSourceHtmlCache {
	private readonly cache = new Map<string, string>();

	private readonly maxEntries = 64;

	public constructor(
		@Inject(ZipEntryReader)
		private readonly zipEntryReader: ZipEntryReader,
	) {}

	public async get(parsedArchive: ParsedArchive, sourceId: string): Promise<string> {
		const cached = this.cache.get(sourceId);

		if (cached) {
			this.touch(sourceId, cached);
			return cached;
		}

		const manifestItem = parsedArchive.manifestById.get(sourceId);

		if (!manifestItem) {
			throw new Error(`Chapter not found: ${sourceId}`);
		}

		const html = await this.zipEntryReader.readTextEntry(
			parsedArchive.zipfile,
			parsedArchive.indexedEntries,
			manifestItem.href,
		);

		this.put(sourceId, html);

		return html;
	}

	public getUniqueSourcesCount(): number {
		return this.cache.size;
	}

	private put(key: string, value: string): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}

		this.cache.set(key, value);

		while (this.cache.size > this.maxEntries) {
			const oldestKey = this.cache.keys().next().value;

			if (typeof oldestKey !== "string") {
				break;
			}

			this.cache.delete(oldestKey);
		}
	}

	private touch(key: string, value: string): void {
		this.cache.delete(key);
		this.cache.set(key, value);
	}
}
