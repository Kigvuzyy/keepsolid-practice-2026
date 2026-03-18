import path from "node:path";

import { Injectable, Inject } from "@nestjs/common";

import type { BookCoverAsset } from "@/modules/worker/domain/ports/epub-chapter-reader.port";
import type { EpubManifestItem, ParsedArchive } from "@/modules/worker/infrastructure/epub/types";

import { ZipEntryReader } from "@/modules/worker/infrastructure/epub/zip/zip-entry-reader";

@Injectable()
export class EpubCoverService {
	public constructor(
		@Inject(ZipEntryReader)
		private readonly zipEntryReader: ZipEntryReader,
	) {}

	public async getCoverAsset(
		parsedArchive: ParsedArchive,
		imageId: string,
	): Promise<BookCoverAsset | null> {
		const manifestItem = parsedArchive.manifestById.get(imageId);

		if (!manifestItem) {
			throw new Error(`Image not found: ${imageId}`);
		}

		if (!manifestItem.mediaType?.startsWith("image/")) {
			return null;
		}

		const bytes = await this.zipEntryReader.readBinaryEntry(
			parsedArchive.zipfile,
			parsedArchive.indexedEntries,
			manifestItem.href,
		);

		return {
			bytes,
			mediaType: manifestItem.mediaType,
			fileExtension: this.resolveFileExtension(manifestItem),
		};
	}

	public async getCoverDataUrl(
		parsedArchive: ParsedArchive,
		imageId: string,
	): Promise<string | null> {
		const coverAsset = await this.getCoverAsset(parsedArchive, imageId);

		return coverAsset ? this.toDataUrl(coverAsset) : null;
	}

	public toDataUrl(coverAsset: BookCoverAsset): string {
		return `data:${coverAsset.mediaType};base64,${coverAsset.bytes.toString("base64")}`;
	}

	public buildCoverHtml(coverImageDataUrl: string): string {
		return `<figure><img src="${coverImageDataUrl}" alt="Book cover" loading="eager" decoding="async"/></figure>`;
	}

	public shouldInjectCover(
		coverInjected: boolean,
		coverImageDataUrl: string | null,
	): coverImageDataUrl is string {
		return Boolean(coverImageDataUrl && !coverInjected);
	}

	private resolveFileExtension(manifestItem: EpubManifestItem): string {
		const hrefExtension = path.posix
			.extname(manifestItem.href)
			.replace(/^\./, "")
			.toLowerCase();

		if (/^[a-z0-9]+$/.test(hrefExtension)) {
			return hrefExtension;
		}

		return this.resolveMediaTypeFileExtension(manifestItem.mediaType) ?? "bin";
	}

	private resolveMediaTypeFileExtension(mediaType: string | null): string | null {
		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		switch (mediaType) {
			case "image/jpeg": {
				return "jpg";
			}

			case "image/png": {
				return "png";
			}

			case "image/webp": {
				return "webp";
			}

			case "image/gif": {
				return "gif";
			}

			case "image/svg+xml": {
				return "svg";
			}

			case "image/avif": {
				return "avif";
			}

			default: {
				return null;
			}
		}
	}
}
