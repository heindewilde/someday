import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { articles, reminders, highlights } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	if (!locals.user) redirect(302, '/auth');

	const [[article], [reminder], articleHighlights] = await Promise.all([
		db.select().from(articles).where(and(eq(articles.id, params.id), eq(articles.userId, locals.user.id))),
		db.select().from(reminders).where(and(eq(reminders.articleId, params.id), eq(reminders.userId, locals.user.id))),
		db.select().from(highlights).where(and(eq(highlights.articleId, params.id), eq(highlights.userId, locals.user.id)))
	]);

	if (!article) error(404, 'Article not found');

	// Browser-cache a recently-visited article briefly — Back/Forward and
	// quick re-opens hit the cache instead of re-running the SSR load.
	setHeaders({ 'cache-control': 'private, max-age=60' });

	return { article, reminder: reminder ?? null, highlights: articleHighlights };
};
