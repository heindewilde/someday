import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { hashPassword, verifyPassword, createSession, registrationAllowed } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

const MIN = 60 * 1000;

// Narrow whitelist: we only need to bounce back to /save. Anything else
// falls through to the library. Keeps the surface tight and side-steps
// open-redirect classes (backslash tricks, protocol-relative, etc.).
function safeNext(next: FormDataEntryValue | string | null): string {
	const value = typeof next === 'string' ? next : null;
	if (!value) return '/';
	if (!/^\/save(\?|$)/.test(value)) return '/';
	return value;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user) redirect(302, next);
	return { next, canRegister: await registrationAllowed() };
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const next = safeNext(data.get('next'));

		if (!email || !password) return fail(400, { error: 'Email and password required', email });

		// Keyed by IP+email so one attacker can't lock out legitimate users on
		// other IPs, and a user fumbling their own password isn't blocked by
		// someone else on the same NAT.
		const ip = getClientAddress();
		const limited = rateLimit(`login:${ip}:${email}`, 10, 15 * MIN);
		if (!limited.ok) {
			return fail(429, {
				error: `Too many attempts. Try again in ${limited.retryAfter}s.`,
				email
			});
		}

		const [user] = await db.select().from(users).where(eq(users.email, email));
		if (!user) return fail(401, { error: 'Invalid email or password', email });

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) return fail(401, { error: 'Invalid email or password', email });

		await createSession(user.id, cookies);
		redirect(302, next);
	},

	register: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const name = String(data.get('name') ?? '').trim() || null;
		const next = safeNext(data.get('next'));

		const ip = getClientAddress();
		const limited = rateLimit(`register:${ip}`, 5, 60 * MIN);
		if (!limited.ok) {
			return fail(429, {
				error: `Too many attempts. Try again in ${limited.retryAfter}s.`,
				email
			});
		}

		if (!(await registrationAllowed())) {
			return fail(403, { error: 'Registration is disabled on this instance', email });
		}

		if (!email || !password) return fail(400, { error: 'Email and password required', email });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters', email });

		const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
		if (existing) return fail(409, { error: 'An account with that email already exists', email });

		const passwordHash = await hashPassword(password);
		const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

		await createSession(user.id, cookies);
		redirect(302, next);
	}
};
