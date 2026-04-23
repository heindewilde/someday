import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { highlights, articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401);
	const { db } = getDb(locals.user.region);
	const [article] = await db.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));
	if (!article) error(404);
	const rows = await db.select().from(highlights)
		.where(and(eq(highlights.articleId, params.id), eq(highlights.userId, locals.user.id)));
	return json(rows);
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401);
	const { db } = getDb(locals.user.region);
	const [article] = await db.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));
	if (!article) error(404);
	const { selectedText, startOffset, endOffset, note } = await request.json();
	if (!selectedText || startOffset == null || endOffset == null) error(400, 'Missing fields');
	const [row] = await db.insert(highlights).values({
		userId: locals.user.id,
		articleId: params.id,
		selectedText,
		startOffset,
		endOffset,
		note: note ?? null
	}).returning();
	return json(row, { status: 201 });
};
