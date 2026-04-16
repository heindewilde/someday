import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { parseArticle } from '$lib/server/parser';
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

	try {
		const parsed = await parseArticle(url);
		const [article] = await db
			.insert(articles)
			.values({ ...parsed, url, userId: locals.user.id })
			.returning();
		return json(article, { status: 201 });
	} catch (e) {
		console.error('Parse error:', e);
		error(422, { message: 'Could not fetch or parse the article. Check the URL and try again.' });
	}
};
