import { db } from './db';
import { users, sessions, collections, articles, tags, articleTags } from './schema';
import { sql } from 'drizzle-orm';

export function migrate() {
	db.run(sql`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			name TEXT,
			created_at INTEGER
		)
	`);

	db.run(sql`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		)
	`);

	db.run(sql`
		CREATE TABLE IF NOT EXISTS collections (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			icon TEXT DEFAULT '📁',
			created_at INTEGER
		)
	`);

	db.run(sql`
		CREATE TABLE IF NOT EXISTS articles (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
			url TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			content TEXT,
			author TEXT,
			site_name TEXT,
			favicon TEXT,
			cover_image TEXT,
			reading_time_minutes INTEGER DEFAULT 0,
			is_read INTEGER DEFAULT 0,
			is_archived INTEGER DEFAULT 0,
			is_favorite INTEGER DEFAULT 0,
			saved_at INTEGER,
			read_at INTEGER
		)
	`);

	db.run(sql`
		CREATE TABLE IF NOT EXISTS tags (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			slug TEXT NOT NULL
		)
	`);

	db.run(sql`
		CREATE TABLE IF NOT EXISTS article_tags (
			article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (article_id, tag_id)
		)
	`);

	try { db.run(sql`ALTER TABLE articles ADD COLUMN source TEXT`); } catch { /* already exists */ }
}
