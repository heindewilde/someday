import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { tags, articleTags, articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { slugify } from '$lib/server/utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const [article] = await db
		.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	if (!article) error(404, 'Article not found');

	const body = await request.json();
	const name = String(body.name ?? '').trim();
	if (!name) error(400, 'Tag name required');

	const slug = slugify(name);

	let [tag] = await db
		.select()
		.from(tags)
		.where(and(eq(tags.userId, locals.user.id), eq(tags.slug, slug)));

	if (!tag) {
		[tag] = await db.insert(tags).values({ name, slug, userId: locals.user.id }).returning();
	}

	await db
		.insert(articleTags)
		.values({ articleId: params.id, tagId: tag.id })
		.onConflictDoNothing();

	return json(tag, { status: 201 });
};
