# Someday

The free, open source, lightweight read-it-later app. Save articles, tag them, read them whenever.

**[Live demo](https://library.heindewilde.com)** · [Report an issue](https://github.com/heindewilde/someday/issues)

---

## Self-hosting

Someday is a single Docker container + a single SQLite file. No database server, no Redis, no external services.

### Option 1 — Docker Compose (recommended)

**Requirements:** Docker

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
cp .env.example .env
```

Edit `.env` and set `ORIGIN` to the URL you'll access the app from:

```env
ORIGIN=https://library.yourdomain.com
```

Then start it:

```bash
docker compose up -d
```

The app runs on port 3000 by default. To use a different port:

```bash
PORT=8080 docker compose up -d
```

Your data lives in a Docker volume (`someday-data`). It persists across restarts and upgrades.

### Option 2 — Run directly with Node

**Requirements:** Node.js 20+

```bash
git clone https://github.com/heindewilde/someday.git
cd someday
cp .env.example .env
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

## Deploying to a server

### Fly.io (free tier)

```bash
fly launch        # follow prompts, choose a small shared-cpu VM
fly volumes create someday_data --size 1
```

Add to `fly.toml`:
```toml
[mounts]
  source = "someday_data"
  destination = "/app/data"
```

```bash
fly deploy
fly secrets set ORIGIN=https://your-app.fly.dev
```

### Any VPS (Hetzner, DigitalOcean, etc.)

1. Install Docker on the server
2. Clone the repo and follow the Docker Compose instructions above
3. Point your domain at the server IP with an A record
4. Use [Caddy](https://caddyserver.com) or nginx as a reverse proxy for HTTPS

Example Caddy config:
```
library.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `./data/someday.db` | Path to SQLite database |
| `ORIGIN` | `http://localhost:3000` | Public URL of your instance |
| `PORT` | `3000` | Port to listen on |

---

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — framework
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — database
- [Mozilla Readability](https://github.com/mozilla/readability) — article parsing
- [Tailwind CSS v4](https://tailwindcss.com) — styling

## License

MIT
