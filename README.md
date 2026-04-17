# Someday

The free, open source, lightweight read-it-later app. Save articles, tag them, read them whenever.

---

## Self-hosting

Someday is a single Docker container with a single SQLite file. No database server, no Redis, no external services required.

### Requirements

- Docker, **or** Node.js 20+

### Docker Compose (recommended)

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
cp .env.example .env
```

Edit `.env` — set `ORIGIN` to the URL you'll serve the app from:

```env
ORIGIN=https://someday.yourdomain.com
```

Start it:

```bash
docker compose up -d
```

The app runs on port 3000 by default. To use a different port set `PORT=8080` in `.env`.

Your data is stored in a Docker named volume (`someday-data`) and persists across restarts and upgrades.

### Without Docker

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
cp .env.example .env   # edit ORIGIN
npm install
npm run build
node build
```

### Upgrading

```bash
git pull
docker compose up -d --build
```

Data is untouched during upgrades.

---

## Reverse proxy

If you're running Someday behind a reverse proxy (nginx, Caddy, Traefik, etc.), point it at port 3000 and make sure it passes the `Host` and `X-Forwarded-*` headers. Set `ORIGIN` to your public URL.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `./data/someday.db` | Path to the SQLite database file |
| `ORIGIN` | `http://localhost:3000` | Public URL your instance is served from |
| `PORT` | `3000` | Port to listen on |

---

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — framework
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — database
- [Mozilla Readability](https://github.com/mozilla/readability) — article parsing
- [Tailwind CSS v4](https://tailwindcss.com) — styling

## License

MIT
