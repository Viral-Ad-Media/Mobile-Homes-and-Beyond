# Mobile Homes and Beyond — Next.js + Neon + Better Auth

A rebuild of mobilehomesandbeyond.com (formerly WordPress) in Next.js 16. The
content lives in Neon Postgres, and a small `/admin` area protected by
Better Auth lets you edit it.

## What's where

| Path | What it is |
| --- | --- |
| `app/` | Public site (home, blog, posts, pages and categories at the original WordPress URLs) and `/admin` |
| `lib/content.ts` | Reads content from Neon, or from `content/site.json` when no `DATABASE_URL` is set |
| `lib/auth.ts` | Better Auth with email and password. There is no public sign-up: only the first account, matching `ADMIN_EMAIL`, can be created |
| `db/schema.sql` | Tables for content and for Better Auth (mirrored in `lib/db/schema.ts`) |
| `content/site.json` | All posts and pages, imported from the WordPress database. It seeds Neon |
| `public/wp-content/uploads/` | Original images at their original paths |
| `scripts/import-wordpress.mjs` | WordPress SQL dump → `content/site.json` |
| `scripts/db-setup.mjs` | Creates the tables and loads `content/site.json` into the database |
| `next.config.ts`, `proxy.ts` | Redirects old and hacked URLs; adds WordPress-style trailing slashes |

## Environment variables

Copy `.env.example` to `.env.local` (or set these in your host, e.g. Vercel):

- `DATABASE_URL`: the Neon connection string (Neon console → project
  **mobile-homes-and-beyond** → Connect)
- `BETTER_AUTH_SECRET`: a long random string (`openssl rand -base64 32`)
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL`: the public URL, e.g. `https://mobilehomesandbeyond.com`
- `ADMIN_EMAIL`: the email allowed to create the admin account

## Run / deploy

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # runs db:setup (tables + content, if missing) then next build
npm start
```

`npm run build` creates the tables and loads any posts that aren't in the
database yet, so the first deploy fills an empty Neon database. It never
overwrites rows that already exist, so edits made in `/admin` survive later
deploys.

## Admin

1. Deploy with the environment variables above.
2. Visit `/admin/setup/` and create your account using the `ADMIN_EMAIL` address. This works only once.
3. Sign in at `/admin/login/`. You can then edit, add, draft or delete posts
   and pages. Saving updates the live site immediately. Bodies are HTML and are
   sanitised on save, so scripts are stripped.

## Re-importing from WordPress

```bash
npm run import:wp -- path/to/database.sql          # writes content/site.json
npm run db:setup -- --reset-content                # overwrites DB content (loses /admin edits)
```

The importer parses the dump as text without running any of it. It keeps
published posts and pages, fixes old internal links, renders TablePress and
Elementor content, and sanitises every body.

## Security note

The old WordPress install was compromised: it had malicious `mu-plugins`, fake
proxy folders and a replaced `sitemap.xml`. None of that code is in this
project. Rotate the hosting, WordPress and database passwords.
