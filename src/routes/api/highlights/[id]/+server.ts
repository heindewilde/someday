import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { highlights } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401);
	const { db } = getDb(locals.user.region);
	const { note } = await request.json();
	const [row] = await db.update(highlights)
		.set({ note: note ?? null })
		.where(and(eq(highlights.id, params.id), eq(highlights.userId, locals.user.id)))
		.returning();
	if (!row) error(404);
	return json(row);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401);
	const { db } = getDb(locals.user.region);
	await db.delete(highlights)
		.where(and(eq(highlights.id, params.id), eq(highlights.userId, locals.user.id)));
	return new Response(null, { status: 204 });
};
