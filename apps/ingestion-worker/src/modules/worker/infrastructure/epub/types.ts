import type * as yauzl from "yauzl";

export interface ChapterDescriptor {
	id: string;
	sourceId: string;
	sourceHref: string;
	startAnchor: string | null;
	endAnchor: string | null;
	title: string;
}

export interface EpubManifestItem {
	id: string;
	href: string;
	mediaType: string | null;
	properties: string | null;
}

export interface EpubFlowItem {
	id: string;
	href: string;
	mediaType?: string;
	"media-type"?: string;
}

export interface EpubTocItem {
	id?: string;
	href?: string;
	title?: string;
}

export interface IndexedZipEntries {
	entryByName: Map<string, yauzl.Entry>;
	entryByLowerName: Map<string, yauzl.Entry>;
}

export interface EpubMetadata {
	title?: string;
	creator?: string;
	cover?: string;
}

export interface ParsedArchive {
	zipfile: yauzl.ZipFile;
	indexedEntries: IndexedZipEntries;
	manifestById: Map<string, EpubManifestItem>;
	manifestByHref: Map<string, EpubManifestItem>;
	metadata: EpubMetadata;
	flow: EpubFlowItem[];
	toc: EpubTocItem[];
	rootFilePath: string;
	spineTocId: string | null;
}

export interface OpenedZipSource {
	zipfile: yauzl.ZipFile;
	archiveSize: number;
	readMode: "buffer" | "random-access";
	downloadMs?: number;
}

export interface ParseMetadataResult {
	metadata: EpubMetadata;
	coverByMeta: string | null;
}
