import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const allowed = ['isRead', 'isArchived', 'isFavorite', 'readAt'] as const;
	const updates: Record<string, unknown> = {};

	for (const key of allowed) {
		if (key in body) updates[key] = body[key];
	}

	if (body.isRead === true && !('readAt' in updates)) {
		updates.readAt = new Date();
	}

	if (!Object.keys(updates).length) error(400, 'No valid fields to update');

	await db
		.update(articles)
		.set(updates)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	await db
		.delete(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	return json({ ok: true });
};
