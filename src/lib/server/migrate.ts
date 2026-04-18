import { db } from './db';
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
			created_at INTEGER
		)
	`);

	db.run(sql`
		CREATE TABLE IF NOT EXISTS articles (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
		CREATE TABLE IF NOT EXISTS article_collections (
			article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
			PRIMARY KEY (article_id, collection_id)
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

	// Full-text search index
	db.run(sql`
		CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
			article_id UNINDEXED,
			user_id UNINDEXED,
			title,
			body
		)
	`);

	// Populate index for any articles not yet indexed
	db.run(sql`
		INSERT INTO articles_fts(article_id, user_id, title, body)
		SELECT id, user_id, title, COALESCE(content, '')
		FROM articles
		WHERE id NOT IN (SELECT article_id FROM articles_fts)
	`);

	// Keep index in sync via triggers
	db.run(sql`
		CREATE TRIGGER IF NOT EXISTS articles_fts_ai AFTER INSERT ON articles BEGIN
			INSERT INTO articles_fts(article_id, user_id, title, body)
			VALUES (new.id, new.user_id, new.title, COALESCE(new.content, ''));
		END
	`);

	db.run(sql`
		CREATE TRIGGER IF NOT EXISTS articles_fts_ad AFTER DELETE ON articles BEGIN
			DELETE FROM articles_fts WHERE article_id = old.id;
		END
	`);

	db.run(sql`
		CREATE TRIGGER IF NOT EXISTS articles_fts_au AFTER UPDATE ON articles BEGIN
			DELETE FROM articles_fts WHERE article_id = old.id;
			INSERT INTO articles_fts(article_id, user_id, title, body)
			VALUES (new.id, new.user_id, new.title, COALESCE(new.content, ''));
		END
	`);

	// Migrations for existing databases
	try {
		// Migrate old single-collection data to the junction table
		db.run(sql`
			INSERT OR IGNORE INTO article_collections (article_id, collection_id)
			SELECT id, collection_id FROM articles WHERE collection_id IS NOT NULL
		`);
		db.run(sql`ALTER TABLE articles DROP COLUMN collection_id`);
	} catch {
		// Column doesn't exist or already migrated — safe to ignore
	}

	try {
		db.run(sql`ALTER TABLE collections DROP COLUMN icon`);
	} catch {
		// Already dropped or never existed
	}

	try {
		db.run(sql`ALTER TABLE articles ADD COLUMN is_paywalled INTEGER DEFAULT 0`);
	} catch {
		// Already exists
	}
}
