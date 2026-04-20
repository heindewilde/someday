# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run check        # Type-check with svelte-check
npm run check:watch  # Type-check in watch mode
```

There is no test suite. Type-check (`npm run check`) is the primary correctness signal.

## Architecture

**Someday** is a self-hosted read-later app. SvelteKit (SSR) + SQLite via Drizzle ORM + libsql.

### Database

- **File**: `data/someday.db` (path configurable via `DB_PATH` env var)
- **Schema**: `src/lib/server/schema.ts` — all tables defined with Drizzle ORM
- **Migrations**: `src/lib/server/migrate.ts` — inline `CREATE TABLE IF NOT EXISTS` statements; run automatically on startup via `src/hooks.server.ts`. **No Drizzle migrations folder.** To add a column, add it to the schema and add an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `migrate.ts`.
- **Tables**: `users`, `sessions`, `articles`, `collections`, `article_collections`, `tags`, `article_tags`, `reminders`, `highlights`
- **FTS**: `articles_fts` virtual table (FTS5), synced via triggers on `articles` (INSERT/UPDATE/DELETE) — see `migrate.ts:82-119`
- All PKs use CUID2 (`@paralleldrive/cuid2`)

### Auth

Session-based auth in `src/lib/server/auth.ts`. `locals.user` is set in `hooks.server.ts`. Every route/API handler checks `if (!locals.user) redirect(302, '/auth')` or returns 401.

### Article Saving

Articles are saved by POSTing a URL to `/api/articles`. The endpoint creates a **skeleton row immediately** with `source = 'parsing'`, returns to the client, then enriches in the background via `enrichInBackground()` — content, metadata, reading time, word count, and domain are filled in later. The UI polls while `source === 'parsing'`. Parsing uses `@mozilla/readability` + `jsdom` (`src/lib/server/parser.ts`), which also handles tracking-param stripping, paywall detection, product detection, and special cases for X/Twitter (oEmbed) and PDFs (bookmark-only).

A **janitor** runs every 5 minutes (and once at startup) to clear any `source='parsing'` sentinels older than 60s — prevents the UI from polling forever if the server crashed mid-parse. See `migrate.ts:241-254`.

### Similarity

Similar articles use SQLite **FTS5 + BM25** ranking at query time — no separate similarity table. The `articles_fts` virtual table is populated via triggers on INSERT/UPDATE/DELETE. The query extracts title keywords from the target article (words ≥4 chars, max 8 terms), builds an FTS MATCH with prefix operators, and returns up to 5 results ordered by BM25. Exposed via `/api/articles/[id]/similar`.

### Search

Library text search uses the same `articles_fts` table. User input is stripped of FTS operators (`" ( ) * :`), each word ≥4 chars becomes a prefix term, max 8 terms joined with OR, scoped to `user_id` — see `src/routes/+page.server.ts:58-71`. Full-text indexes both title and body.

### Translation

`/api/translate` proxies to the public Lingva instance (`https://lingva.ml/api/v1/auto/{target}/{encodedText}`). The reader extracts block elements (p, h1–h6, blockquote, li) from article HTML, chunks them to ≤2000 chars, translates in parallel, then rebuilds HTML with original tags. Use `esc()` for XSS safety when injecting translated text into `{@html}`.

### Frontend

- **Svelte 5** with runes: `$state`, `$derived`, `$effect`, `$props` throughout — do not use the legacy Options API
- **Icons**: `lucide-svelte@0.577.0` — use this version, not 1.0.1 (breaks Svelte 5 stable). Props: `size`, `strokeWidth`, `fill`
- **Scoped CSS + lucide**: Svelte scoped styles don't reach lucide component roots. Use `:global(svg)` inside a scoped wrapper to target them (e.g., `.search-wrap :global(svg) { ... }`)
- **Styling**: CSS custom properties (`--color-text`, `--color-bg`, `--color-surface`, `--color-border`, `--color-muted`, `--color-subtle`, `--color-danger`, `--color-success`) defined in the layout. No Tailwind utility classes in component markup — all styling is scoped `<style>` blocks.
- **Outside-click pattern**: `$effect(() => { const handler = (e) => { ... }; window.addEventListener('mousedown', handler); return () => window.removeEventListener('mousedown', handler); })`

### Key Routes

| Route | Purpose |
|---|---|
| `/` | Library (list + filter + FTS search) |
| `/articles/[id]` | Reader view (highlights, translate, similar) |
| `/settings` | Account settings + Readwise import |
| `/auth` | Login / register |
| `/health` | Healthcheck used by Docker |
| `/api/articles` | POST save, DELETE all |
| `/api/articles/[id]` | PATCH / DELETE single article |
| `/api/articles/[id]/tags`, `/api/articles/[id]/tags/[tagId]` | Add / remove tag on article |
| `/api/articles/[id]/collections` | Put article in collections |
| `/api/articles/[id]/highlights` | GET / POST highlights on article |
| `/api/articles/[id]/similar` | FTS5 + BM25 similar articles |
| `/api/tags/[id]` | PATCH rename, DELETE tag |
| `/api/collections`, `/api/collections/[id]` | Collection CRUD |
| `/api/highlights/[id]` | PATCH note, DELETE highlight |
| `/api/reminders`, `/api/reminders/[id]` | Reminder CRUD |
| `/api/translate` | Proxy to Lingva |
| `/api/user` | PATCH account (email, password) |
| `/api/import/readwise` | Readwise CSV import (background job, in-memory progress) |
| `/api/inbound-email` | Postmark webhook for email-to-save (auth via `?secret=` query) |

### Performance & startup

- **Pragmas** (`src/lib/server/db.ts`): `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-65536` (64 MB), `mmap_size=268435456` (256 MB), `temp_store=MEMORY`, `busy_timeout=5000`.
- **Composite indexes** (`migrate.ts:185-236`): hot library query path `(user_id, is_archived, is_read, saved_at DESC)`, partial favorites index, reading-time filter, domain filter, session expiry, reminders by user+time, highlights by article, tags by user+slug.
- **Startup work** (run once via `hooks.server.ts` → `migrate()`): idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, FTS5 trigger install, one-time backfill of `domain` and `word_count`, gated `VACUUM` only if freelist is significant.
- **Background janitor** every 5 min: clears stuck `source='parsing'` sentinels.
