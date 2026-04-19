import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { parseArticle, cleanUrl } from '$lib/server/parser';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Sentinel value for rows awaiting background enrichment.
// Kept in sync with the UI check in src/routes/+page.svelte (`source === 'parsing'`)
// and the startup janitor in src/lib/server/migrate.ts.
const PARSING_SENTINEL = 'parsing';

async function enrichInBackground(articleId: string, normalized: string) {
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
		// Parse failed — leave skeleton in place, clear sentinel so UI stops polling.
		console.error('Background parse failed, keeping bookmark:', e);
		await db.update(articles).set({ source: null }).where(eq(articles.id, articleId));
	}
}

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	await db.delete(articles).where(eq(articles.userId, locals.user.id));

	return json({ ok: true });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const url = String(body.url ?? '').trim();

	if (!url) error(400, 'URL is required');

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		error(400, 'Invalid URL');
	}

	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		error(400, 'Only HTTP/HTTPS URLs are supported');
	}

	const normalized = cleanUrl(parsedUrl.toString());

	const [existing] = await db
		.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.userId, locals.user.id), eq(articles.url, normalized)));

	if (existing) error(409, { message: 'You already saved this article.' });

	const domain = parsedUrl.hostname.replace(/^www\./, '');

	// Insert a skeleton row immediately so the save button feels instant.
	// A background task enriches the row via parseArticle(); the UI polls
	// while source=PARSING_SENTINEL and refreshes when it clears.
	const [article] = await db
		.insert(articles)
		.values({
			url: normalized,
			userId: locals.user.id,
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
			domain,
		})
		.returning();

	void enrichInBackground(article.id, normalized);

	return json(article, { status: 201 });
};
