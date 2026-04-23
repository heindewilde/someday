import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { articleTags, articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const [article] = await db
		.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	if (!article) error(404, 'Article not found');

	await db
		.delete(articleTags)
		.where(and(eq(articleTags.articleId, params.id), eq(articleTags.tagId, params.tagId)));

	return json({ ok: true });
};
