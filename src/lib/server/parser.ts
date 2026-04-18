import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ParsedArticle {
	title: string;
	description: string | null;
	content: string | null;
	author: string | null;
	siteName: string | null;
	favicon: string | null;
	coverImage: string | null;
	readingTimeMinutes: number;
}

export function estimateReadingTime(text: string): number {
	const words = text.trim().split(/\s+/).length;
	return Math.max(1, Math.round(words / 238));
}

export function sanitizeEmailHtml(html: string): string {
	const dom = new JSDOM(html);
	const doc = dom.window.document;
	doc.querySelectorAll('script, style, link[rel="stylesheet"], base').forEach(el => el.remove());
	doc.querySelectorAll('*').forEach(el => {
		for (const attr of [...el.attributes]) {
			if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
		}
	});
	doc.querySelectorAll('img').forEach(img => {
		const w = parseInt(img.getAttribute('width') ?? '999');
		const h = parseInt(img.getAttribute('height') ?? '999');
		if (w <= 1 || h <= 1) img.remove();
	});
	return doc.body?.innerHTML ?? '';
}

export async function parseArticle(url: string): Promise<ParsedArticle> {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (compatible; Someday/1.0; +https://someday.app)'
		},
		signal: AbortSignal.timeout(15000)
	});

	if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

	const html = await response.text();
	const dom = new JSDOM(html, { url });
	const doc = dom.window.document;

	const reader = new Readability(doc);
	const article = reader.parse();

	const title =
		article?.title ||
		doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
		doc.querySelector('title')?.textContent ||
		new URL(url).hostname;

	const description =
		article?.excerpt ||
		doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
		doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
		null;

	const coverImage =
		doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;

	const siteName =
		article?.siteName ||
		doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
		new URL(url).hostname.replace(/^www\./, '');

	const origin = new URL(url).origin;
	const faviconEl =
		doc.querySelector('link[rel="apple-touch-icon"]') ||
		doc.querySelector('link[rel="icon"][sizes="32x32"]') ||
		doc.querySelector('link[rel="shortcut icon"]') ||
		doc.querySelector('link[rel="icon"]');

	let favicon = faviconEl?.getAttribute('href') || null;
	if (favicon && !favicon.startsWith('http')) {
		favicon = new URL(favicon, origin).toString();
	}
	if (!favicon) {
		favicon = `${origin}/favicon.ico`;
	}

	const content = article?.content ?? null;
	const textContent = article?.textContent ?? '';
	const readingTimeMinutes = estimateReadingTime(textContent);

	return {
		title: title.trim(),
		description,
		content,
		author: article?.byline ?? null,
		siteName,
		favicon,
		coverImage,
		readingTimeMinutes
	};
}
