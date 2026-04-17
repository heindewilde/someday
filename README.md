# Someday

The free, open source, lightweight read-it-later app. Save articles, tag them, read them whenever.

---

## Self-hosting

Someday runs as a single process with a single SQLite file. No database server, no Redis, no external services.

### Option 1 — Docker Compose (recommended)

**Requirements:** Docker

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
```

Copy the example config and set your public URL:

```bash
cp .env.example .env
```

Open `.env` and set `ORIGIN` to the URL you'll access the app from (required in production):

```env
ORIGIN=https://someday.yourdomain.com
```

Start the app:

```bash
docker compose up -d
```

The app is now running on port 3000. Your data is stored in a Docker named volume (`someday-data`) and persists across restarts and upgrades.

**To use a different port**, set `PORT=8080` in `.env` before starting.

### Option 2 — Node.js

**Requirements:** Node.js 20+

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
npm install
npm run build
PORT=3000 ORIGIN=http://localhost:3000 node build
```

`PORT` and `ORIGIN` must match — `PORT` is what the server listens on, `ORIGIN` is the URL you open in your browser. To run on a different port, change both:

```bash
PORT=7777 ORIGIN=http://localhost:7777 node build
```

Data is written to `./data/someday.db` by default.

### Upgrading

```bash
git pull
docker compose up -d --build
```

Data is untouched during upgrades.

---

## Reverse proxy

Point nginx, Caddy, or Traefik at port 3000. Make sure it forwards `Host` and `X-Forwarded-*` headers, and set `ORIGIN` to your public URL.

Example Caddy config:

```
someday.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## Configuration

All config is set via environment variables (or in `.env`):

| Variable | Default | Description |
|---|---|---|
| `ORIGIN` | `http://localhost:3000` | Public URL the app is served from. Required in production. |
| `PORT` | `3000` | Port to listen on |
| `DB_PATH` | `./data/someday.db` | Path to the SQLite database file |

---

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — framework
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — database
- [Mozilla Readability](https://github.com/mozilla/readability) — article parsing
- [Tailwind CSS v4](https://tailwindcss.com) — styling

## License

MIT
