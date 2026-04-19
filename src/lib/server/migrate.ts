import { client } from './db';

// Guard against HMR double-starting intervals in dev.
let parsingJanitorStarted = false;

export async function migrate() {
	await client.execute(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			name TEXT,
			created_at INTEGER
		)
	`);

	await client.execute(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		)
	`);

	await client.execute(`
		CREATE TABLE IF NOT EXISTS collections (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			created_at INTEGER
		)
	`);

	await client.execute(`
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

	await client.execute(`
		CREATE TABLE IF NOT EXISTS article_collections (
			article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
			PRIMARY KEY (article_id, collection_id)
		)
	`);

	await client.execute(`
		CREATE TABLE IF NOT EXISTS tags (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			slug TEXT NOT NULL
		)
	`);

	await client.execute(`
		CREATE TABLE IF NOT EXISTS article_tags (
			article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (article_id, tag_id)
		)
	`);

	// Full-text search index
	await client.execute(`
		CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
			article_id UNINDEXED,
			user_id UNINDEXED,
			title,
			body
		)
	`);

	// Populate index for any articles not yet indexed
	await client.execute(`
		INSERT INTO articles_fts(article_id, user_id, title, body)
		SELECT id, user_id, title, COALESCE(content, '')
		FROM articles
		WHERE id NOT IN (SELECT article_id FROM articles_fts)
	`);

	// Keep index in sync via triggers
	await client.execute(`
		CREATE TRIGGER IF NOT EXISTS articles_fts_ai AFTER INSERT ON articles BEGIN
			INSERT INTO articles_fts(article_id, user_id, title, body)
			VALUES (new.id, new.user_id, new.title, COALESCE(new.content, ''));
		END
	`);

	await client.execute(`
		CREATE TRIGGER IF NOT EXISTS articles_fts_ad AFTER DELETE ON articles BEGIN
			DELETE FROM articles_fts WHERE article_id = old.id;
		END
	`);

	await client.execute(`
		CREATE TRIGGER IF NOT EXISTS articles_fts_au AFTER UPDATE ON articles BEGIN
			DELETE FROM articles_fts WHERE article_id = old.id;
			INSERT INTO articles_fts(article_id, user_id, title, body)
			VALUES (new.id, new.user_id, new.title, COALESCE(new.content, ''));
		END
	`);

	// Migrations for existing databases
	try {
		await client.execute(`
			INSERT OR IGNORE INTO article_collections (article_id, collection_id)
			SELECT id, collection_id FROM articles WHERE collection_id IS NOT NULL
		`);
		await client.execute(`ALTER TABLE articles DROP COLUMN collection_id`);
	} catch {
		// Column doesn't exist or already migrated — safe to ignore
	}

	try {
		await client.execute(`ALTER TABLE collections DROP COLUMN icon`);
	} catch {
		// Already dropped or never existed
	}

	try {
		await client.execute(`ALTER TABLE articles ADD COLUMN is_paywalled INTEGER DEFAULT 0`);
	} catch {
		// Already exists
	}

	try {
		await client.execute(`ALTER TABLE articles ADD COLUMN source TEXT`);
	} catch {
		// Already exists
	}

	try {
		await client.execute(`ALTER TABLE articles ADD COLUMN word_count INTEGER DEFAULT 0`);
	} catch {
		// Already exists
	}

	try {
		await client.execute(`ALTER TABLE articles ADD COLUMN domain TEXT`);
	} catch {
		// Already exists
	}

	await client.execute(`
		CREATE TABLE IF NOT EXISTS reminders (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			remind_at INTEGER NOT NULL,
			created_at INTEGER
		)
	`);

	await client.execute(`
		CREATE TABLE IF NOT EXISTS highlights (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			selected_text TEXT NOT NULL,
			start_offset INTEGER NOT NULL,
			end_offset INTEGER NOT NULL,
			note TEXT,
			created_at INTEGER
		)
	`);

	// Indexes — without these the library query is a full scan on `articles`,
	// and every tag/collection join is a full scan on the link table.
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_articles_user_archived_read_saved
		 ON articles(user_id, is_archived, is_read, saved_at DESC)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_articles_user_favorite_saved
		 ON articles(user_id, is_favorite, saved_at DESC)
		 WHERE is_favorite = 1`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_articles_user_rtime
		 ON articles(user_id, reading_time_minutes)`
	);
	// Unique (user_id, url). Falls back to a non-unique index if a prior
	// import landed duplicates — the app-level dedupe in POST /api/articles
	// and the readwise importer both check before inserting.
	try {
		await client.execute(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_user_url
			 ON articles(user_id, url)`
		);
	} catch {
		await client.execute(
			`CREATE INDEX IF NOT EXISTS idx_articles_user_url
			 ON articles(user_id, url)`
		);
	}
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag_id)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_article_collections_collection
		 ON article_collections(collection_id)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_reminders_user_time
		 ON reminders(user_id, remind_at)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_highlights_article ON highlights(article_id)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id, slug)`
	);
	await client.execute(
		`CREATE INDEX IF NOT EXISTS idx_articles_user_domain ON articles(user_id, domain)`
	);

	// Clear stale parsing sentinels from prior crashed workers — on boot any
	// row still marked 'parsing' can't complete (the worker is gone), so reset
	// so the UI doesn't poll forever.
	await client.execute(`UPDATE articles SET source = NULL WHERE source = 'parsing'`);

	// Periodic sweep: if a user closes their tab mid-parse, the background
	// enrichment still completes — but if the server was killed between,
	// nothing will ever flip the sentinel. Run every 5 min; clear rows older
	// than 60s that are still marked 'parsing'.
	if (!parsingJanitorStarted) {
		parsingJanitorStarted = true;
		setInterval(() => {
			client.execute(
				`UPDATE articles SET source = NULL
				 WHERE source = 'parsing' AND saved_at < strftime('%s', 'now') - 60`
			).catch(e => console.error('[janitor] parsing sweep failed:', e));
		}, 5 * 60 * 1000);
	}

	// Background tasks: backfill missing derived columns, then reclaim dead
	// pages. Serialized so VACUUM doesn't fight the backfill's writes.
	void (async () => {
		await backfillDerivedColumns();
		await vacuumIfNeeded();
	})();
}

async function backfillDerivedColumns() {
	try {
		// Only backfill rows that can actually be improved:
		//   - missing domain (will be derived from url)
		//   - word_count is 0 but content has actual bytes to count
		// Rows with content IS NULL or '' legitimately have word_count=0 and
		// don't need re-backfilling every boot.
		const { rows } = await client.execute(
			`SELECT id, url, content FROM articles
			 WHERE (domain IS NULL AND url IS NOT NULL)
			    OR ((word_count IS NULL OR word_count = 0)
			        AND content IS NOT NULL AND length(content) > 0)`
		);
		if (rows.length === 0) return;

		const start = Date.now();
		console.log(`[migrate] Backfilling word_count/domain for ${rows.length} articles...`);

		const BATCH = 200;
		for (let i = 0; i < rows.length; i += BATCH) {
			const batch = rows.slice(i, i + BATCH);
			const statements = batch.map((r) => {
				let domain: string | null = null;
				try {
					if (r.url) domain = new URL(r.url as string).hostname.replace(/^www\./, '');
				} catch { /* bad url — leave null */ }
				const html = (r.content as string | null) ?? '';
				const text = html.replace(/<[^>]+>/g, ' ');
				const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
				return {
					sql: `UPDATE articles SET domain = COALESCE(domain, ?), word_count = ? WHERE id = ?`,
					args: [domain, wordCount, r.id as string]
				};
			});
			await client.batch(statements, 'write');
		}

		console.log(`[migrate] Backfill done in ${Date.now() - start}ms`);
	} catch (e) {
		console.error('[migrate] Backfill failed:', e);
	}
}

async function vacuumIfNeeded() {
	try {
		const free = await client.execute(`PRAGMA freelist_count`);
		const pages = await client.execute(`PRAGMA page_count`);
		const freelist = Number(free.rows[0]?.freelist_count ?? 0);
		const pageCount = Number(pages.rows[0]?.page_count ?? 1);

		// Only vacuum when there's meaningful reclaim to do. VACUUM takes a
		// write lock for the duration, so we don't want to run it every boot.
		const shouldVacuum = freelist > 1000 || freelist / pageCount > 0.1;
		if (!shouldVacuum) return;

		const start = Date.now();
		console.log(`[db] freelist=${freelist}/${pageCount}; running VACUUM...`);
		await client.execute(`VACUUM`);
		console.log(`[db] VACUUM done in ${Date.now() - start}ms`);
	} catch (e) {
		console.error('[db] VACUUM check failed:', e);
	}
}
