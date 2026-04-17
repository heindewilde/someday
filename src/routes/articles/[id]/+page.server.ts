import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/auth');

	const [article] = await db
		.select()
		.from(articles)
		.where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id)));

	if (!article) error(404, 'Article not found');

	return { article };
};
