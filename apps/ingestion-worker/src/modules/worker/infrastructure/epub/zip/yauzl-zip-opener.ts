import * as yauzl from "yauzl";
import { Injectable } from "@nestjs/common";

import type { Buffer } from "node:buffer";

@Injectable()
export class YauzlZipOpener {
	public async openFromRandomAccessReader(
		reader: yauzl.RandomAccessReader,
		size: number,
	): Promise<yauzl.ZipFile> {
		return new Promise((resolve, reject) => {
			yauzl.fromRandomAccessReader(
				reader,
				size,
				{ autoClose: false, lazyEntries: true },
				(error, zipfile) => {
					if (error || !zipfile) {
						reject(error ?? new Error("Failed to open zip from random access reader"));
						return;
					}

					resolve(zipfile);
				},
			);
		});
	}

	public async openFromBuffer(buffer: Buffer): Promise<yauzl.ZipFile> {
		return new Promise((resolve, reject) => {
			yauzl.fromBuffer(buffer, { autoClose: false, lazyEntries: true }, (error, zipfile) => {
				if (error || !zipfile) {
					reject(error ?? new Error("Failed to open zip from buffer"));
					return;
				}

				resolve(zipfile);
			});
		});
	}
}
