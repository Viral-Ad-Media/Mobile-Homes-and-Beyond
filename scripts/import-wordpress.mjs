#!/usr/bin/env node
/**
 * Import pages, posts and categories from a WordPress MySQL dump into
 * content/site.json, which the Next.js site renders.
 *
 *   npm run import:wp -- path/to/dump.sql        (or .sql.gz)
 *   npm run import:wp -- dump.sql --prefix f5_   (table prefix; auto-detected otherwise)
 *
 * Works with mysqldump and phpMyAdmin exports. Nothing in the dump is executed:
 * the INSERT statements are parsed as text, and every post body is passed
 * through sanitize-html, so scripts or iframes injected by the hack are dropped.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import sanitizeHtml from "sanitize-html";
import { sanitizeBody } from "../lib/sanitize.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "content", "site.json");
const PUBLIC = path.join(ROOT, "public");
const SITE_HOSTS = /https?:\/\/(?:www\.)?mobilehomesandbeyond\.com/gi;

// ---------- args ----------
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const prefixArg = args.includes("--prefix") ? args[args.indexOf("--prefix") + 1] : null;
if (!file) {
  console.error("Usage: npm run import:wp -- <dump.sql|dump.sql.gz> [--prefix wp_]");
  process.exit(1);
}
let sql = fs.readFileSync(file);
if (file.endsWith(".gz")) sql = zlib.gunzipSync(sql);
sql = sql.toString("utf8");

const prefix =
  prefixArg ??
  (sql.match(/(?:CREATE TABLE|INSERT INTO)\s+`?(\w+?)posts`?[\s(]/i) || [])[1] ??
  "wp_";
console.log(`Table prefix: ${prefix}`);

// ---------- SQL parsing ----------
function columnsFromCreate(table) {
  const m = sql.match(new RegExp("CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?`?" + table + "`?\\s*\\(([\\s\\S]*?)\\)\\s*(?:ENGINE|;)", "i"));
  if (!m) return null;
  return m[1]
    .split("\n")
    .map((l) => l.trim().match(/^`(\w+)`/))
    .filter(Boolean)
    .map((x) => x[1]);
}

/** Parse "(a,'b',NULL),(...)" starting at index i; returns [rows, endIndex]. */
const ESC = { n: "\n", r: "\r", t: "\t", 0: "\0", Z: "\x1a", b: "\b" };
function parseTuples(s, i) {
  const rows = [];
  let row = null;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (row === null) {
      if (c === "(") { row = []; i++; continue; }
      if (c === ";") return [rows, i];
      i++; continue;
    }
    // inside a row: read one value
    while (s[i] === " " || s[i] === "\n" || s[i] === "\r" || s[i] === "\t") i++;
    let value;
    if (s[i] === "'") {
      const parts = [];
      let j = ++i;
      for (;;) {
        const q = s.indexOf("'", j), b = s.indexOf("\\", j);
        if (b !== -1 && b < q) {
          parts.push(s.slice(j, b));
          const e = s[b + 1];
          parts.push(ESC[e] ?? e);
          j = b + 2;
        } else if (s[q + 1] === "'") {
          parts.push(s.slice(j, q), "'"); j = q + 2;
        } else {
          parts.push(s.slice(j, q)); i = q + 1; break;
        }
      }
      value = parts.join("");
    } else {
      let j = i;
      while (s[j] !== "," && s[j] !== ")") j++;
      const raw = s.slice(i, j).trim();
      value = /^NULL$/i.test(raw) ? null : raw;
      i = j;
    }
    row.push(value);
    while (s[i] !== "," && s[i] !== ")") i++;
    if (s[i] === ")") { rows.push(row); row = null; }
    i++;
  }
  return [rows, i];
}

function readTable(name) {
  const table = prefix + name;
  let cols = columnsFromCreate(table);
  const out = [];
  const re = new RegExp("INSERT\\s+(?:IGNORE\\s+)?INTO\\s+`?" + table + "`?\\s*(\\(([^)]*)\\))?\\s*VALUES\\s*", "gi");
  let m;
  while ((m = re.exec(sql))) {
    if (m[2]) cols = m[2].split(",").map((c) => c.trim().replace(/`/g, ""));
    const [rows, end] = parseTuples(sql, re.lastIndex);
    re.lastIndex = end;
    for (const r of rows) out.push(Object.fromEntries(cols.map((c, i) => [c, r[i]])));
  }
  console.log(`  ${table}: ${out.length} rows`);
  return out;
}

const posts = readTable("posts");
const postmeta = readTable("postmeta");
const terms = readTable("terms");
const taxonomy = readTable("term_taxonomy");
const relationships = readTable("term_relationships");
const options = readTable("options");
if (!posts.length) {
  console.error(`No rows found for ${prefix}posts. Is this the right file / prefix?`);
  process.exit(1);
}

const meta = new Map();
for (const m of postmeta) {
  if (!meta.has(m.post_id)) meta.set(m.post_id, {});
  meta.get(m.post_id)[m.meta_key] = m.meta_value;
}
const option = (k) => options.find((o) => o.option_name === k)?.option_value ?? null;

// ---------- categories ----------
const termById = new Map(terms.map((t) => [t.term_id, t]));
const cats = taxonomy
  .filter((t) => t.taxonomy === "category")
  .map((t) => ({ ttid: t.term_taxonomy_id, ...termById.get(t.term_id), description: t.description || "", count: +t.count }));
const catByTtid = new Map(cats.map((c) => [c.term_taxonomy_id ?? c.ttid, c]));
const postCats = new Map();
for (const r of relationships) {
  const c = catByTtid.get(r.term_taxonomy_id);
  if (!c) continue;
  if (!postCats.has(r.object_id)) postCats.set(r.object_id, []);
  postCats.get(r.object_id).push(c.slug);
}

// ---------- content helpers ----------
const attachments = new Map(posts.filter((p) => p.post_type === "attachment").map((p) => [p.ID, p]));
function attachmentUrl(id) {
  const file = meta.get(id)?._wp_attached_file;
  if (file) return "/wp-content/uploads/" + file;
  const a = attachments.get(id);
  return a?.guid ? a.guid.replace(SITE_HOSTS, "") : null;
}

const tablepress = new Map();
const tpOption = option("tablepress_tables");
if (tpOption) {
  try {
    for (const [tid, pid] of Object.entries(JSON.parse(tpOption).table_post ?? {})) tablepress.set(String(tid), String(pid));
  } catch {}
}
function renderTablePress(id) {
  const p = posts.find((x) => x.ID === tablepress.get(String(id)));
  if (!p) return "";
  try {
    const rows = JSON.parse(p.post_content);
    const [head, ...body] = rows;
    const cell = (t, v) => `<${t}>${v}</${t}>`;
    return `<table><thead><tr>${head.map((v) => cell("th", v)).join("")}</tr></thead><tbody>${body
      .map((r) => `<tr>${r.map((v) => cell("td", v)).join("")}</tr>`)
      .join("")}</tbody></table>`;
  } catch { return ""; }
}

function wpautop(html) {
  if (/<p[\s>]/i.test(html) || /<!-- wp:/.test(html)) return html;
  const block = /^\s*<(?:h[1-6]|ul|ol|li|table|figure|div|blockquote|pre|hr|section|iframe)/i;
  return html
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (block.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g, "<br />\n")}</p>`))
    .join("\n");
}

function renderElementor(json) {
  let data;
  try { data = JSON.parse(json); } catch { return ""; }
  const out = [];
  const walk = (els) => {
    for (const el of els ?? []) {
      const s = el.settings ?? {};
      switch (el.widgetType) {
        case "heading": out.push(`<${s.header_size || "h2"}>${s.title ?? ""}</${s.header_size || "h2"}>`); break;
        case "text-editor": out.push(wpautop(s.editor ?? "")); break;
        case "image": if (s.image?.url) out.push(`<figure><img src="${s.image.url}" alt="${s.image.alt ?? ""}" /></figure>`); break;
        case "button": out.push(`<p><a class="wp-block-button__link" href="${s.link?.url ?? "#"}">${s.text ?? ""}</a></p>`); break;
        case "image-box":
          if (s.image?.url) out.push(`<img src="${s.image.url}" alt="" />`);
          if (s.title_text) out.push(`<h3>${s.title_text}</h3>`);
          if (s.description_text) out.push(`<p>${s.description_text}</p>`);
          break;
        case "icon-list": out.push(`<ul>${(s.icon_list ?? []).map((i) => `<li>${i.text}</li>`).join("")}</ul>`); break;
        case "accordion": case "toggle":
          for (const t of s.tabs ?? []) out.push(`<h3>${t.tab_title}</h3>${wpautop(t.tab_content ?? "")}`);
          break;
        case "video": if (s.youtube_url) out.push(`<p><a href="${s.youtube_url}">${s.youtube_url}</a></p>`); break;
      }
      walk(el.elements);
    }
  };
  walk(data);
  return out.join("\n");
}

const suspicious = [];
// Old WordPress slugs that later changed (the hack reused them for fake pages).
const OLD_SLUGS = {
  "metal-mobile-home-skirting": "metal-mobilehome-skirting",
  "mobile-home-wood-skirting": "mobilehome-wood-skirting",
  "mobile-homes-brick-skirting": "mobilehomes-brick-skirting",
  "mobile-homes-concrete-skirting": "mobilehomes-concrete-skirting",
  "mobile-homes-faux-stone-skirting": "best-mobile-homes-faux-stone-skirting",
  "mobile-homes-fiber-cement-skirting": "mobile-homes-fiber-cement-skirting-installation",
  "mobile-homes-lattice-skirting": "best-mobile-homes-lattice-skirting",
  "mobile-homes-vinyl-skirting": "mobilehomes-vinyl-skirting",
  "lattice-skirting-types-and-the-best-for-mobile-homes": "best-mobile-homes-lattice-skirting",
  "manufactured-home-financing-options-comparing-loans": "manufactured-home-financing-options",
  "mobile-home-skirting-repair-how-to-spot-damage-early": "mobile-home-skirting-repair",
};
// Titles that were cut short in the database.
const TITLE_FIXES = {
  "manufactured-home-financing-options":
    "Manufactured Home Financing Options: Comparing Loans, Rates, and Requirements for 2026",
};

function clean(html, where) {
  html = html.replace(SITE_HOSTS, "");
  html = html.replace(/href="\/([a-z0-9-]+)\/?(#[^"]*)?"/g, (m, slug, hash = "") =>
    OLD_SLUGS[slug] ? `href="/${OLD_SLUGS[slug]}/${hash}"` : m);
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/\[table id=["']?(\d+)["']?[^\]]*\/?\]/g, (_, id) => renderTablePress(id));
  html = html.replace(/\[\/?[a-z_-]+[^\]]*\]/gi, ""); // other shortcodes (toc, etc.)
  const noCss = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  if (/<script|eval\(|base64_decode|<iframe(?![^>]*youtube)/i.test(noCss)) suspicious.push(where);
  html = wpautop(html);
  html = sanitizeBody(html);
  // Elementor's post header (title repeated + "by Author | Last updated on ,"
  // with an empty date) was rendered into the body; the Next.js template
  // already shows the title and date.
  html = html.replace(/^\s*(?:<h1>[\s\S]*?<\/h1>|[^<]*?)\s*by [^|<]{2,60}\|\s*Last updated on\s*,?\s*/, "");
  return html;
}

/** Plain text for titles/names: strip tags, decode the entities WordPress stores. */
function text(v) {
  return sanitizeHtml(v || "", { allowedTags: [] })
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|#039|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#039": "'", nbsp: " " })[e])
    .trim();
}

const siteName = text(option("blogname")) || "Mobile Homes & Beyond";
function rankMath(v, title) {
  if (!v) return null;
  return v.replace(/%title%/g, title).replace(/%sep%/g, "|").replace(/%sitename%/g, siteName).replace(/%[a-z_]+%/g, "").replace(/\s+/g, " ").trim() || null;
}

// ---------- build entries ----------
const frontId = option("show_on_front") === "page" ? option("page_on_front") : null;
// The site's home and blog listings are built by Next.js, so skip the WordPress
// "posts page" and an unused static front page.
const skipIds = new Set([option("page_for_posts"), frontId ? null : option("page_on_front")].filter(Boolean));
const entries = [];
for (const p of posts) {
  if (p.post_status !== "publish" || !["post", "page"].includes(p.post_type)) continue;
  if (skipIds.has(p.ID)) continue;
  const m = meta.get(p.ID) ?? {};
  let html = p.post_content || "";
  if (m._elementor_edit_mode === "builder" && m._elementor_data) {
    const rendered = renderElementor(m._elementor_data);
    if (rendered.replace(/<[^>]+>/g, "").trim().length > html.replace(/<[^>]+>/g, "").trim().length) html = rendered;
  }
  html = clean(html, `${p.post_type} "${p.post_title}"`);
  const iso = (d) => (d && !d.startsWith("0000") ? new Date(d.replace(" ", "T") + "Z").toISOString() : null);
  entries.push({
    type: p.post_type,
    slug: p.ID === frontId ? "" : p.post_name,
    title: TITLE_FIXES[p.post_name] ?? text(p.post_title),
    date: iso(p.post_date_gmt) ?? iso(p.post_date),
    modified: iso(p.post_modified_gmt) ?? iso(p.post_modified),
    // Most specific category first ("mobile-home-skirting" is the parent of the others).
    categories: p.post_type === "post"
      ? (postCats.get(p.ID) ?? []).sort((a, b) => (a === "mobile-home-skirting") - (b === "mobile-home-skirting"))
      : [],
    featuredImage: m._thumbnail_id ? attachmentUrl(m._thumbnail_id) : null,
    images: [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((x) => x[1]),
    excerpt: text(p.post_excerpt),
    html,
    seoTitle: rankMath(text(m.rank_math_title), text(p.post_title)),
    seoDescription: rankMath(text(m.rank_math_description), text(p.post_title)),
  });
}

const usedCats = new Set(entries.flatMap((e) => e.categories));
const categories = cats
  .filter((c) => usedCats.has(c.slug))
  .map((c) => {
    const name = text(c.name);
    // Some category names were saved all lower-case.
    const pretty = name === name.toLowerCase() ? name.replace(/\b\w/g, (m) => m.toUpperCase()) : name;
    return { slug: c.slug, name: pretty, description: c.description };
  });

const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const out = {
  source: `WordPress database import from ${path.basename(file)} on ${new Date().toISOString().slice(0, 10)}`,
  site: { ...(current.site ?? {}), name: siteName, // The WordPress tagline is a whole paragraph; keep the short one unless it is short too.
    tagline: (text(option("blogdescription")).length <= 120 && text(option("blogdescription"))) || current.site?.tagline || "",
    url: current.site?.url || text(option("home")) },
  categories,
  entries,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

// ---------- report ----------
const missing = new Set();
for (const e of entries)
  for (const src of [...e.images, e.featuredImage].filter(Boolean))
    if (src.startsWith("/") && !fs.existsSync(path.join(PUBLIC, decodeURI(src.split("?")[0])))) missing.add(src);
console.log(`\nWrote ${entries.filter((e) => e.type === "post").length} posts, ${entries.filter((e) => e.type === "page").length} pages, ${categories.length} categories to content/site.json`);
if (missing.size) console.log(`\n${missing.size} referenced images are not in public/:\n  ` + [...missing].slice(0, 30).join("\n  "));
if (suspicious.length) console.log(`\nReview these (possible injected code, stripped by the sanitiser):\n  ` + suspicious.join("\n  "));
