import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reminders } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	await db.delete(reminders).where(
		and(eq(reminders.id, params.id), eq(reminders.userId, locals.user.id))
	);

	return json({ ok: true });
};
