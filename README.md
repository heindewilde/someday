# Someday

The free, open source, lightweight read-it-later app.

Save articles by pasting a URL. Tag them. Read them whenever.

## Features

- Save articles by pasting a URL — or press Cmd+V anywhere on the page
- Full article extraction via Mozilla Readability
- Tags, collections, favorites, archive
- Reading time estimates
- Email + password auth
- Single SQLite file — no external dependencies
- Self-hostable in one command

## Running locally

```bash
cp .env.example .env
npm install
npm run dev
```

## Self-hosting with Docker

```bash
docker compose up -d
```

The app runs on port 3000. Data is stored in `./data/someday.db`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `./data/someday.db` | Path to the SQLite database file |

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — framework
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — database
- [Mozilla Readability](https://github.com/mozilla/readability) — article parsing
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing

## License

MIT
