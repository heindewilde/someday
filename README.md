<!-- TODO: drop logo file at docs/logo.svg (or .png). Recommended size: 120×120. -->
<p align="center">
  <img src="docs/logo.svg" alt="Someday" width="120" />
</p>

<h1 align="center">Someday</h1>

<p align="center">
  <em>A calm, self-hosted read-later app.<br/>Save anything, read anywhere, own your data.</em>
</p>

<p align="center">
  <a href="https://github.com/heindewilde/someday/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/heindewilde/someday/actions/workflows/ci.yml/badge.svg"></a>
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

**Private by default.** Your reading list shouldn't live on someone else's server. Someday runs entirely on hardware you control, with no tracking, no telemetry, and no third-party accounts to sign in to. Your library never leaves your server.

**Lightweight and fast.** One small app, one database file — that's the whole stack. It boots in seconds, idles on almost nothing, and stays snappy even with thousands of articles saved. Happy on a Raspberry Pi, a spare corner of your home server, or a $5 VPS.

**Feature-packed where it counts.** Most self-hosted read-later apps are beautiful but thin. Someday ships the things you'd actually pay for: email-to-save, Readwise import, highlights with notes, smart collections, similar-article discovery, 15-language translation, and full-text search — all running locally against your own data.

**Beautifully designed.** A distraction-free reader, keyboard-first navigation, thoughtful typography, hand-tuned light and dark themes, and a mobile layout that actually works. Designed for the "slow web."

> **Private, lightweight, and fast — by design.** One process, one database file, one `docker compose up`. No external services, no analytics, no heavy stack to maintain. Starts in seconds, happy on a Raspberry Pi.
> [Jump to self-hosting →](#-self-hosting)

---

## Someday in 30 seconds

<table>
<tr>
<td width="33%" valign="top">

### 📥 Save from anywhere
Paste a URL, `⌘V` from the clipboard, forward an email, or drop a Readwise CSV. Auto-detects PDFs, products, and tweets.

</td>
<td width="33%" valign="top">

### 📖 Read beautifully
A distraction-free reader with thoughtful typography, light and dark themes, and one-click PDF export.

</td>
<td width="33%" valign="top">

### 🏷️ Organize lightly
Tags for quick labels, collections for curated reading lists. Filter by status, reading time, or source domain.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### ✨ Highlight & recall
Select-to-highlight with inline notes and a side panel that follows you through the article.

</td>
<td width="33%" valign="top">

### ⚡ Fast & lightweight
Boots in seconds, idles on almost nothing, runs on a Raspberry Pi. Fewer moving parts, fewer things to break.

</td>
<td width="33%" valign="top">

### 🔒 Own your data
One database file. Take a copy and walk away whenever. AGPL-3.0 — you have the right to study and modify every line.

</td>
</tr>
</table>

---

## Feature tour

### 📥 Save from anywhere

<!-- TODO: docs/screenshots/save.png -->

- **Paste-to-save** from the topbar, or hit `⌘V` / `Ctrl+V` anywhere to save the URL on your clipboard.
- **Bookmarklet** — drag the "Save to Someday" button from Settings to your bookmarks bar and save any page in one click, without leaving the tab.
- **Email-to-save** — forward any newsletter or article to your Someday address and it lands in your library seconds later, with the sender as byline. [Setup guide below.](#-email-to-save-postmark)
- **Readwise Reader CSV import** preserves tags, read/unread state, archive state, and saved date. Runs in the background with a progress bar.
- **Automatic handling** for PDFs (saved as bookmarks), product pages (metadata-only), and tweets.
- **Tracking parameters removed** so shared links stay clean.
- **No duplicates** — re-saving a URL is a no-op.

### 📖 A reader that gets out of the way

<!-- TODO: docs/screenshots/reader.png -->

- **Readability-powered extraction** strips ads, nav, pop-ups, and sidebars so you just read the article.
- **Typography tuned for long reading** — hand-picked font, comfortable measure, calm line-height.
- **Light and dark themes**, one-click toggle, remembers your choice.
- **Paywall detection** flags subscription-gated articles with a badge before you click through.
- **Source badges** tell you at a glance whether an article came in via email, is a product page, or a PDF.
- **Save any article as a PDF** via your browser's print dialog.
- **Cover images, favicons, authors, and reading time** — captured once, there whenever you open the article.

### ⚡ Fast & lightweight

<!-- TODO: docs/screenshots/speed.png (optional - could be a screenshot of the app with a load time indicator or just skip) -->

- **Boots in seconds.** No warm-up, no background sync jobs, no dashboards to load.
- **Tiny footprint.** One small container, one database file. Happy on a Raspberry Pi or the smallest VPS your provider sells.
- **Instant everything.** Search, filter, open an article — everything feels snappy, even with thousands of articles in your library.
- **No moving parts.** No external database, no Redis, no message queue. Fewer things to configure, fewer things to break, fewer things to update.
- **Grows with your archive.** Designed to stay fast as your library grows into the tens of thousands.

### ✨ Highlights & notes

<!-- TODO: docs/screenshots/highlights.png -->

- **Select-to-highlight** in the reader — toggle highlight mode and drag across any passage.
- **Your highlights stick.** They survive translations, theme switches, and revisits.
- **Per-highlight notes** — click any highlight to edit, annotate, or delete.
- **Side panel** lists every highlight in an article, with jump-to-text on click.

### 🏷️ Tags vs. collections

Two organization primitives — use either, both, or neither.

| | **Tags** | **Collections** |
|---|---|---|
| **Purpose** | Flexible labels | Curated reading lists |
| **Creation** | Auto on first use | Explicit, you name them |
| **Renaming** | Merges on conflict | Simple rename |
| **Filters** | Respects read/unread | Shows everything in the list |

Plus built-in filters for **Unread**, **Read**, **Favorites**, and **Archive**, reading time (`< 5 min` … `> 20 min`), and source domain.

### 🔍 Full-text search

<!-- TODO: docs/screenshots/search.png -->

- **Searches every article** — titles and full body text, including pieces you saved months ago.
- **Partial matches work by default.** Type `react` and find `reactive` and `reactor` too.
- **Ranked by relevance**, not just date, and results arrive instantly as you type.
- **Scoped to your library**, respects whichever filter view you're in.

### ✨ Similar articles

For every article you open, Someday surfaces up to five related pieces from your own library. Great for rediscovery — save an article today, and the next time you open it you'll see the related pieces you'd forgotten you'd saved.

### 🌐 Translate anything

<!-- TODO: docs/screenshots/translate.png -->

- **Translate any saved article** into one of 15 languages with a click: English, Spanish, French, German, Portuguese, Italian, Dutch, Polish, Russian, Japanese, Chinese, Korean, Arabic, Turkish, Swedish.
- **Formatting is preserved.** Headings, lists, and quotes keep their structure — you get a clean translated article, not a wall of text.
- **Fast even on long articles.**
- **No API keys required.** Translation is powered by [Lingva](https://github.com/thedaviddelta/lingva-translate), a privacy-respecting proxy for Google Translate. By default it uses the public `lingva.ml` instance — set `LINGVA_URL` to your own instance if you prefer to keep article text entirely off third-party servers.

### 🔔 Reminders

- Pick any future datetime (defaults to tomorrow 9 am). One reminder per article.
- The bell icon shows a dot when any reminder is due within 24 hours.
- Upcoming reminders live in the sidebar, sorted by time, with click-to-cancel and a generous undo window.

> Reminders are stored today; delivery via email/push is on the [roadmap](#-roadmap).

### ⌨️ Keyboard-first

Someday is built for readers who prefer their hands on the keyboard. Navigate the library, open articles, toggle read/favorite/archive, save from the clipboard, and dismiss menus — all without reaching for the mouse. Hit `?` anywhere in the app to see every available shortcut.

### 📱 Mobile & PWA

<!-- TODO: docs/screenshots/mobile.png -->

Works beautifully on phones, tablets, and desktops. The layout adapts gracefully from your pocket to a 4K monitor, with a hamburger sidebar and touch-friendly controls on small screens. Someday ships as a **Progressive Web App** — add it to your home screen from any browser for a full-screen, app-like experience on iOS and Android, no app store required.

### 🌙 Dark mode

<!-- TODO: docs/screenshots/dark-mode.png -->

Dark mode is a first-class citizen — both themes are hand-tuned, not auto-inverted. Toggle with one click; your preference is remembered.

---

## Two ways to use Someday

|  | **☁️ Cloud (someday.sh)** | **🏠 Self-host** |
|---|---|---|
| **Setup** | Sign up — zero config | Docker Compose, 5 minutes |
| **Storage** | Managed, encrypted | Your database file |
| **Updates** | Automatic | `git pull && docker compose up -d --build` |
| **Backups** | Automated, offsite | Your cron, your volume |
| **Cost** | Free during beta | Free (you pay for hosting) |
| **Privacy** | Hosted by us | Never leaves your server |
| **Best for** | "I just want to read." | "I want to own every byte." |

Both run the exact same open-source code.

---

## ☁️ Cloud — someday.sh

Someday is available as a managed service at **[someday.sh](https://someday.sh/)**.

**What you get:**
- Everything in this README, zero setup
- Managed updates and security patches
- Automated offsite backups
- Same AGPL-3.0 code, just hosted for you

**[Get started →](https://someday.sh/)**

---

## 🏠 Self-hosting

Someday runs as a **single process** with a **single database file**. No database server, no Redis, no queue, no external dependencies beyond Node. That's what makes it lightweight enough to self-host comfortably on modest hardware.

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

Prebuilt multi-arch images (`amd64` + `arm64`) are published to GitHub Container Registry on every push to `main`:

```bash
docker run -d --name someday -p 3000:3000 \
  -v someday-data:/app/data \
  -e ORIGIN=http://localhost:3000 \
  ghcr.io/heindewilde/someday:latest
```

Pin to a specific release with `:v1.2.3` instead of `:latest`. To build from source instead, clone the repo and run `docker build -t someday .`.

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

No manual migration step. Schema changes are applied automatically at startup. Your data is untouched during upgrades.

### Backups

The entire app lives in `data/someday.db`. Back it up however you'd back up any SQLite file.

**Live backup (no downtime):**

```bash
sqlite3 /path/to/data/someday.db ".backup /path/to/backups/someday-$(date +%F).db"
```

**Daily cron:**

```cron
0 3 * * * sqlite3 /srv/someday/data/someday.db ".backup /backups/someday-$(date +\%F).db"
```

**Offsite:** pipe to `restic`, `rclone`, or `rsync` to your destination of choice. The database file is the whole app — no config, assets, or state lives outside of it.

### Reverse proxy

Point your proxy at port 3000, forward `Host` and `X-Forwarded-*` headers, and set `ORIGIN` to your public URL.

If you're behind a proxy and want the auth rate limiter to see real client IPs (rather than the proxy's IP), also set `ADDRESS_HEADER=x-forwarded-for` and `XFF_DEPTH=1` on the Someday container. Increase `XFF_DEPTH` if you have more than one proxy hop.

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
| `DISABLE_REGISTRATION` | — | No | Set to `true` to block new signups. The first account can always be created so you can bootstrap your own instance with this already on. |
| `INBOUND_EMAIL_SECRET` | — | No | Shared secret for the Postmark inbound-email webhook. Required only if you're enabling email-to-save. |
| `LINGVA_URL` | `https://lingva.ml` | No | Lingva translation instance to proxy to. The default public instance works out of the box. Override with your own Lingva instance if you want translation to stay entirely off third-party servers. |

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

Not natively supported yet — [open an issue](https://github.com/heindewilde/someday/issues) to vote on priority. In the meantime, most of these services export a CSV that can be massaged into the Readwise schema with a spreadsheet or a few lines of `awk`.

---

## 🏗️ Architecture at a glance

For the technically curious:

- **Single-process SvelteKit app**, server-rendered. No separate API, no microservices.
- **One SQLite file** for everything. Local by default; remote libSQL / Turso supported if you want it.
- **Full-text search and similarity live inside SQLite** — no separate search engine to run or maintain.
- **Article parsing happens in the background**, so saves are instant.
- **Migrations and maintenance run automatically at startup.** No manual steps to remember on upgrade.
- **Session auth** with bcrypt-hashed passwords and httpOnly cookies. Open registration; every user's library is isolated.


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

- **Server-side reminder delivery** (email + push).
- **Reader typography controls** — font size, measure width, line height.
- **More importers** — Pocket, Instapaper, Raindrop.
- **Export** — one-click backup to Readwise-compatible CSV.
- **Native mobile shells** — wrapping the PWA for App Store / Play Store distribution.

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

There's no test suite yet; `svelte-check` is what CI would run. Keep changes focused, match the existing style, and update the Architecture section of this README if you change how the system is structured.

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
Because the good ones are either expensive SaaS (Readwise Reader, Matter), increasingly stagnant (Pocket, Instapaper), or beautifully bare-bones (most self-hosted options). Someday aims for the middle: feature depth without the subscription or the data surrender — in a package light enough to run on a Pi.

**How does it compare to Pocket / Instapaper / Readwise Reader?**
Roughly feature-par with Pocket and Instapaper on saving, reading, tagging, and archiving. Closer to Readwise Reader on highlights, smart organization, and discovery — but without the cloud-only lock-in or the monthly bill.

**Can I run this on a Raspberry Pi?**
Yes. A Pi 4 with 2 GB RAM handles a single-user library of thousands of articles comfortably. The Docker image runs on both `arm64` and `amd64`.

**Is my reading list truly private?**
Yes, with one nuance. Someday only reaches out to the internet for three things: (1) fetching the article URL you save, (2) fetching the favicon and cover image that article references, and (3) if you click *Translate*, proxying the article text through [Lingva](https://github.com/thedaviddelta/lingva-translate) — a privacy-respecting Google Translate proxy that strips tracking identifiers. By default this goes through the public `lingva.ml` instance. If you want translation to stay entirely on-premises, run your own Lingva instance and point `LINGVA_URL` at it. No telemetry, no analytics, no third-party SDKs.

**Can I import my existing library?**
Readwise Reader CSV is supported natively today. Other formats are on the roadmap; in the meantime the Readwise CSV schema is simple enough to convert into from most exports.

**Does it work offline?**
The reader works fine once an article is saved (the article is stored locally). Saving new articles, translation, and similar-article search need network access.

**What happens to my data if I stop self-hosting?**
You have the database file. It's a plain SQLite database — you can open it in [DB Browser for SQLite](https://sqlitebrowser.org/), query it with any SQLite client, or import it into a different tool. No lock-in by design.

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
