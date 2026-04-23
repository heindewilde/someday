import { getDb, type Region } from './db';
import { articles } from './schema';
import { parseArticle, cleanUrl } from './parser';
import { eq, and } from 'drizzle-orm';

// Sentinel value for rows awaiting background enrichment.
// Kept in sync with the UI check in src/routes/+page.svelte (`source === 'parsing'`)
// and the startup janitor in src/lib/server/migrate.ts.
const PARSING_SENTINEL = 'parsing';

export type SaveResult =
	| { kind: 'ok'; articleId: string }
	| { kind: 'duplicate'; articleId: string }
	| { kind: 'invalid'; message: string };

async function enrichInBackground(articleId: string, normalized: string, region: Region) {
	const { db } = getDb(region);
	try {
		const parsed = await parseArticle(normalized);
		await db
			.update(articles)
			.set({
				title: parsed.title,
				description: parsed.description,
				content: parsed.content,
				author: parsed.author,
				siteName: parsed.siteName,
				favicon: parsed.favicon,
				coverImage: parsed.coverImage,
				readingTimeMinutes: parsed.readingTimeMinutes,
				wordCount: parsed.wordCount,
				isPaywalled: parsed.isPaywalled,
				source: parsed.source
			})
			.where(eq(articles.id, articleId));
	} catch (e) {
		console.error('Background parse failed, keeping bookmark:', e);
		await db.update(articles).set({ source: null }).where(eq(articles.id, articleId));
	}
}

export async function saveArticle(userId: string, rawUrl: string, region: Region): Promise<SaveResult> {
	const { db } = getDb(region);
	const trimmed = String(rawUrl ?? '').trim();
	if (!trimmed) return { kind: 'invalid', message: 'URL is required' };

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(trimmed);
	} catch {
		return { kind: 'invalid', message: 'Invalid URL' };
	}

	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		return { kind: 'invalid', message: 'Only HTTP/HTTPS URLs are supported' };
	}

	const normalized = cleanUrl(parsedUrl.toString());

	const [existing] = await db
		.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.userId, userId), eq(articles.url, normalized)));

	if (existing) return { kind: 'duplicate', articleId: existing.id };

	const domain = parsedUrl.hostname.replace(/^www\./, '');

	const [article] = await db
		.insert(articles)
		.values({
			url: normalized,
			userId,
			title: domain,
			description: null,
			content: null,
			author: null,
			siteName: domain,
			favicon: `${parsedUrl.origin}/favicon.ico`,
			coverImage: null,
			readingTimeMinutes: 1,
			wordCount: 0,
			isPaywalled: false,
			source: PARSING_SENTINEL,
			domain
		})
		.returning();

	void enrichInBackground(article.id, normalized, region);

	return { kind: 'ok', articleId: article.id };
}
