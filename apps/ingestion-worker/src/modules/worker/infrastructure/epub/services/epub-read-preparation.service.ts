import { Inject, Injectable, Logger } from "@nestjs/common";

import type {
	ChapterDescriptor,
	OpenedZipSource,
	ParsedArchive,
} from "@/modules/worker/infrastructure/epub/types";
import type {
	BookCoverAsset,
	ReaderContext,
} from "@/modules/worker/domain/ports/epub-chapter-reader.port";

import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";
import { ZipEntryIndexer } from "@/modules/worker/infrastructure/epub/zip/zip-entry-indexer";
import { EpubCoverService } from "@/modules/worker/infrastructure/epub/services/epub-cover.service";
import { EpubArchiveParser } from "@/modules/worker/infrastructure/epub/parsers/epub-archive-parser";
import { ChapterDescriptorBuilder } from "@/modules/worker/infrastructure/epub/parsers/chapter-descriptor-builder";
import { EpubBookMetadataResolver } from "@/modules/worker/infrastructure/epub/resolvers/epub-book-metadata.resolver";

export interface PreparedEpubReadSession {
	context: ReaderContext;
	parsedArchive: ParsedArchive;
	chapterDescriptors: ChapterDescriptor[];
	coverAsset: BookCoverAsset | null;
}

@Injectable()
export class EpubReadPreparationService {
	private readonly logger = new Logger(EpubReadPreparationService.name);

	public constructor(
		@Inject(ZipEntryIndexer)
		private readonly zipEntryIndexer: ZipEntryIndexer,

		@Inject(EpubArchiveParser)
		private readonly archiveParser: EpubArchiveParser,

		@Inject(ChapterDescriptorBuilder)
		private readonly descriptorBuilder: ChapterDescriptorBuilder,

		@Inject(EpubBookMetadataResolver)
		private readonly metadataResolver: EpubBookMetadataResolver,

		@Inject(EpubCoverService)
		private readonly coverService: EpubCoverService,

		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,
	) {}

	public async prepare(input: {
		sourceBucket: string;
		sourceObjectName: string;
		openedZip: OpenedZipSource;
	}): Promise<PreparedEpubReadSession> {
		const sourceEpub = this.pathUtils.extractSourceEpubName(input.sourceObjectName);

		const indexZipStartedAt = performance.now();
		const indexedEntries = await this.zipEntryIndexer.index(input.openedZip.zipfile);
		const indexZipMs = performance.now() - indexZipStartedAt;

		const parseArchiveStartedAt = performance.now();
		const parsedArchive = await this.archiveParser.parse(
			input.openedZip.zipfile,
			indexedEntries,
		);
		const parseArchiveMs = performance.now() - parseArchiveStartedAt;

		const buildDescriptorsStartedAt = performance.now();
		const chapterDescriptors = this.descriptorBuilder.build(parsedArchive);
		const buildDescriptorsMs = performance.now() - buildDescriptorsStartedAt;

		const bookTitle = this.metadataResolver.resolveBookTitle(parsedArchive, sourceEpub);
		const author = this.metadataResolver.resolveBookAuthor(parsedArchive);
		const cover = await this.loadCover(parsedArchive);

		const context: ReaderContext = {
			sourceBucket: input.sourceBucket,
			sourceObjectName: input.sourceObjectName,
			sourceEpub,
			objectSize: input.openedZip.archiveSize,
			readMode: input.openedZip.readMode,
			bookTitle,
			author,
			coverImageDataUrl: cover.dataUrl,
			chaptersInEpub: chapterDescriptors.length,
			phasesMs: {
				indexZip: indexZipMs,
				parseArchive: parseArchiveMs,
				buildDescriptors: buildDescriptorsMs,
				loadCover: cover.loadMs,
			},
		};

		if (typeof input.openedZip.downloadMs === "number") {
			context.downloadMs = input.openedZip.downloadMs;
		}

		return {
			context,
			parsedArchive,
			chapterDescriptors,
			coverAsset: cover.asset,
		};
	}

	private async loadCover(parsedArchive: ParsedArchive): Promise<{
		dataUrl: string | null;
		asset: BookCoverAsset | null;
		loadMs: number;
	}> {
		const coverId = this.metadataResolver.resolveCoverId(parsedArchive);

		if (!coverId) {
			return {
				dataUrl: null,
				asset: null,
				loadMs: 0,
			};
		}

		const coverStartedAt = performance.now();

		try {
			const asset = await this.coverService.getCoverAsset(parsedArchive, coverId);

			return {
				dataUrl: asset ? this.coverService.toDataUrl(asset) : null,
				asset,
				loadMs: performance.now() - coverStartedAt,
			};
		} catch (error: unknown) {
			this.logger.warn(
				`Cover image "${coverId}" was not loaded: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);

			return {
				dataUrl: null,
				asset: null,
				loadMs: performance.now() - coverStartedAt,
			};
		}
	}
}
