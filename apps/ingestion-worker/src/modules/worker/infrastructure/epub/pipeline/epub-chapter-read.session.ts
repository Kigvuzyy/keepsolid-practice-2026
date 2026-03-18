import { Logger } from "@nestjs/common";

import type { ChapterDescriptor, ParsedArchive } from "@/modules/worker/infrastructure/epub/types";
import type { EpubCoverService } from "@/modules/worker/infrastructure/epub/services/epub-cover.service";
import type { ChapterHtmlSlicer } from "@/modules/worker/infrastructure/epub/parsers/chapter-html-slicer";
import type { BoundedSourceHtmlCache } from "@/modules/worker/infrastructure/epub/pipeline/bounded-source-html-cache";
import type { LeanChapterTitleResolver } from "@/modules/worker/infrastructure/epub/pipeline/lean-chapter-title-resolver";
import type {
	LeanChapterContent,
	LeanChapterContentExtractor,
} from "@/modules/worker/infrastructure/epub/pipeline/lean-chapter-content-extractor";
import type {
	BookCoverAsset,
	ParsedChapterItem,
	EpubChapterReadSessionPort,
	ReaderContext,
} from "@/modules/worker/domain/ports/epub-chapter-reader.port";

export class EpubChapterReadSession implements EpubChapterReadSessionPort {
	private readonly logger = new Logger(EpubChapterReadSession.name);

	private coverInjected = false;

	public constructor(
		private readonly params: {
			context: ReaderContext;
			parsedArchive: ParsedArchive;
			chapterDescriptors: ChapterDescriptor[];
			coverAsset: BookCoverAsset | null;
		},

		private readonly coverService: EpubCoverService,
		private readonly chapterHtmlSlicer: ChapterHtmlSlicer,
		private readonly sourceHtmlCache: BoundedSourceHtmlCache,
		private readonly contentExtractor: LeanChapterContentExtractor,
		private readonly chapterTitleResolver: LeanChapterTitleResolver,
	) {}

	public async *extractChapters(): AsyncGenerator<ParsedChapterItem, void, undefined> {
		for (const [chapterIndex, descriptor] of this.params.chapterDescriptors.entries()) {
			try {
				const sourceHtml = await this.sourceHtmlCache.get(
					this.params.parsedArchive,
					descriptor.sourceId,
				);

				const slicedHtml = this.chapterHtmlSlicer.sliceByAnchors(
					sourceHtml,
					descriptor.startAnchor,
					descriptor.endAnchor,
				);

				let content = this.contentExtractor.extract(slicedHtml);

				if (
					this.coverService.shouldInjectCover(
						this.coverInjected,
						this.params.context.coverImageDataUrl,
					)
				) {
					content = this.injectCover(content, this.params.context.coverImageDataUrl);
					this.coverInjected = true;
				}

				const chapterTitle = this.chapterTitleResolver.resolve(
					descriptor.title,
					chapterIndex + 1,
					content.titleHint,
				);

				yield {
					chapterId: descriptor.id,
					chapterTitle,
					chapterIndex: chapterIndex + 1,
					html: content.html,
					plainTextChars: content.plainText.length,
					isAnchored: Boolean(descriptor.startAnchor ?? descriptor.endAnchor),
				};
			} catch (error: unknown) {
				this.logger.warn(
					`[warn] Chapter "${descriptor.id}" skipped: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
	}

	public getCoverAsset(): BookCoverAsset | null {
		return this.params.coverAsset;
	}

	public close(): void {
		this.params.parsedArchive.zipfile.close();
	}

	public getContext(): ReaderContext {
		return this.params.context;
	}

	private injectCover(
		content: LeanChapterContent,
		coverImageDataUrl: string,
	): LeanChapterContent {
		const coverHtml = this.coverService.buildCoverHtml(coverImageDataUrl);

		return {
			html: `${coverHtml}${content.html}`,
			plainText: content.plainText,
			titleHint: content.titleHint,
		};
	}
}
