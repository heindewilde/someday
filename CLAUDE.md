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
- **Tables**: `users`, `sessions`, `articles`, `collections`, `article_collections`, `tags`, `article_tags`, `reminders`
- All PKs use CUID2 (`@paralleldrive/cuid2`)

### Auth

Session-based auth in `src/lib/server/auth.ts`. `locals.user` is set in `hooks.server.ts`. Every route/API handler checks `if (!locals.user) redirect(302, '/auth')` or returns 401.

### Article Saving

Articles are saved by POSTing a URL to `/api/articles`. The server fetches the page and extracts content with `@mozilla/readability` + `jsdom` (`src/lib/server/parser.ts`). Reading time, word count, and TF-IDF vectors are computed on save for the "similar articles" feature.

### Similarity

Similar articles use TF-IDF cosine similarity computed at save time and stored in a SQLite table. Exposed via `/api/articles/[id]/similar`.

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
| `/` | Library (list + filter) |
| `/articles/[id]` | Reader view |
| `/settings` | Account settings |
| `/auth` | Login / register |
| `/api/articles` | Save / list articles |
| `/api/articles/[id]` | CRUD for single article |
| `/api/articles/[id]/similar` | TF-IDF similar articles |
| `/api/reminders` | Create/list reminders |
| `/api/reminders/[id]` | Delete reminder |
| `/api/translate` | Proxy to Lingva |
| `/api/tags`, `/api/collections`, `/api/user` | CRUD |
| `/api/inbound-email` | Postmark webhook for email-to-save |
