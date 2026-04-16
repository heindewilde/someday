import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tags, articleTags, articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import type { RequestHandler } from './$types';

function slugify(s: string) {
	return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

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
