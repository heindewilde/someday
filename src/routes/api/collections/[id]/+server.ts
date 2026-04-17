import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { collections } from '$lib/server/schema';
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

	const [col] = await db
		.update(collections)
		.set({ name, slug: slugify(name) })
		.where(and(eq(collections.id, params.id), eq(collections.userId, locals.user.id)))
		.returning();

	if (!col) error(404, 'Not found');
	return json(col);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	await db
		.delete(collections)
		.where(and(eq(collections.id, params.id), eq(collections.userId, locals.user.id)));

	return new Response(null, { status: 204 });
};
