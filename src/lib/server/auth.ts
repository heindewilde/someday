import { getDb, getPrimaryDb, isValidRegion, type Region } from './db';
import { users, sessions, emailRouting } from './schema';
import { eq, ne, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = '__Host-session';
const SESSION_DAYS = 30;

// Registration is gated by DISABLE_REGISTRATION, with a bootstrap escape
// hatch: if the routing table is empty, the first account can always be
// created. Lets a self-hoster ship DISABLE_REGISTRATION=true from day one
// and still sign themselves up.
export async function registrationAllowed(): Promise<boolean> {
	const disabled = /^(1|true|yes)$/i.test(env.DISABLE_REGISTRATION ?? '');
	if (!disabled) return true;
	const { db } = getPrimaryDb();
	const [row] = await db.select({ n: sql<number>`count(*)` }).from(emailRouting);
	return (row?.n ?? 0) === 0;
}

// Finds which regional DB a user's account lives in. Returns null if unknown.
export async function lookupRegionForEmail(email: string): Promise<Region | null> {
	const { db } = getPrimaryDb();
	const [row] = await db
		.select({ region: emailRouting.region })
		.from(emailRouting)
		.where(eq(emailRouting.email, email));
	if (!row) return null;
	return isValidRegion(row.region) ? row.region : null;
}

export async function registerEmailRoute(email: string, region: Region) {
	const { db } = getPrimaryDb();
	await db.insert(emailRouting).values({ email, region }).onConflictDoNothing();
}

export async function updateEmailRoute(oldEmail: string, newEmail: string) {
	const { db } = getPrimaryDb();
	const [existing] = await db
		.select({ region: emailRouting.region })
		.from(emailRouting)
		.where(eq(emailRouting.email, oldEmail));
	if (!existing) return;
	await db.transaction(async (tx) => {
		await tx.delete(emailRouting).where(eq(emailRouting.email, oldEmail));
		await tx.insert(emailRouting).values({ email: newEmail, region: existing.region }).onConflictDoNothing();
	});
}

export async function hashPassword(password: string) {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
	return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, cookies: Cookies, region: Region) {
	// Encode region in the session ID so getSession can find the right DB
	// without an extra routing table lookup on every request.
	const id = `${region}:${createId()}`;
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	const { db } = getDb(region);
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

function parseSessionCookie(value: string): { region: Region; id: string } {
	const colonIdx = value.indexOf(':');
	if (colonIdx > 0) {
		const maybeRegion = value.slice(0, colonIdx);
		if (isValidRegion(maybeRegion)) {
			return { region: maybeRegion, id: value };
		}
	}
	// Legacy session IDs (pre-multi-region, no prefix) — default to EU
	return { region: 'eu', id: value };
}

export async function getSession(cookies: Cookies) {
	const cookieValue = cookies.get(SESSION_COOKIE);
	if (!cookieValue) return null;

	const { region, id } = parseSessionCookie(cookieValue);
	const { db } = getDb(region);

	const [row] = await db
		.select({
			userId: users.id,
			email: users.email,
			username: users.username,
			expiresAt: sessions.expiresAt
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id));

	if (!row || row.expiresAt < new Date()) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	return { id: row.userId, email: row.email, username: row.username, region };
}

export async function deleteSession(cookies: Cookies) {
	const cookieValue = cookies.get(SESSION_COOKIE);
	if (cookieValue) {
		const { region, id } = parseSessionCookie(cookieValue);
		const { db } = getDb(region);
		await db.delete(sessions).where(eq(sessions.id, id));
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// Invalidate all sessions for a user except the current one.
// Call after a password change so hijacked sessions are evicted.
export async function invalidateOtherSessions(cookies: Cookies, userId: string, region: Region) {
	const currentId = cookies.get(SESSION_COOKIE);
	const { db } = getDb(region);
	if (currentId) {
		await db.delete(sessions).where(
			and(eq(sessions.userId, userId), ne(sessions.id, currentId))
		);
	} else {
		await db.delete(sessions).where(eq(sessions.userId, userId));
	}
}
