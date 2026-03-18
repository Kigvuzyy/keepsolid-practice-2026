import { Injectable } from "@nestjs/common";

@Injectable()
export class EpubTextUtils {
	public normalizeText(text: string): string {
		return text
			.replace(/\u00A0/g, " ")
			.replace(/\r\n?/g, "\n")
			.replace(/[ \t\f\v]+/g, " ")
			.replace(/ *\n */g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
	}

	public normalizeFlatText(value: string): string {
		return value.replace(/\s+/g, " ").trim();
	}

	public isLikelyXhtml(markup: string): boolean {
		const head = markup.slice(0, 512).toLowerCase();
		if (head.includes("<?xml")) {
			return true;
		}

		return /<html[^>]+xmlns\s*=\s*["']http:\/\/www\.w3\.org\/1999\/xhtml["']/i.test(markup);
	}
}
