# Sari-Sari Store Inventory & Sales App

A mobile-first PWA for a small sari-sari store: record sales in a few taps,
automatically track profit and stock, run a weekly physical inventory count,
and export everything to Excel.

Built with Nuxt 4 + Tailwind 4 + Drizzle ORM.

## Quick start

```bash
npm install
cp .env.example .env
npm run hash-password -- <your-password>   # paste into STORE_PASSWORD_HASH in .env
npm run dev
```

Open http://localhost:3000, install as a PWA via "Add to Home Screen" on
mobile, and sign in with the configured account.

No database setup is required for local development — the app runs on an
embedded [PGlite](https://pglite.dev) database stored in `.data/pglite/`
(configurable via `PGLITE_DIR`).

## Environment variables

See `.env.example`. In short:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Leave unset for local dev (uses PGlite). Set to a Postgres/Supabase connection string in production. |
| `PGLITE_DIR` | Where the embedded dev database is stored on disk. |
| `STORE_USERNAME` | Username for the first account created on an empty database. Defaults to `admin`. |
| `STORE_DISPLAY_NAME` | Display name for the first account. Defaults to `Administrator`. |
| `STORE_PASSWORD_HASH` | Password hash for the first account. Generate with `npm run hash-password -- <password>`. |
| `SESSION_SECRET` | Random string used to sign the login session cookie. |

## Moving to Supabase + Vercel

The data layer is Drizzle ORM using the Postgres dialect throughout, so the
same SQL migrations that run against the embedded PGlite database in
development also run against a real Postgres database — only `DATABASE_URL`
changes:

1. Create a Supabase project and copy its Postgres connection string.
2. Set `DATABASE_URL`, `STORE_USERNAME`, `STORE_DISPLAY_NAME`, `STORE_PASSWORD_HASH`, and `SESSION_SECRET` as environment
   variables in Vercel (and locally in `.env` if you want to test against it).
3. Run `npm run db:migrate` to apply the schema to that database.
4. Deploy to Vercel as a normal Nuxt app.

Note: because the app talks to its own Nitro server rather than directly to
`supabase-js` from the browser, the database credential never reaches the
client — Supabase Row Level Security is not required for this to be safe, but
can be added later if the app is ever changed to query Supabase directly from
the client.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate a new Drizzle migration after editing `server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL` if set, otherwise PGlite) |
| `npm run hash-password -- <password>` | Hash a password for `STORE_PASSWORD_HASH` |
| `npm run test:unit` | Run unit tests (date/timezone logic) |
| `npm run test:e2e` | Run the Playwright E2E suite against a disposable test database |

## Importing the existing Excel inventory

Settings → Import Inventory Spreadsheet. The importer expects the store's
existing format (no header row; columns are Product, Variant, Quantity, with
blank Product cells meaning "same product as the row above"), or a header-based
sheet naming Product/Variant/Quantity/Cost/Selling columns. Products without a
cost and selling price land in **Products → Needs Pricing Queue** and cannot be
sold until priced.
