import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { articles, collections, articleCollections } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const body = await request.json();
	const collectionIds: string[] = Array.isArray(body.collectionIds) ? body.collectionIds : [];

	const [article] = await db
		.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));
	if (!article) error(404, 'Article not found');

	if (collectionIds.length > 0) {
		const owned = await db
			.select({ id: collections.id })
			.from(collections)
			.where(eq(collections.userId, locals.user.id));
		const ownedIds = new Set(owned.map(c => c.id));
		if (collectionIds.some(id => !ownedIds.has(id))) error(403, 'Collection not found');
	}

	await db.delete(articleCollections).where(eq(articleCollections.articleId, params.id));
	if (collectionIds.length > 0) {
		await db.insert(articleCollections).values(
			collectionIds.map(collectionId => ({ articleId: params.id, collectionId }))
		);
	}

	return json({ ok: true });
};
