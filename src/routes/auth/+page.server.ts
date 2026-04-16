import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { hashPassword, verifyPassword, createSession } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) return fail(400, { error: 'Email and password required', email });

		const [user] = await db.select().from(users).where(eq(users.email, email));
		if (!user) return fail(401, { error: 'Invalid email or password', email });

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) return fail(401, { error: 'Invalid email or password', email });

		await createSession(user.id, cookies);
		redirect(302, '/');
	},

	register: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const name = String(data.get('name') ?? '').trim() || null;

		if (!email || !password) return fail(400, { error: 'Email and password required', email });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters', email });

		const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
		if (existing) return fail(409, { error: 'An account with that email already exists', email });

		const passwordHash = await hashPassword(password);
		const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

		await createSession(user.id, cookies);
		redirect(302, '/');
	}
};
