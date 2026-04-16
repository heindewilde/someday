import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const { action } = body;

	if (action === 'updateName') {
		const name = String(body.name ?? '').trim() || null;
		await db.update(users).set({ name }).where(eq(users.id, locals.user.id));
		return json({ ok: true });
	}

	if (action === 'updateEmail') {
		const email = String(body.email ?? '').trim().toLowerCase();
		const password = String(body.password ?? '');

		if (!email) error(400, 'Email is required');
		if (!password) error(400, 'Password is required to change email');

		const [user] = await db.select().from(users).where(eq(users.id, locals.user.id));
		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) error(401, 'Incorrect password');

		const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
		if (taken && taken.id !== locals.user.id) error(409, 'Email already in use');

		await db.update(users).set({ email }).where(eq(users.id, locals.user.id));
		return json({ ok: true });
	}

	if (action === 'updatePassword') {
		const currentPassword = String(body.currentPassword ?? '');
		const newPassword = String(body.newPassword ?? '');

		if (!currentPassword || !newPassword) error(400, 'Both passwords are required');
		if (newPassword.length < 8) error(400, 'New password must be at least 8 characters');

		const [user] = await db.select().from(users).where(eq(users.id, locals.user.id));
		const valid = await verifyPassword(currentPassword, user.passwordHash);
		if (!valid) error(401, 'Incorrect current password');

		const passwordHash = await hashPassword(newPassword);
		await db.update(users).set({ passwordHash }).where(eq(users.id, locals.user.id));
		return json({ ok: true });
	}

	error(400, 'Unknown action');
};
