import {
	UnpackBookHandler,
	VectorizeChapterHandler,
	VectorizeChapterBatchHandler,
} from "@/modules/worker/application/commands/handlers";
import { EventFactoryPort } from "@/modules/worker/application/ports/event.factory.port";
import { BookCoverStorageService } from "@/modules/worker/application/services/book-cover-storage.service";
import { BookVectorizationProgressService } from "@/modules/worker/application/services/book-vectorization-progress.service";
import { ChapterVectorizationService } from "@/modules/worker/application/services/chapter-vectorization.service";
import { BookVectorizationProgressRepositoryPort } from "@/modules/worker/domain/ports/book-vectorization-progress.repository.port";
import { ChapterStorageFactoryPort } from "@/modules/worker/domain/ports/chapter-storage-factory.port";
import { ChapterVectorStorePort } from "@/modules/worker/domain/ports/chapter-vector-store.port";
import { EpubChapterReaderPort } from "@/modules/worker/domain/ports/epub-chapter-reader.port";
import { HtmlChunkingPort } from "@/modules/worker/domain/ports/html-chunking.port";
import { ObjectStoragePort } from "@/modules/worker/domain/ports/object-storage.port";
import { ChapterBatchPolicy } from "@/modules/worker/domain/services/chapter-batch-policy";
import { ObjectKeyFactory } from "@/modules/worker/domain/services/object-key-factory";
import { LangchainHtmlChunkingAdapter } from "@/modules/worker/infrastructure/adapters/langchain-html-chunking.adapter";
import { MinioObjectStorageAdapter } from "@/modules/worker/infrastructure/adapters/minio-object-storage.adapter";
import { QdrantChapterVectorStoreAdapter } from "@/modules/worker/infrastructure/adapters/qdrant-chapter-vector-store.adapter";
import { ChapterDescriptorBuilder } from "@/modules/worker/infrastructure/epub/parsers/chapter-descriptor-builder";
import { ChapterHtmlSlicer } from "@/modules/worker/infrastructure/epub/parsers/chapter-html-slicer";
import { EpubArchiveParser } from "@/modules/worker/infrastructure/epub/parsers/epub-archive-parser";
import { EpubChapterReadSessionFactory } from "@/modules/worker/infrastructure/epub/pipeline/epub-chapter-read-session.factory";
import { BoundedSourceHtmlCache } from "@/modules/worker/infrastructure/epub/pipeline/bounded-source-html-cache";
import { LeanChapterContentExtractor } from "@/modules/worker/infrastructure/epub/pipeline/lean-chapter-content-extractor";
import { LeanChapterTitleResolver } from "@/modules/worker/infrastructure/epub/pipeline/lean-chapter-title-resolver";
import { EpubBookMetadataResolver } from "@/modules/worker/infrastructure/epub/resolvers/epub-book-metadata.resolver";
import { EpubCoverReferenceResolver } from "@/modules/worker/infrastructure/epub/resolvers/epub-cover-reference.resolver";
import { EpubCoverService } from "@/modules/worker/infrastructure/epub/services/epub-cover.service";
import { EpubReadPreparationService } from "@/modules/worker/infrastructure/epub/services/epub-read-preparation.service";
import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";
import { EpubTextUtils } from "@/modules/worker/infrastructure/epub/utils/epub-text-utils";
import { TocTitleScorer } from "@/modules/worker/infrastructure/epub/utils/toc-title-scorer";
import { YauzlZipOpener } from "@/modules/worker/infrastructure/epub/zip/yauzl-zip-opener";
import { ZipEntryIndexer } from "@/modules/worker/infrastructure/epub/zip/zip-entry-indexer";
import { ZipEntryReader } from "@/modules/worker/infrastructure/epub/zip/zip-entry-reader";
import { EventFactory } from "@/modules/worker/infrastructure/factories/event.factory";
import { MinioEpubChapterReader } from "@/modules/worker/infrastructure/minio/readers/minio-epub-chapter-reader";
import { MinioZipSourceService } from "@/modules/worker/infrastructure/minio/services/minio-zip-source.service";
import { MinioChapterStorageFactory } from "@/modules/worker/infrastructure/minio/storage/minio-chapter-storage.factory";
import { PrismaBookVectorizationProgressRepository } from "@/modules/worker/infrastructure/persistence/prisma-book-vectorization-progress.repository";
import { BookUnpackerConsumer } from "@/modules/worker/presentation/consumers/book-unpacker.consumer";
import { ChapterVectorizerConsumer } from "@/modules/worker/presentation/consumers/chapter-vectorizer.consumer";

const EPUB_PROVIDERS = [
	EpubPathUtils,
	EpubTextUtils,
	TocTitleScorer,
	ZipEntryReader,
	ZipEntryIndexer,
	YauzlZipOpener,
	EpubArchiveParser,
	ChapterDescriptorBuilder,
	ChapterHtmlSlicer,
	BoundedSourceHtmlCache,
	LeanChapterContentExtractor,
	LeanChapterTitleResolver,
	EpubBookMetadataResolver,
	EpubCoverReferenceResolver,
	EpubCoverService,
	EpubReadPreparationService,
	EpubChapterReadSessionFactory,
];

const MINIO_PROVIDERS = [MinioZipSourceService, MinioEpubChapterReader, MinioChapterStorageFactory];

const PORT_PROVIDERS = [
	{
		provide: EpubChapterReaderPort,
		useExisting: MinioEpubChapterReader,
	},
	{
		provide: ChapterStorageFactoryPort,
		useExisting: MinioChapterStorageFactory,
	},
	{
		provide: EventFactoryPort,
		useClass: EventFactory,
	},
	{
		provide: HtmlChunkingPort,
		useClass: LangchainHtmlChunkingAdapter,
	},
	{
		provide: ObjectStoragePort,
		useClass: MinioObjectStorageAdapter,
	},
	{
		provide: ChapterVectorStorePort,
		useClass: QdrantChapterVectorStoreAdapter,
	},
	{
		provide: BookVectorizationProgressRepositoryPort,
		useClass: PrismaBookVectorizationProgressRepository,
	},
];

export const WORKER_CONTROLLERS = [BookUnpackerConsumer, ChapterVectorizerConsumer];

export const WORKER_PROVIDERS = [
	UnpackBookHandler,
	VectorizeChapterHandler,
	VectorizeChapterBatchHandler,
	BookCoverStorageService,
	BookVectorizationProgressService,
	ChapterVectorizationService,
	ChapterBatchPolicy,
	ObjectKeyFactory,
	...EPUB_PROVIDERS,
	...MINIO_PROVIDERS,
	...PORT_PROVIDERS,
];
