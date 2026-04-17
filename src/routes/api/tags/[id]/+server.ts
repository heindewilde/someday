import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tags, articleTags } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function slugify(s: string) {
	return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const name = String(body.name ?? '').trim();
	if (!name) error(400, 'Name required');

	const newSlug = slugify(name);

	// If another tag with the same slug exists, merge into it
	const [conflict] = await db
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.userId, locals.user.id), eq(tags.slug, newSlug)));

	if (conflict && conflict.id !== params.id) {
		const existing = await db
			.select({ articleId: articleTags.articleId })
			.from(articleTags)
			.where(eq(articleTags.tagId, params.id));

		for (const { articleId } of existing) {
			await db
				.insert(articleTags)
				.values({ articleId, tagId: conflict.id })
				.onConflictDoNothing();
		}
		await db.delete(tags).where(and(eq(tags.id, params.id), eq(tags.userId, locals.user.id)));
		return json(conflict);
	}

	const [updated] = await db
		.update(tags)
		.set({ name, slug: newSlug })
		.where(and(eq(tags.id, params.id), eq(tags.userId, locals.user.id)))
		.returning();

	if (!updated) error(404, 'Not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	await db.delete(tags).where(and(eq(tags.id, params.id), eq(tags.userId, locals.user.id)));
	return new Response(null, { status: 204 });
};
