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

export const db = drizzle(client, { schema });
