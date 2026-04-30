import { fail, redirect } from '@sveltejs/kit';
import { getDb, isValidRegion, isMultiRegion, REGIONS, REGION_LABELS } from '$lib/server/db';
import { users } from '$lib/server/schema';
import {
	hashPassword,
	verifyPassword,
	createSession,
	registrationAllowed,
	lookupRegionForEmail,
	registerEmailRoute
} from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

const MIN = 60 * 1000;

function safeNext(next: FormDataEntryValue | string | null): string {
	const value = typeof next === 'string' ? next : null;
	if (!value) return '/';
	if (!/^\/save(\?|$)/.test(value)) return '/';
	return value;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user) redirect(302, next);
	const initialMode = url.searchParams.get('mode') === 'register' ? 'register' : 'login';
	return {
		next,
		initialMode,
		canRegister: await registrationAllowed(),
		multiRegion: isMultiRegion(),
		regions: REGIONS.map(r => ({ value: r, label: REGION_LABELS[r] }))
	};
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const next = safeNext(data.get('next'));

		if (!email || !password) return fail(400, { error: 'Email and password required', email });

		const ip = getClientAddress();
		const limited = rateLimit(`login:${ip}:${email}`, 10, 15 * MIN);
		if (!limited.ok) {
			return fail(429, {
				error: `Too many attempts. Try again in ${limited.retryAfter}s.`,
				email
			});
		}

		const region = await lookupRegionForEmail(email);
		if (!region) return fail(401, { error: 'Invalid email or password', email });

		const { db } = getDb(region);
		const [user] = await db.select().from(users).where(eq(users.email, email));
		if (!user) return fail(401, { error: 'Invalid email or password', email });

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) return fail(401, { error: 'Invalid email or password', email });

		await createSession(user.id, cookies, region);
		redirect(302, next);
	},

	register: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const name = String(data.get('name') ?? '').trim() || null;
		const regionRaw = data.get('region');
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
		if (password.length > 72) return fail(400, { error: 'Password must be 72 characters or fewer', email });

		const region = isValidRegion(regionRaw) ? regionRaw : (isMultiRegion() ? null : 'eu');
		if (!region) {
			return fail(400, { error: 'Please select a data region', email });
		}

		// Check email uniqueness across all regions via the routing table
		const existingRegion = await lookupRegionForEmail(email);
		if (existingRegion) return fail(409, { error: 'An account with that email already exists', email });

		const { db } = getDb(region);
		const passwordHash = await hashPassword(password);
		const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

		await registerEmailRoute(email, region);
		await createSession(user.id, cookies, region);
		redirect(302, next);
	}
};
