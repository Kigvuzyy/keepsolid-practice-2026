import path from "node:path";

import { Injectable } from "@nestjs/common";

@Injectable()
export class EpubPathUtils {
	public normalizeArchivePath(value: string): string {
		return path.posix.normalize(value.replaceAll("\\", "/").trim()).replace(/^\/+/, "");
	}

	public normalizeHref(href: string): string {
		const withoutHash = href.split("#").at(0);
		return this.normalizeArchivePath(withoutHash ?? href);
	}

	public normalizeTocTarget(href: string): string {
		const raw = href.trim();

		if (!raw) {
			return "";
		}

		const { hrefWithoutFragment, fragment } = this.splitHrefAndFragment(raw);
		const normalizedHref = this.normalizeArchivePath(hrefWithoutFragment);

		if (!fragment) {
			return normalizedHref;
		}

		return `${normalizedHref}#${fragment}`;
	}

	public extractHrefFragment(href: string): string | null {
		const { fragment } = this.splitHrefAndFragment(href);
		return fragment;
	}

	public splitHrefAndFragment(href: string): {
		hrefWithoutFragment: string;
		fragment: string | null;
	} {
		const hashIndex = href.indexOf("#");

		if (hashIndex < 0) {
			return {
				hrefWithoutFragment: href,
				fragment: null,
			};
		}

		const hrefWithoutFragment = href.slice(0, hashIndex);
		const rawFragment = href.slice(hashIndex + 1).trim();

		if (!rawFragment) {
			return {
				hrefWithoutFragment,
				fragment: null,
			};
		}

		const decodedFragment = this.tryDecodeUriComponent(rawFragment) ?? rawFragment;

		return {
			hrefWithoutFragment,
			fragment: decodedFragment,
		};
	}

	public resolveHref(baseFilePath: string, href: string): string {
		const cleanHref = href.trim();

		if (!cleanHref) {
			return "";
		}

		if (/^[a-z][a-z\d+\-.]*:/i.test(cleanHref)) {
			return this.normalizeArchivePath(cleanHref);
		}

		if (cleanHref.startsWith("/")) {
			return this.normalizeArchivePath(cleanHref.slice(1));
		}

		const baseDir = path.posix.dirname(baseFilePath);
		return this.normalizeArchivePath(path.posix.join(baseDir, cleanHref));
	}

	public tryDecodeUriComponent(value: string): string | null {
		try {
			return decodeURIComponent(value);
		} catch {
			return null;
		}
	}

	public escapeRegExp(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	public extractSourceEpubName(objectName: string): string {
		const normalized = objectName.replaceAll("\\", "/");
		const basename = normalized.split("/").pop();
		return basename && basename.length > 0 ? basename : objectName;
	}
}
