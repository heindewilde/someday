import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { parseArticle, cleanUrl } from '$lib/server/parser';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

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

	try {
		const parsed = await parseArticle(normalized);
		const [article] = await db
			.insert(articles)
			.values({ ...parsed, url: normalized, userId: locals.user.id, domain })
			.returning();
		return json(article, { status: 201 });
	} catch (e) {
		// Graceful fallback: save as bookmark-only with hostname metadata
		console.error('Parse error, falling back to bookmark:', e);
		try {
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
					source: null,
					domain,
				})
				.returning();
			return json({ ...article, _fallback: true }, { status: 201 });
		} catch {
			error(422, { message: 'Could not fetch or save the article. Check the URL and try again.' });
		}
	}
};
