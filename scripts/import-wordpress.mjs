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
function parseTuples(s, i) {
  const rows = [];
  let row = null, val = "", inStr = false, quoted = false;
  for (; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") {
        const n = s[++i];
        val += { n: "\n", r: "\r", t: "\t", 0: "\0", Z: "\x1a", b: "\b" }[n] ?? n;
      } else if (c === "'") {
        if (s[i + 1] === "'") { val += "'"; i++; } else inStr = false;
      } else val += c;
      continue;
    }
    if (c === "'") { inStr = true; quoted = true; }
    else if (c === "(" && row === null) { row = []; val = ""; quoted = false; }
    else if ((c === "," || c === ")") && row !== null) {
      const raw = quoted ? val : val.trim();
      row.push(!quoted && /^NULL$/i.test(raw) ? null : raw);
      val = ""; quoted = false;
      if (c === ")") { rows.push(row); row = null; }
    } else if (c === ";" && row === null) return [rows, i];
    else if (row !== null) val += c;
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
function clean(html, where) {
  html = html.replace(SITE_HOSTS, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/\[table id=["']?(\d+)["']?[^\]]*\/?\]/g, (_, id) => renderTablePress(id));
  html = html.replace(/\[\/?[a-z_-]+[^\]]*\]/gi, ""); // other shortcodes (toc, etc.)
  if (/<script|eval\(|base64_decode|display:\s*none/i.test(html)) suspicious.push(where);
  html = wpautop(html);
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption", "iframe", "h1", "h2", "span", "del", "ins", "sup", "sub"]),
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height", "title"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "title"],
      "*": ["class", "id"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
    },
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com"],
    transformTags: {
      a: (tag, attribs) => {
        const ext = /^https?:\/\//.test(attribs.href || "");
        return { tagName: "a", attribs: ext ? { ...attribs, rel: "nofollow sponsored noopener", target: "_blank" } : attribs };
      },
      img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
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
const entries = [];
for (const p of posts) {
  if (p.post_status !== "publish" || !["post", "page"].includes(p.post_type)) continue;
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
    title: text(p.post_title),
    date: iso(p.post_date_gmt) ?? iso(p.post_date),
    modified: iso(p.post_modified_gmt) ?? iso(p.post_modified),
    categories: p.post_type === "post" ? postCats.get(p.ID) ?? [] : [],
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
  .map((c) => ({ slug: c.slug, name: text(c.name), description: c.description }));

const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const out = {
  source: `WordPress database import from ${path.basename(file)} on ${new Date().toISOString().slice(0, 10)}`,
  site: { ...(current.site ?? {}), name: siteName, tagline: text(option("blogdescription")) || current.site?.tagline || "" },
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
