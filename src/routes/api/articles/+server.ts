import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { parseArticle, cleanUrl } from '$lib/server/parser';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

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

	try {
		const parsed = await parseArticle(normalized);
		const [article] = await db
			.insert(articles)
			.values({ ...parsed, url: normalized, userId: locals.user.id })
			.returning();
		return json(article, { status: 201 });
	} catch (e) {
		// Graceful fallback: save as bookmark-only with hostname metadata
		console.error('Parse error, falling back to bookmark:', e);
		try {
			const hostname = parsedUrl.hostname.replace(/^www\./, '');
			const [article] = await db
				.insert(articles)
				.values({
					url: normalized,
					userId: locals.user.id,
					title: hostname,
					description: null,
					content: null,
					author: null,
					siteName: hostname,
					favicon: `${parsedUrl.origin}/favicon.ico`,
					coverImage: null,
					readingTimeMinutes: 1,
					isPaywalled: false,
					source: null,
				})
				.returning();
			return json({ ...article, _fallback: true }, { status: 201 });
		} catch {
			error(422, { message: 'Could not fetch or save the article. Check the URL and try again.' });
		}
	}
};
