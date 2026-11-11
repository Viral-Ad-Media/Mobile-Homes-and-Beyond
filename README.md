# Mobile Homes & Beyond — Next.js

A static Next.js (App Router) rebuild of mobilehomesandbeyond.com, made from the
2026-10-19 WordPress backup.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (all pages are pre-rendered)
npm start
```

## Where the content lives

- `content/site.json` holds every page, post and category.
- `public/wp-content/uploads/` holds the original images at their original
  paths, so links inside old posts keep working.
- `app/fonts.css` + `public/fonts/` are self-hosted copies of the original
  fonts (Ubuntu for headings, Hind Siliguri for body text). Colours come from
  the original Elementor kit (`#4D7A4D` green).

The file backup did **not** include the database, so `content/site.json` is
currently a seed built from the Rank Math sitemaps: correct URLs, dates,
images and banner titles, but no article text. To load the real text, export
the database (phpMyAdmin → Export → SQL; tables use the `f5_` prefix) and run:

```bash
npm run import:wp -- path/to/database.sql     # .sql.gz also works
```

The importer reads the dump as text (nothing in it is executed), keeps only
published posts and pages, converts site links to relative ones, renders
TablePress tables and Elementor content, drops shortcodes, and sanitises
every body so scripts injected by the hack are removed. It prints any images
that are referenced but missing, and any posts that contained suspicious code.

## URLs

Slugs match WordPress exactly (`/slug/`, categories at `/rock-skirting/` etc.).
`next.config.ts` also 301-redirects the fake URLs the hack created
(e.g. `/mobile-homes-fiber-cement-skirting/`) to the real articles.

## Security note

The old WordPress install was compromised (malicious `mu-plugins`, fake
proxy folders, a replaced `sitemap.xml`). None of that code is in this
project. Before pointing DNS here, rotate the hosting, WordPress and database
passwords.
