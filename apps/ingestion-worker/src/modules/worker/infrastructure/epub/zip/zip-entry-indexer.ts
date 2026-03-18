import { Inject, Injectable } from "@nestjs/common";

import type * as yauzl from "yauzl";
import type { IndexedZipEntries } from "@/modules/worker/infrastructure/epub/types";

import { EpubPathUtils } from "@/modules/worker/infrastructure/epub/utils/epub-path-utils";

@Injectable()
export class ZipEntryIndexer {
	public constructor(
		@Inject(EpubPathUtils)
		private readonly pathUtils: EpubPathUtils,
	) {}

	public async index(zipfile: yauzl.ZipFile): Promise<IndexedZipEntries> {
		return new Promise((resolve, reject) => {
			const entryByName = new Map<string, yauzl.Entry>();
			const entryByLowerName = new Map<string, yauzl.Entry>();

			const onEntry = (entry: yauzl.Entry): void => {
				const normalizedName = this.pathUtils.normalizeArchivePath(entry.fileName);

				entryByName.set(normalizedName, entry);
				entryByLowerName.set(normalizedName.toLowerCase(), entry);

				zipfile.readEntry();
			};

			const onEnd = (): void => {
				cleanup();
				resolve({ entryByName, entryByLowerName });
			};

			const onError = (error: Error): void => {
				cleanup();
				reject(error);
			};

			function cleanup(): void {
				zipfile.off("entry", onEntry);
				zipfile.off("end", onEnd);
				zipfile.off("error", onError);
			}

			zipfile.on("entry", onEntry);
			zipfile.once("end", onEnd);
			zipfile.once("error", onError);
			zipfile.readEntry();
		});
	}
}
