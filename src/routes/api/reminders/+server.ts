import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { reminders, articles } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const rows = await db
		.select({
			id: reminders.id,
			articleId: reminders.articleId,
			remindAt: reminders.remindAt,
			articleTitle: articles.title
		})
		.from(reminders)
		.innerJoin(articles, eq(reminders.articleId, articles.id))
		.where(eq(reminders.userId, locals.user.id))
		.orderBy(reminders.remindAt);

	return json(rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { db } = getDb(locals.user.region);

	const { articleId, remindAt } = await request.json();
	if (!articleId || !remindAt) error(400, 'Missing fields');

	const remindAtDate = new Date(remindAt);
	if (isNaN(remindAtDate.getTime())) error(400, 'Invalid date');

	// Verify the article belongs to the requesting user before creating a reminder
	const [owned] = await db
		.select({ id: articles.id })
		.from(articles)
		.where(and(eq(articles.id, articleId), eq(articles.userId, locals.user.id)));
	if (!owned) error(404, 'Not found');

	// Upsert: delete any existing reminder for this article, then create
	await db.delete(reminders).where(
		and(eq(reminders.userId, locals.user.id), eq(reminders.articleId, articleId))
	);

	const [reminder] = await db.insert(reminders).values({
		id: createId(),
		userId: locals.user.id,
		articleId,
		remindAt: remindAtDate
	}).returning();

	return json(reminder, { status: 201 });
};
