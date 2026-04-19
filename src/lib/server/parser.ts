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
	source: string | null;
}

// Only strip known tracking/analytics params — leave everything else intact
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
	// Remove 1×1 tracking pixels
	doc.querySelectorAll('img').forEach(img => {
		const w = parseInt(img.getAttribute('width') ?? '999');
		const h = parseInt(img.getAttribute('height') ?? '999');
		if (w <= 1 || h <= 1) img.remove();
	});
	return doc.body?.innerHTML ?? '';
}

function detectPaywall(doc: Document, article: { textContent?: string | null } | null): boolean {
	const contentTier = doc.querySelector('meta[property="og:article:content_tier"]')?.getAttribute('content');
	if (contentTier === 'metered' || contentTier === 'locked') return true;

	for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const data = JSON.parse(script.textContent ?? '');
			const accessible = data.isAccessibleForFree ?? data['isAccessibleForFree'];
			if (accessible === false || accessible === 'False') return true;
		} catch { /* ignore */ }
	}

	if (doc.querySelector([
		'[class*="paywall"]', '[id*="paywall"]',
		'[class*="subscriber-only"]', '[class*="premium-content"]',
		'[class*="paid-content"]', '[data-testid*="paywall"]',
	].join(','))) return true;

	const wordCount = (article?.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
	if (wordCount > 0 && wordCount < 80) {
		const bodyText = doc.body?.textContent?.toLowerCase() ?? '';
		if (/subscribe|subscription|sign in to read|member.{0,20}only|unlock|premium/.test(bodyText)) return true;
	}

	return false;
}

function detectProduct(doc: Document, url: string): boolean {
	// Structured data: Product type
	for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const data = JSON.parse(script.textContent ?? '');
			const types: string[] = Array.isArray(data)
				? data.map((d: { '@type'?: string }) => d['@type'] ?? '')
				: [data['@type'] ?? '', ...(data['@graph']?.map((d: { '@type'?: string }) => d['@type'] ?? '') ?? [])];
			if (types.some(t => /^Product$/i.test(t))) return true;
		} catch { /* ignore */ }
	}

	// og:type = "product"
	const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content') ?? '';
	if (ogType === 'product') return true;

	// Common product page DOM signals
	if (doc.querySelector([
		'[class*="add-to-cart"]', '[id*="add-to-cart"]',
		'button[name="add"]',                             // Shopify
		'[data-testid*="add-to-cart"]',
		'[class*="product-price"]', '[class*="product_price"]',
		'[itemprop="price"]', '[itemprop="offers"]',
		'.product-form', '#product-form',
	].join(','))) return true;

	// URL pattern heuristics
	const { hostname, pathname } = new URL(url);
	// Amazon
	if (/amazon\.[a-z.]+$/i.test(hostname) && /\/dp\/|\/gp\/product\//.test(pathname)) return true;
	// Shopify / common e-commerce URL patterns
	if (/\/products\/[^/]+$/.test(pathname)) return true;

	return false;
}

function extractMeta(doc: Document, url: string): Omit<ParsedArticle, 'content' | 'readingTimeMinutes' | 'isPaywalled' | 'source'> {
	const origin = new URL(url).origin;

	const title =
		doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
		doc.querySelector('title')?.textContent?.trim() ||
		new URL(url).hostname;

	const description =
		doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
		doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
		null;

	const coverImage =
		doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;

	const siteName =
		doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
		new URL(url).hostname.replace(/^www\./, '');

	const faviconEl =
		doc.querySelector('link[rel="apple-touch-icon"]') ||
		doc.querySelector('link[rel="icon"][sizes="32x32"]') ||
		doc.querySelector('link[rel="shortcut icon"]') ||
		doc.querySelector('link[rel="icon"]');

	let favicon = faviconEl?.getAttribute('href') || null;
	if (favicon && !favicon.startsWith('http')) favicon = new URL(favicon, origin).toString();
	if (!favicon) favicon = `${origin}/favicon.ico`;

	return { title, description, coverImage, siteName, favicon, author: null };
}

function isXUrl(url: string): boolean {
	const { hostname } = new URL(url);
	return /^(www\.)?(twitter\.com|x\.com)$/.test(hostname);
}

function isXArticleUrl(url: string): boolean {
	return isXUrl(url) && /\/article\//.test(new URL(url).pathname);
}

// Use GET (not HEAD) — t.co and some redirectors drop HEAD requests
async function resolveRedirect(url: string): Promise<string> {
	try {
		const res = await fetch(url, {
			redirect: 'follow',
			signal: AbortSignal.timeout(5000),
			headers: { 'User-Agent': 'Mozilla/5.0' },
		});
		return res.url;
	} catch {
		return url;
	}
}

const X_FAVICON = 'https://abs.twimg.com/favicons/twitter.3.ico';

function xFallback(title = 'X post', author: string | null = null): ParsedArticle {
	return {
		title,
		description: null,
		content: null,
		author,
		siteName: 'X',
		favicon: X_FAVICON,
		coverImage: null,
		readingTimeMinutes: 1,
		isPaywalled: false,
		source: null,
	};
}

// Fetch an X/Twitter page and extract og metadata. X pre-renders og tags for crawlers.
async function fetchXMeta(url: string, fallbackAuthor: string | null = null): Promise<ParsedArticle | null> {
	for (const ua of [
		'Mozilla/5.0 (compatible; Twitterbot/1.0)',
		'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
	]) {
		try {
			const res = await fetch(url, {
				headers: { 'User-Agent': ua, 'Accept': 'text/html' },
				signal: AbortSignal.timeout(8000),
			});
			if (!res.ok) continue;
			const doc = new JSDOM(await res.text(), { url }).window.document;
			const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim();
			const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();
			const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null;
			const author =
				doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ??
				fallbackAuthor;
			if (ogTitle) {
				return {
					title: ogTitle,
					description: ogDesc ?? null,
					content: null,
					author,
					siteName: 'X',
					favicon: X_FAVICON,
					coverImage: ogImage,
					readingTimeMinutes: 1,
					isPaywalled: false,
					source: null,
				};
			}
		} catch { /* try next UA */ }
	}
	return null;
}

async function parseXPost(url: string): Promise<ParsedArticle> {
	let data: { html?: string; author_name?: string } = {};
	try {
		const res = await fetch(
			`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`,
			{ signal: AbortSignal.timeout(10000) }
		);
		if (!res.ok) return xFallback();
		data = await res.json();
	} catch {
		return xFallback();
	}

	const dom = new JSDOM(data.html ?? '');
	const tweetP = dom.window.document.querySelector('blockquote p');
	const tweetText = tweetP?.textContent?.trim() ?? '';
	const authorName = data.author_name ?? null;
	const blockquote = dom.window.document.querySelector('blockquote');

	// If the tweet body has little or no text beyond a link, follow the link.
	const textWithoutUrls = tweetText.replace(/https?:\/\/\S+/g, '').trim();
	const firstLink = tweetP?.querySelector('a[href]');
	const linkedHref = firstLink?.getAttribute('href') ?? '';
	const isLinkOnly = linkedHref && textWithoutUrls.length < 30;

	if (isLinkOnly) {
		const resolved = await resolveRedirect(linkedHref);

		if (!isXUrl(resolved)) {
			// External article — parse normally
			try { return await parseArticle(resolved); } catch { /* fall through */ }
		} else {
			// X Article or thread — try to get og metadata
			const meta = await fetchXMeta(resolved, authorName);
			if (meta) return meta;
		}
	}

	// Regular tweet
	return {
		title: authorName ? `Tweet by ${authorName}` : 'X post',
		description: tweetText || null,
		content: blockquote ? blockquote.outerHTML : null,
		author: authorName,
		siteName: 'X',
		favicon: X_FAVICON,
		coverImage: null,
		readingTimeMinutes: 1,
		isPaywalled: false,
		source: null,
	};
}

export async function parseArticle(url: string): Promise<ParsedArticle> {
	if (isXArticleUrl(url)) return (await fetchXMeta(url)) ?? xFallback();
	if (isXUrl(url)) return parseXPost(url);

	let response: Response;
	try {
		response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br',
			},
			signal: AbortSignal.timeout(15000),
		});
	} catch (e) {
		throw new Error(`Network error: ${(e as Error).message}`);
	}

	if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

	// PDF: save as bookmark, no content extraction
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/pdf')) {
		const hostname = new URL(url).hostname.replace(/^www\./, '');
		const pathName = new URL(url).pathname.split('/').pop() ?? 'document.pdf';
		return {
			title: decodeURIComponent(pathName),
			description: null,
			content: null,
			author: null,
			siteName: hostname,
			favicon: `${new URL(url).origin}/favicon.ico`,
			coverImage: null,
			readingTimeMinutes: 1,
			isPaywalled: false,
			source: 'pdf',
		};
	}

	const html = await response.text();
	const dom = new JSDOM(html, { url });
	const doc = dom.window.document;

	const isProduct = detectProduct(doc, url);

	// For product pages, skip Readability (it strips all the useful content anyway)
	// and return metadata-only
	if (isProduct) {
		const meta = extractMeta(doc, url);
		return {
			...meta,
			content: null,
			readingTimeMinutes: 1,
			isPaywalled: false,
			source: 'product',
		};
	}

	const reader = new Readability(doc.cloneNode(true) as Document);
	const article = reader.parse();

	const isPaywalled = detectPaywall(doc, article);

	const meta = extractMeta(doc, url);

	const title =
		article?.title?.trim() || meta.title;

	const description =
		article?.excerpt || meta.description;

	const siteName = article?.siteName || meta.siteName;
	const author = article?.byline ?? null;

	const content = article?.content ?? null;
	const textContent = article?.textContent ?? '';
	const readingTimeMinutes = estimateReadingTime(textContent || description || '');

	return {
		title,
		description,
		content,
		author,
		siteName,
		favicon: meta.favicon,
		coverImage: meta.coverImage,
		readingTimeMinutes,
		isPaywalled,
		source: null,
	};
}
