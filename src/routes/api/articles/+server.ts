import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { saveArticle } from '$lib/server/saveArticle';
import { rateLimit } from '$lib/server/rate-limit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	await db.delete(articles).where(eq(articles.userId, locals.user.id));

	return json({ ok: true });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const rl = rateLimit(`save:${locals.user.id}`, 30, 5 * 60 * 1000);
	if (!rl.ok) error(429, `Too many requests. Retry after ${rl.retryAfter}s`);

	const { db } = getDb(locals.user.region);
	const body = await request.json();
	const result = await saveArticle(locals.user.id, String(body.url ?? ''), locals.user.region);

	if (result.kind === 'invalid') error(400, result.message);
	if (result.kind === 'duplicate') error(409, { message: 'You already saved this article.' });

	const [article] = await db.select().from(articles).where(eq(articles.id, result.articleId));
	return json(article, { status: 201 });
};
