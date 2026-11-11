import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import seed from "@/content/site.json";
import { db, hasDatabase, schema } from "@/lib/db";

/**
 * Content comes from Neon (DATABASE_URL). Without a database (local preview)
 * it falls back to content/site.json, which the WordPress importer writes.
 */

export type Entry = {
  id?: number;
  type: "post" | "page";
  slug: string;
  title: string;
  status?: "published" | "draft";
  date: string | null;
  modified: string | null;
  categories: string[];
  featuredImage: string | null;
  excerpt: string;
  html: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type Category = { slug: string; name: string; description: string };

const file = seed as unknown as {
  site: { name: string; tagline: string; url: string };
  categories: Category[];
  entries: (Entry & { images?: string[] })[];
};

export const siteInfo = {
  ...file.site,
  url: process.env.NEXT_PUBLIC_SITE_URL || file.site.url,
};

const byDate = (a: Entry, b: Entry) => (b.date ?? "").localeCompare(a.date ?? "");
const iso = (d: Date | null) => (d ? d.toISOString() : null);

async function loadEntries(where?: { type?: "post" | "page"; slug?: string; includeDrafts?: boolean }) {
  if (!hasDatabase()) {
    return file.entries
      .filter((e) => (!where?.type || e.type === where.type) && (where?.slug === undefined || e.slug === where.slug))
      .sort(byDate);
  }
  const { entries, entryCategories } = schema;
  const conds = [];
  if (where?.type) conds.push(eq(entries.type, where.type));
  if (where?.slug !== undefined) conds.push(eq(entries.slug, where.slug));
  if (!where?.includeDrafts) conds.push(eq(entries.status, "published"));
  const rows = await db()
    .select()
    .from(entries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(entries.publishedAt));
  if (!rows.length) return [];
  const links = await db()
    .select()
    .from(entryCategories)
    .where(inArray(entryCategories.entryId, rows.map((r) => r.id)))
    .orderBy(asc(entryCategories.position));
  return rows.map<Entry>((r) => ({
    id: r.id,
    type: r.type,
    slug: r.slug,
    title: r.title,
    status: r.status,
    date: iso(r.publishedAt),
    modified: iso(r.updatedAt),
    categories: links.filter((l) => l.entryId === r.id).map((l) => l.categorySlug),
    featuredImage: r.featuredImage,
    excerpt: r.excerpt,
    html: r.html,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  }));
}

export const getPosts = () => loadEntries({ type: "post" });
export const getPages = () => loadEntries({ type: "page" });

export async function getEntry(slug: string): Promise<Entry | undefined> {
  return (await loadEntries({ slug }))[0];
}

export async function getCategories(): Promise<Category[]> {
  if (!hasDatabase()) return file.categories;
  return db().select().from(schema.categories).orderBy(asc(schema.categories.name));
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function getPostsInCategory(slug: string): Promise<Entry[]> {
  return (await getPosts()).filter((p) => p.categories.includes(slug));
}

export async function allSlugs(): Promise<string[]> {
  const [entries, cats] = await Promise.all([loadEntries(), getCategories()]);
  return [...new Set([...entries.map((e) => e.slug), ...cats.map((c) => c.slug)])].filter(Boolean);
}

/** Admin: every entry including drafts. */
export const getAllEntriesForAdmin = () => loadEntries({ includeDrafts: true });

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function excerptOf(e: Pick<Entry, "excerpt" | "html">, words = 28): string {
  const text = (e.excerpt || e.html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(" ");
  return parts.length > words ? parts.slice(0, words).join(" ") + "…" : text;
}
