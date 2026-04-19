import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, reminders } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/auth');

	const [[article], [reminder]] = await Promise.all([
		db.select().from(articles).where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id))),
		db.select().from(reminders).where(and(eq(reminders.articleId, params.id), eq(reminders.userId, locals.user.id)))
	]);

	if (!article) error(404, 'Article not found');

	return { article, reminder: reminder ?? null };
};
