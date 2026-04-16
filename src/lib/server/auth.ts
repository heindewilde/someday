import { db } from './db';
import { users, sessions } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

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

	const [session] = await db
		.select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
		.from(sessions)
		.where(eq(sessions.id, sessionId));

	if (!session || session.expiresAt < new Date()) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	const [user] = await db
		.select({ id: users.id, email: users.email, name: users.name })
		.from(users)
		.where(eq(users.id, session.userId));

	return user ?? null;
}

export async function deleteSession(cookies: Cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (sessionId) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
