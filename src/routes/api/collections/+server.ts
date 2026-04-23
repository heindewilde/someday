import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { collections } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { slugify } from '$lib/server/utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const body = await request.json();
	const name = String(body.name ?? '').trim();

	if (!name) error(400, 'Name required');

	const slug = slugify(name);
	const [col] = await db
		.insert(collections)
		.values({ name, slug, userId: locals.user.id })
		.returning();

	return json(col, { status: 201 });
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const cols = await db
		.select()
		.from(collections)
		.where(eq(collections.userId, locals.user.id))
		.orderBy(collections.name);

	return json(cols);
};
