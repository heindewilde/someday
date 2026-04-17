import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { collections } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function slugify(s: string) {
	return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

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

	const cols = await db
		.select()
		.from(collections)
		.where(eq(collections.userId, locals.user.id))
		.orderBy(collections.name);

	return json(cols);
};
