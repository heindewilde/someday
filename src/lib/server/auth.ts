import { db } from './db';
import { users, sessions } from './schema';
import { eq, ne, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

// Registration is gated by DISABLE_REGISTRATION, with a bootstrap escape
// hatch: if the users table is empty, the first account can always be
// created. Lets a self-hoster ship DISABLE_REGISTRATION=true from day one
// and still sign themselves up.
export async function registrationAllowed(): Promise<boolean> {
	const disabled = /^(1|true|yes)$/i.test(env.DISABLE_REGISTRATION ?? '');
	if (!disabled) return true;
	const [row] = await db.select({ n: sql<number>`count(*)` }).from(users);
	return (row?.n ?? 0) === 0;
}

export async function hashPassword(password: string) {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
	return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, cookies: Cookies) {
	const id = createId();
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	await db.insert(sessions).values({ id, userId, expiresAt });
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		secure: process.env.NODE_ENV === 'production'
	});
	return id;
}

export async function getSession(cookies: Cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (!sessionId) return null;

	const [row] = await db
		.select({
			userId: users.id,
			email: users.email,
			name: users.name,
			expiresAt: sessions.expiresAt
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, sessionId));

	if (!row || row.expiresAt < new Date()) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	return { id: row.userId, email: row.email, name: row.name };
}

export async function deleteSession(cookies: Cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (sessionId) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// Invalidate all sessions for a user except the current one.
// Call after a password change so hijacked sessions are evicted.
export async function invalidateOtherSessions(cookies: Cookies, userId: string) {
	const currentId = cookies.get(SESSION_COOKIE);
	if (currentId) {
		await db.delete(sessions).where(
			and(eq(sessions.userId, userId), ne(sessions.id, currentId))
		);
	} else {
		await db.delete(sessions).where(eq(sessions.userId, userId));
	}
}
