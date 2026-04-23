import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export type Region = 'eu' | 'us' | 'apac';

export const REGIONS: Region[] = ['eu', 'us', 'apac'];

export const REGION_LABELS: Record<Region, string> = {
	eu: 'Europe',
	us: 'United States',
	apac: 'Asia Pacific',
};

export type DbEntry = {
	client: ReturnType<typeof createClient>;
	db: LibSQLDatabase<typeof schema>;
	isFile: boolean;
};

function regionUrl(region: Region): string {
	const fallback = env.DATABASE_URL ?? 'file:./data/someday.db';
	switch (region) {
		case 'eu':   return env.DATABASE_URL_EU   ?? fallback;
		case 'us':   return env.DATABASE_URL_US   ?? fallback;
		case 'apac': return env.DATABASE_URL_APAC ?? fallback;
	}
}

function regionToken(region: Region): string | undefined {
	const fallback = env.DATABASE_AUTH_TOKEN;
	switch (region) {
		case 'eu':   return env.DATABASE_AUTH_TOKEN_EU   ?? fallback;
		case 'us':   return env.DATABASE_AUTH_TOKEN_US   ?? fallback;
		case 'apac': return env.DATABASE_AUTH_TOKEN_APAC ?? fallback;
	}
}

// Keyed by URL — deduplicates when multiple regions share the same connection string
// (e.g. local dev with a single SQLite file, or self-hosted with one DB).
const cache = new Map<string, DbEntry>();

export async function initDb(region: Region): Promise<DbEntry> {
	const url = regionUrl(region);
	const existing = cache.get(url);
	if (existing) return existing;

	const isFile = url.startsWith('file:');
	if (isFile) {
		const filePath = url.slice(5);
		try { mkdirSync(dirname(filePath), { recursive: true }); } catch { /* ok */ }
	}

	const libsqlClient = createClient({ url, authToken: regionToken(region) });

	if (isFile) {
		await libsqlClient.execute(`PRAGMA journal_mode = WAL`);
		await libsqlClient.execute(`PRAGMA synchronous = NORMAL`);
		await libsqlClient.execute(`PRAGMA cache_size = -65536`);
		await libsqlClient.execute(`PRAGMA mmap_size = 268435456`);
		await libsqlClient.execute(`PRAGMA temp_store = MEMORY`);
		await libsqlClient.execute(`PRAGMA busy_timeout = 5000`);
	}

	const drizzleDb = drizzle(libsqlClient, { schema });
	const entry: DbEntry = { client: libsqlClient, db: drizzleDb, isFile };
	cache.set(url, entry);
	return entry;
}

export function getDb(region: Region): DbEntry {
	const url = regionUrl(region);
	const entry = cache.get(url);
	if (!entry) throw new Error(`DB for region "${region}" not initialized — did migrate() run?`);
	return entry;
}

// Primary (EU) DB — used for email routing table lookups and the bootstrap escape hatch.
export function getPrimaryDb(): DbEntry {
	return getDb('eu');
}

export function isValidRegion(value: unknown): value is Region {
	return typeof value === 'string' && (REGIONS as string[]).includes(value);
}

// True only when the three regional URLs are not all identical — i.e. when
// separate Turso databases are configured. Self-hosted instances that use a
// single DATABASE_URL return false and should not show the region picker.
export function isMultiRegion(): boolean {
	const eu   = env.DATABASE_URL_EU   ?? env.DATABASE_URL ?? 'file:./data/someday.db';
	const us   = env.DATABASE_URL_US   ?? env.DATABASE_URL ?? 'file:./data/someday.db';
	const apac = env.DATABASE_URL_APAC ?? env.DATABASE_URL ?? 'file:./data/someday.db';
	return eu !== us || eu !== apac;
}
