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
	isPaywalled: boolean;
}

// Params that are purely tracking/analytics and safe to strip
const TRACKING_PARAMS = new Set([
	'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
	'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
	'mc_cid', 'mc_eid', 'mkt_tok',
	'_ga', '_gl', '_hsenc', '_hsmi',
	'igshid', 'msclkid', 'twclid',
]);

export function cleanUrl(rawUrl: string): string {
	const u = new URL(rawUrl);
	u.hash = '';
	for (const key of [...u.searchParams.keys()]) {
		if (TRACKING_PARAMS.has(key) || key.startsWith('utm_')) {
			u.searchParams.delete(key);
		}
	}
	return u.toString();
}

function detectPaywall(doc: Document, article: { textContent?: string } | null): boolean {
	// Standard structured-data signals
	const contentTier = doc.querySelector('meta[property="og:article:content_tier"]')?.getAttribute('content');
	if (contentTier === 'metered' || contentTier === 'locked') return true;

	for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const data = JSON.parse(script.textContent ?? '');
			const accessible = data.isAccessibleForFree ?? data['isAccessibleForFree'];
			if (accessible === false || accessible === 'False') return true;
		} catch { /* ignore */ }
	}

	// DOM-based signals — paywall containers
	if (doc.querySelector([
		'[class*="paywall"]',
		'[id*="paywall"]',
		'[class*="subscriber-only"]',
		'[class*="premium-content"]',
		'[class*="paid-content"]',
		'[data-testid*="paywall"]',
	].join(','))) return true;

	// Very short extracted text strongly suggests truncation
	const wordCount = (article?.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
	if (wordCount > 0 && wordCount < 80) {
		// Only flag as paywalled if there are also subscription-hint keywords visible
		const bodyText = doc.body?.textContent?.toLowerCase() ?? '';
		if (/subscribe|subscription|sign in to read|member.{0,20}only|unlock|premium/.test(bodyText)) {
			return true;
		}
	}

	return false;
}

function estimateReadingTime(text: string): number {
	const words = text.trim().split(/\s+/).length;
	return Math.max(1, Math.round(words / 238));
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

	const reader = new Readability(doc.cloneNode(true) as Document);
	const article = reader.parse();

	const isPaywalled = detectPaywall(doc, article);

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
		readingTimeMinutes,
		isPaywalled,
	};
}
