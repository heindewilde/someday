import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const url = env.DATABASE_URL || 'file:./data/someday.db';

if (url.startsWith('file:')) {
	const filePath = url.slice(5);
	try { mkdirSync(dirname(filePath), { recursive: true }); } catch { /* ok */ }
}

export const client = createClient({
	url,
	authToken: env.DATABASE_AUTH_TOKEN,
});

// PRAGMA tuning — run once on boot. WAL lets readers proceed while a writer
// commits; larger cache + mmap cut disk hits on a ~157MB DB.
await client.execute(`PRAGMA journal_mode = WAL`);
await client.execute(`PRAGMA synchronous = NORMAL`);
await client.execute(`PRAGMA cache_size = -65536`);
await client.execute(`PRAGMA mmap_size = 268435456`);
await client.execute(`PRAGMA temp_store = MEMORY`);
await client.execute(`PRAGMA busy_timeout = 5000`);

export const db = drizzle(client, { schema });
