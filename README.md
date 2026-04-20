<!-- TODO: drop logo file at docs/logo.svg (or .png). Recommended size: 120×120. -->
<p align="center">
  <img src="docs/logo.svg" alt="Someday" width="120" />
</p>

<h1 align="center">Someday</h1>

<p align="center">
  <em>A calm, self-hosted read-later app.<br/>Save anything, read anywhere, own your data.</em>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg"></a>
  <a href="https://github.com/heindewilde/someday/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/heindewilde/someday?style=social"></a>
  <a href="https://github.com/heindewilde/someday/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/heindewilde/someday"></a>
  <a href="https://github.com/heindewilde/someday/issues"><img alt="Issues" src="https://img.shields.io/github/issues/heindewilde/someday"></a>
  <img alt="Built with SvelteKit" src="https://img.shields.io/badge/built%20with-SvelteKit-ff3e00?logo=svelte&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/database-SQLite-003B57?logo=sqlite&logoColor=white">
  <img alt="Docker ready" src="https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white">
</p>

<p align="center">
  <a href="https://someday.sh/"><strong>Try the hosted version →</strong></a>
  &nbsp;·&nbsp;
  <a href="#-self-hosting"><strong>Self-host in 5 minutes</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/heindewilde/someday"><strong>Star on GitHub</strong></a>
</p>

<!--
Screenshot placeholders — drop files into docs/screenshots/ and uncomment:
  - library.png      (library view, light mode, hero shot — 1600×1000+)
  - reader.png       (reader view with an article)
  - dark-mode.png    (dark theme showcase)
  - mobile.png       (mobile layout, portrait)
  - highlights.png   (reader with a highlight + note)
-->
<p align="center">
  <img src="docs/screenshots/library.png" alt="Someday library view" width="880" />
</p>

---

## Why Someday?

**Your reading list shouldn't live on someone else's server.** Someday runs as a single process backed by a single SQLite file. No external database, no Redis, no analytics, no telemetry. Drop it on a Raspberry Pi behind your home network and your library never leaves your house.

**It's also a serious reading tool.** Most self-hosted read-later apps are beautiful but thin. Someday ships the things you'd actually pay for: email-to-save, Readwise import, highlights with notes, smart collections, similar-article discovery, 15-language translation, and full-text search — all running locally against your own data.

**And it gets out of your way.** Distraction-free reader with Geist typography, dark mode, a fully keyboard-driven library (`j`/`k`, `/`, `?`), and responsive layouts that work from 320px up. Designed for the "slow web."

> **Self-hosted and private by default.** One binary, one SQLite file, one `docker compose up`. No external services, no accounts you don't control, no data you can't walk away with.
> [Jump to self-hosting →](#-self-hosting)

---

## Someday in 30 seconds

<table>
<tr>
<td width="33%" valign="top">

### 📥 Save from anywhere
Paste a URL, `⌘V` from the clipboard, forward emails, or drop a Readwise CSV. Auto-detects PDFs, products, and tweets.

</td>
<td width="33%" valign="top">

### 📖 Read beautifully
Mozilla Readability extraction, Geist variable font, 680px measure, light + dark themes, one-click PDF export.

</td>
<td width="33%" valign="top">

### 🏷️ Organize lightly
Tags for quick labels, collections for curated reading lists. Filter by status, reading time, or source domain.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### ✨ Highlight & recall
Select-to-highlight with persistent offsets, inline notes, and a live side panel that follows you through the article.

</td>
<td width="33%" valign="top">

### 🔍 Discover connections
FTS5 full-text search and BM25-ranked "similar articles" surface older pieces you'd forgotten you saved.

</td>
<td width="33%" valign="top">

### 🔒 Own your data
Single SQLite file. Take a `.db` copy and walk away whenever. AGPL-3.0 — you have the right to study and modify every line.

</td>
</tr>
</table>

---

## Feature tour

### 📥 Save from anywhere

<!-- TODO: docs/screenshots/save.png -->

- **Paste-to-save** from the topbar, or hit `⌘V` / `Ctrl+V` anywhere to save the URL on your clipboard.
- **Email-to-save** via Postmark inbound webhooks. Forward any newsletter or article to your Someday address and it lands in your library seconds later, with the sender as byline. [Setup guide below.](#-email-to-save-postmark)
- **Readwise Reader CSV import** preserves tags, read/unread state, archive state, and saved date. Runs in the background with a progress bar.
- **Automatic handling** for PDFs (saved as bookmarks), product pages (metadata-only), and X/Twitter URLs (oEmbed).
- **Tracking-param stripping** — `utm_*`, `fbclid`, `gclid`, and friends are removed before saving.
- **Duplicate detection** per user, so saving a URL twice is a no-op.

### 📖 A reader that gets out of the way

<!-- TODO: docs/screenshots/reader.png -->

- **Mozilla Readability** extraction with a 680px measure and 1.75 line-height.
- **Geist variable font** (self-hosted, no Google Fonts callouts) for a clean, modern feel.
- **Light + dark themes** — full CSS variable system, persisted to `localStorage`, one-click toggle.
- **Paywall detection** (`og:article:content_tier`, JSON-LD `isAccessibleForFree`, DOM heuristics) — flagged with a badge before you click through.
- **Source badges** for email (blue), product (purple), and PDF (gray) sources so you know what you saved.
- **PDF export** via the browser's native print dialog with optimized print styles.
- **Cover images**, favicons, authors, reading time, and word count — extracted once, stored forever.

### ✨ Highlights & notes

<!-- TODO: docs/screenshots/highlights.png -->

- **Select-to-highlight** in the reader. Toggle highlight mode and drag across any passage.
- **Character-offset persistence** survives re-renders, translations, and theme switches.
- **Per-highlight notes** — click any highlight to edit, annotate, or delete.
- **Side panel** lists every highlight in an article, with jump-to-text on click.

### 🏷️ Tags vs. collections

Two organization primitives — use either, both, or neither.

| | **Tags** | **Collections** |
|---|---|---|
| **Purpose** | Flexible labels | Curated reading lists |
| **Creation** | Auto on first use | Explicit, you name them |
| **Relationship** | Many-to-many, flat | Many-to-many, flat |
| **Renaming** | Merges on conflict | Simple rename |
| **Filters** | Respects read/unread | Shows everything in list |

Plus built-in filters for **Unread**, **Read**, **Favorites**, **Archive**, reading time (`< 5 min` … `> 20 min`), and source domain.

### 🔍 Full-text search

<!-- TODO: docs/screenshots/search.png -->

- **SQLite FTS5** virtual table over titles and article bodies.
- **Prefix matching** on every term (`react` matches `react`, `reactive`, `reactor`).
- **BM25 relevance ranking** built into SQLite — no external search engine needed.
- **Instant results** with tight debouncing; scoped to your user and respects the current filter view.
- **Triggers keep the index in sync** on every insert, update, and delete — no manual reindex step.

### ✨ Similar articles

For each article, Someday pulls the top 5 related pieces from your own library using **BM25 ranking over title keywords** (≥4 chars, up to 8 terms). Great for rediscovery — save an article today, and when you read it next month you'll see the three related pieces you'd forgotten about.

### 🌐 Translate anything

<!-- TODO: docs/screenshots/translate.png -->

- **15 languages** via the public Lingva proxy: English, Spanish, French, German, Portuguese, Italian, Dutch, Polish, Russian, Japanese, Chinese, Korean, Arabic, Turkish, Swedish.
- **Block-level translation** preserves structure — headings stay headings, blockquotes stay blockquotes, lists stay lists.
- **Parallel chunking** (≤2000 chars per request) keeps long articles fast.
- **XSS-safe** — all translated text is escaped before reinjection.

### 🔔 Reminders

- Pick any future datetime (defaults to tomorrow 9am). One reminder per article, upsert semantics.
- The bell icon shows a dot when any reminder is due within 24 hours.
- Upcoming reminders live in the sidebar, sorted by time, with click-to-cancel and a 5.6-second undo window.

> Reminders are stored today; delivery via email/push is on the [roadmap](#-roadmap).

### ⌨️ Keyboard-first

Hit `?` anywhere to see this live. All shortcuts work without modifiers except where noted.

| Action | Keys |
|---|---|
| Next / previous article | `j` `k` or `↓` `↑` |
| Open reader | `Enter` or `o` |
| Switch filter (Unread / Read / Favorites / Archive) | `1` `2` `3` `4` |
| Toggle read | `r` |
| Toggle favorite | `f` |
| Archive | `e` |
| Delete (with undo) | `d` |
| Focus search | `/` |
| Dismiss menus / clear search | `Esc` |
| Paste-to-save URL | `⌘V` / `Ctrl+V` |
| Show shortcut help | `?` |

### 📱 Mobile & dark mode

<!-- TODO: docs/screenshots/mobile.png docs/screenshots/dark-mode.png -->

Responsive layouts from 320px up. Hamburger sidebar on mobile, horizontal-scrolling action bar, touch-friendly targets. Dark mode is a first-class citizen — both themes are hand-tuned, not auto-inverted.

---

## Two ways to use Someday

|  | **☁️ Cloud (someday.sh)** | **🏠 Self-host** |
|---|---|---|
| **Setup** | Sign up — zero config | Docker Compose, 5 minutes |
| **Storage** | Managed, encrypted | Your SQLite file |
| **Updates** | Automatic | `git pull && docker compose up -d --build` |
| **Backups** | Automated, offsite | Your cron, your volume |
| **Cost** | TBD (private beta) | Free (you pay for hosting) |
| **Privacy** | Hosted by us | Never leaves your server |
| **Best for** | "I just want to read." | "I want to own every byte." |

Both run the exact same open-source code.

---

## ☁️ Cloud — someday.sh

Someday is available as a managed service at **[someday.sh](https://someday.sh/)**, currently in **private beta**.

**What you get:**
- Everything in this README, zero setup
- Managed updates and security patches
- Automated offsite backups
- Same AGPL-3.0 code, just hosted for you

**[Join the waitlist →](https://someday.sh/)**

> Your data is yours. Someday exports to a portable format compatible with Readwise Reader's CSV schema — take it with you whenever you want.

---

## 🏠 Self-hosting

Someday runs as a **single process** with a **single SQLite file**. No database server, no Redis, no queue, no external dependencies beyond Node.

### Option A — Docker Compose (recommended)

**Requirements:** Docker 20+ with Compose v2.

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
cp .env.example .env
```

Open `.env` and set `ORIGIN` to the public URL you'll serve from (required in production):

```env
ORIGIN=https://someday.yourdomain.com
```

Start it:

```bash
docker compose up -d
```

That's it. Someday is running on port **3000**. Data lives in a Docker named volume (`someday-data`) and survives restarts and upgrades. A `/health` endpoint is wired up to the container's healthcheck so your orchestrator knows when it's ready.

**Change the port:** set `PORT=8080` in `.env` before starting. Remember to update `ORIGIN` to match.

### Option B — Docker run (no Compose)

<!-- TODO: publish image to ghcr.io/heindewilde/someday before pointing users here. For now this builds locally. -->

If you prefer not to use Compose, build and run the image yourself:

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
docker build -t someday .
docker run -d --name someday -p 3000:3000 \
  -v someday-data:/app/data \
  -e ORIGIN=http://localhost:3000 \
  someday
```

### Option C — Node.js (from source)

**Requirements:** Node.js 20+ (22 LTS recommended).

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
npm ci
npm run build
PORT=3000 ORIGIN=http://localhost:3000 node build
```

`PORT` and `ORIGIN` must match — `PORT` is what the server listens on, `ORIGIN` is the URL your browser uses. Data is written to `./data/someday.db` by default (override with `DB_PATH`).

To run as a service, wrap `node build` with systemd, pm2, or your supervisor of choice.

### Upgrading

```bash
cd someday
git pull
docker compose up -d --build
```

No manual migration step. Schema changes are applied at startup via idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements in `src/lib/server/migrate.ts`. WAL mode means reads continue during the brief migration window.

### Backups

The entire app lives in `data/someday.db`. Back it up however you'd back up any SQLite file.

**Live backup (no downtime, WAL-safe):**

```bash
sqlite3 /path/to/data/someday.db ".backup /path/to/backups/someday-$(date +%F).db"
```

**Daily cron:**

```cron
0 3 * * * sqlite3 /srv/someday/data/someday.db ".backup /backups/someday-$(date +\%F).db"
```

**Offsite:** pipe to `restic`, `rclone`, or `rsync` to your destination of choice. The DB file is the whole app — no config, assets, or state lives outside of it.

### Reverse proxy

Point your proxy at port 3000, forward `Host` and `X-Forwarded-*` headers, and set `ORIGIN` to your public URL.

<details>
<summary><strong>Caddy</strong></summary>

```caddy
someday.yourdomain.com {
    reverse_proxy localhost:3000
}
```

</details>

<details>
<summary><strong>nginx</strong></summary>

```nginx
server {
    listen 443 ssl http2;
    server_name someday.yourdomain.com;

    # SSL config (certbot, Let's Encrypt, etc.)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

</details>

<details>
<summary><strong>Traefik (labels on docker-compose)</strong></summary>

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.someday.rule=Host(`someday.yourdomain.com`)"
  - "traefik.http.routers.someday.entrypoints=websecure"
  - "traefik.http.routers.someday.tls.certresolver=letsencrypt"
  - "traefik.http.services.someday.loadbalancer.server.port=3000"
```

</details>

---

## ⚙️ Configuration

All configuration is via environment variables (or a `.env` file).

| Variable | Default | Required? | Description |
|---|---|---|---|
| `ORIGIN` | `http://localhost:3000` | **Yes in production** | Public URL the app is served from. Must match the domain users hit. |
| `PORT` | `3000` | No | Port the Node server listens on. |
| `DB_PATH` | `./data/someday.db` | No | Path to the SQLite database file (local file mode). |
| `DATABASE_URL` | — | No | Remote libSQL / Turso URL. Overrides `DB_PATH` when set. |
| `DATABASE_AUTH_TOKEN` | — | No | Auth token for remote libSQL. Required when `DATABASE_URL` points to a remote instance. |
| `INBOUND_EMAIL_SECRET` | — | No | Shared secret for the Postmark inbound-email webhook. Required only if you're enabling email-to-save. |

---

## 📬 Email-to-save (Postmark)

Forward any article, newsletter, or page to your Someday address and it lands in your library.

**1. Create an inbound server in Postmark.**
In Postmark → **Servers** → create a new server → set stream type to **Inbound**.

**2. Set the webhook URL.**
Set the inbound webhook to:

```
https://someday.yourdomain.com/api/inbound-email?secret=YOUR_SHARED_SECRET
```

Pick a long random `YOUR_SHARED_SECRET` (e.g. `openssl rand -hex 32`).

**3. Set the secret in your Someday instance.**

```env
INBOUND_EMAIL_SECRET=YOUR_SHARED_SECRET
```

Restart the container. Postmark will start POSTing inbound emails to Someday, which attributes each one to the registered user whose email matches the sender. Emails from unregistered addresses are silently dropped.

**Forwarding tip:** use your email client's forward-to rules or a service like Apple Mail Rules / Gmail filters to auto-forward newsletters to your Postmark inbound address.

---

## 📦 Importing from other apps

### Readwise Reader

Settings → **Import from Readwise** → drop the CSV. Imports run in the background with a live progress bar and preserve:

- Tags (auto-created as needed)
- Read / unread status
- Archive status
- Original saved date

Existing URLs are skipped; no duplicates.

### Pocket, Instapaper, Raindrop

Not natively supported yet — [open an issue](https://github.com/heindewilde/someday/issues) to vote on priority. In the meantime, most of these services export a CSV that can be massaged into the Readwise schema with a few lines of `awk` or a spreadsheet.

---

## 🏗️ Architecture at a glance

For the technically curious:

- **Single-process SvelteKit SSR** with Svelte 5 runes throughout (`$state`, `$derived`, `$effect`, `$props`).
- **SQLite via `@libsql/client`** — local file mode by default, remote libSQL/Turso supported via `DATABASE_URL`.
- **Tuned pragmas**: WAL mode, 64 MB cache, 256 MB `mmap_size`, `NORMAL` sync — see `src/lib/server/db.ts`.
- **FTS5 virtual table** for search and similarity, kept in sync via triggers on the `articles` table.
- **Composite indexes** on the hot library query paths (user × archived × read × saved_at, favorites, reading time, domain).
- **Fire-and-forget background parsing** on save — a skeleton row appears instantly with `source='parsing'`, the UI polls, and a janitor sweeps stale sentinels every 5 minutes.
- **Startup migrations, backfills, and gated VACUUM** all run automatically on boot via `hooks.server.ts`.
- **Session auth** with bcrypt-hashed passwords (cost 10), 30-day sessions, httpOnly cookies.

See [`CLAUDE.md`](CLAUDE.md) for the deep reference used by contributors.

---

## 🧰 Tech stack

- **[SvelteKit 2](https://kit.svelte.dev)** + **[Svelte 5](https://svelte.dev)** (runes)
- **[Drizzle ORM](https://orm.drizzle.team)** + **[@libsql/client](https://github.com/tursodatabase/libsql-client-ts)** (SQLite)
- **[Mozilla Readability](https://github.com/mozilla/readability)** + **[jsdom](https://github.com/jsdom/jsdom)** — article extraction
- **[Tailwind CSS v4](https://tailwindcss.com)** + **[@tailwindcss/typography](https://github.com/tailwindlabs/tailwindcss-typography)** — prose styling
- **[lucide-svelte](https://lucide.dev)** — icons
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** — password hashing
- **[CUID2](https://github.com/paralleldrive/cuid2)** — primary keys
- **[Lingva](https://github.com/thedaviddelta/lingva-translate)** — translation proxy

---

## 🗺️ Roadmap

Not promises — a rough direction. Open an issue to vote or propose changes.

- **Server-side reminder delivery** (email + push). Schema is in place; firing is the missing piece.
- **Scroll position persistence** so the reader reopens where you left off.
- **Reader typography controls** — font size, measure width, line height.
- **More importers** — Pocket, Instapaper, Raindrop.
- **Browser extension / bookmarklet** for one-click save from any page.
- **Mobile apps** — PWA first, native shells to follow.
- **Export** — one-click backup to Readwise-compatible CSV.
- **Full-text similarity** (body-aware, not just title) using SQLite vector extensions.

---

## 🤝 Contributing

**PRs, issues, and discussions are all welcome.** Someday is a small project and a friendly one — come as you are.

**Quickstart:**

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
npm install
npm run dev          # dev server on port 5173
```

Before opening a PR:

```bash
npm run check        # type-check with svelte-check — the primary correctness signal
```

There's no test suite yet; `svelte-check` is what CI would run. Keep changes focused, match the existing style, and update [`CLAUDE.md`](CLAUDE.md) if you change architecture.

**Conventions:**
- Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`) — no legacy Options API.
- Scoped `<style>` blocks with CSS custom properties — no Tailwind utility classes in component markup.
- `lucide-svelte@0.577.0` for icons (specific version — 1.0.1 breaks Svelte 5 stable).

**Where to start:**
- Browse [good-first-issue](https://github.com/heindewilde/someday/labels/good%20first%20issue) labels.
- Join [Discussions](https://github.com/heindewilde/someday/discussions) for design questions.
- Anything on the roadmap is fair game — say hi on the relevant issue before starting large work.

---

## ❓ FAQ

**Why another read-later app?**
Because the good ones are either expensive SaaS (Readwise Reader, Matter), increasingly stagnant (Pocket, Instapaper), or beautifully bare-bones (most self-hosted options). Someday aims for the middle: feature depth without the subscription or the data surrender.

**How does it compare to Pocket / Instapaper / Readwise Reader?**
Roughly feature-par with Pocket and Instapaper on saving, reading, tagging, and archiving. Closer to Readwise Reader on highlights, smart organization, and discovery — but without the cloud-only lock-in or monthly bill.

**Can I run this on a Raspberry Pi?**
Yes. A Pi 4 with 2 GB RAM handles a single-user library of thousands of articles comfortably. The Docker image runs on `arm64` and `amd64`.

**Is my reading list truly private?**
Yes. Someday makes outbound HTTP calls in three scenarios: (1) fetching the article URL you save, (2) fetching favicons/cover images referenced by that article, and (3) if you click *Translate*, proxying text to the public Lingva instance. That's it. No telemetry, no analytics, no third-party SDKs.

**Can I import my existing library?**
Readwise Reader CSV is supported natively today. Other formats are on the roadmap; in the meantime the Readwise CSV schema is simple enough to convert into from most exports.

**Does it work offline?**
The reader works fine once an article is saved (the HTML is stored in SQLite). Saving new articles, translation, and similar-article search need network access.

**What happens to my data if I stop self-hosting?**
You have the `data/someday.db` file. It's a plain SQLite database — you can open it in [DB Browser for SQLite](https://sqlitebrowser.org/), query it with any SQLite client, or import it into a different tool. No lock-in by design.

---

## 🙏 Acknowledgements

- **[Mozilla Readability](https://github.com/mozilla/readability)** — the article-extraction engine that makes reading-mode apps possible.
- **[Lingva](https://github.com/thedaviddelta/lingva-translate)** and its public instance maintainers — free, private translation without a Google API key.
- **[SvelteKit](https://kit.svelte.dev)** and **[Drizzle](https://orm.drizzle.team)** teams for building tools that make small projects feel powerful.
- **[lucide](https://lucide.dev)** for icons that look good at any size.
- Everyone who self-hosts, files issues, and keeps the open web open.

---

## 📜 License

**AGPL-3.0.** See [`LICENSE`](LICENSE) for the full text.

In plain English:
- You can **run** Someday on your own server, for yourself or your family or your company, forever, for free.
- You can **modify** the source code however you like.
- If you **offer modified Someday as a network service to others** (i.e. you build a paid hosted version), you must publish your modifications under AGPL-3.0 too.

This is deliberate — Someday is and will remain open. If AGPL concerns you and you'd like different terms, open a discussion.
