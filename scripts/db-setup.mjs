#!/usr/bin/env node
/**
 * Create the database tables (db/schema.sql) and load content/site.json
 * into them.
 *
 *   npm run db:setup            create tables, add any pages/posts not yet in the DB
 *   npm run db:setup -- --reset-content
 *                               overwrite DB pages/posts with content/site.json
 *                               (loses edits made in /admin; asks no questions)
 *
 * Runs automatically before `next build` when DATABASE_URL is set, so a fresh
 * Neon database is filled on the first deploy. Existing rows are never changed
 * unless --reset-content is passed, so edits made in /admin survive deploys.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db:setup: DATABASE_URL not set, skipping (the site will use content/site.json).");
  process.exit(0);
}
const reset = process.argv.includes("--reset-content");

const q = await connect(url);

// 1. schema
const schema = fs
  .readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8")
  .replace(/--[^\n]*/g, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
for (const stmt of schema) await q(stmt);
console.log(`db:setup: schema ok (${schema.length} statements)`);

// 2. content
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "site.json"), "utf8"));
if (site.entries.every((e) => !e.html)) {
  console.log("db:setup: content/site.json has no article text yet (run npm run import:wp first); not loading it.");
  await q.end?.();
  process.exit(0);
}

for (const c of site.categories) {
  await q(
    `INSERT INTO categories (slug, name, description) VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO ${reset ? "UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description" : "NOTHING"}`,
    [c.slug, c.name, c.description ?? ""],
  );
}

let added = 0, updated = 0;
for (const e of site.entries) {
  const values = [
    e.type, e.slug, e.title, e.date, e.modified ?? e.date ?? new Date().toISOString(),
    e.featuredImage, e.excerpt ?? "", e.html ?? "", e.seoTitle, e.seoDescription,
  ];
  const rows = await q(
    `INSERT INTO entries (type, slug, title, published_at, updated_at, featured_image, excerpt, html, seo_title, seo_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (slug) DO ${reset
       ? `UPDATE SET type = EXCLUDED.type, title = EXCLUDED.title, published_at = EXCLUDED.published_at,
          updated_at = EXCLUDED.updated_at, featured_image = EXCLUDED.featured_image, excerpt = EXCLUDED.excerpt,
          html = EXCLUDED.html, seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, status = 'published'`
       : "NOTHING"}
     RETURNING id, (xmax = 0) AS inserted`,
    values,
  );
  if (!rows.length) continue;
  rows[0].inserted ? added++ : updated++;
  const id = rows[0].id;
  await q(`DELETE FROM entry_categories WHERE entry_id = $1`, [id]);
  for (const [i, slug] of (e.categories ?? []).entries())
    await q(
      `INSERT INTO entry_categories (entry_id, category_slug, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [id, slug, i],
    );
}
const [{ n }] = await q(`SELECT count(*)::int AS n FROM entries`);
console.log(`db:setup: content ok (${added} added, ${updated} updated, ${n} pages/posts in database)`);
await q.end?.();

// ---------------------------------------------------------------------------
async function connect(url) {
  if (/\.neon\.tech/.test(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return (text, params = []) => sql.query(text, params);
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url });
  const fn = async (text, params = []) => (await pool.query(text, params)).rows;
  fn.end = () => pool.end();
  return fn;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
