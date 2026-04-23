import { redirect, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { articles, reminders, highlights } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/auth');
	const { db } = getDb(locals.user.region);

	const [[article], [reminder], articleHighlights] = await Promise.all([
		db.select().from(articles).where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id))),
		db.select().from(reminders).where(and(eq(reminders.articleId, params.id), eq(reminders.userId, locals.user.id))),
		db.select().from(highlights).where(and(eq(highlights.articleId, params.id), eq(highlights.userId, locals.user.id)))
	]);

	if (!article) error(404, 'Article not found');

	return { article, reminder: reminder ?? null, highlights: articleHighlights };
};
