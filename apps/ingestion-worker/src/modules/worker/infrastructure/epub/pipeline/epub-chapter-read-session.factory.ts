import { Inject, Injectable } from "@nestjs/common";

import type { ChapterDescriptor, ParsedArchive } from "@/modules/worker/infrastructure/epub/types";
import type {
	BookCoverAsset,
	EpubChapterReadSessionPort,
	ReaderContext,
} from "@/modules/worker/domain/ports/epub-chapter-reader.port";

import { EpubCoverService } from "@/modules/worker/infrastructure/epub/services/epub-cover.service";
import { ChapterHtmlSlicer } from "@/modules/worker/infrastructure/epub/parsers/chapter-html-slicer";
import { BoundedSourceHtmlCache } from "@/modules/worker/infrastructure/epub/pipeline/bounded-source-html-cache";
import { LeanChapterContentExtractor } from "@/modules/worker/infrastructure/epub/pipeline/lean-chapter-content-extractor";
import { LeanChapterTitleResolver } from "@/modules/worker/infrastructure/epub/pipeline/lean-chapter-title-resolver";
import { EpubChapterReadSession } from "@/modules/worker/infrastructure/epub/pipeline/epub-chapter-read.session";

@Injectable()
export class EpubChapterReadSessionFactory {
	public constructor(
		@Inject(EpubCoverService)
		private readonly coverService: EpubCoverService,

		@Inject(ChapterHtmlSlicer)
		private readonly chapterHtmlSlicer: ChapterHtmlSlicer,

		@Inject(BoundedSourceHtmlCache)
		private readonly sourceHtmlCache: BoundedSourceHtmlCache,

		@Inject(LeanChapterContentExtractor)
		private readonly contentExtractor: LeanChapterContentExtractor,

		@Inject(LeanChapterTitleResolver)
		private readonly chapterTitleResolver: LeanChapterTitleResolver,
	) {}

	public create(params: {
		context: ReaderContext;
		parsedArchive: ParsedArchive;
		chapterDescriptors: ChapterDescriptor[];
		coverAsset: BookCoverAsset | null;
	}): EpubChapterReadSessionPort {
		return new EpubChapterReadSession(
			{
				context: params.context,
				parsedArchive: params.parsedArchive,
				chapterDescriptors: params.chapterDescriptors,
				coverAsset: params.coverAsset,
			},
			this.coverService,
			this.chapterHtmlSlicer,
			this.sourceHtmlCache,
			this.contentExtractor,
			this.chapterTitleResolver,
		);
	}
}
