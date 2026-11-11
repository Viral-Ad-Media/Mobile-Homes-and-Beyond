import data from "@/content/site.json";

export type Entry = {
  type: "post" | "page";
  slug: string;
  title: string;
  date: string | null;
  modified: string | null;
  categories: string[];
  featuredImage: string | null;
  images: string[];
  excerpt: string;
  html: string;
  seoTitle: string | null;
  seoDescription: string | null;
  needsImport?: boolean;
};

export type Category = { slug: string; name: string; description: string };

const site = data as unknown as {
  site: { name: string; tagline: string; url: string };
  categories: Category[];
  entries: Entry[];
};

export const siteInfo = site.site;
export const categories = site.categories;

const byDate = (a: Entry, b: Entry) =>
  (b.date ?? "").localeCompare(a.date ?? "");

export function getPosts(): Entry[] {
  return site.entries.filter((e) => e.type === "post").sort(byDate);
}

export function getPages(): Entry[] {
  return site.entries.filter((e) => e.type === "page");
}

export function getEntry(slug: string): Entry | undefined {
  // Pages win over posts, as in WordPress.
  return (
    site.entries.find((e) => e.type === "page" && e.slug === slug) ??
    site.entries.find((e) => e.type === "post" && e.slug === slug)
  );
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getPostsInCategory(slug: string): Entry[] {
  return getPosts().filter((p) => p.categories.includes(slug));
}

export function allSlugs(): string[] {
  const s = new Set<string>();
  site.entries.forEach((e) => e.slug && s.add(e.slug));
  categories.forEach((c) => s.add(c.slug));
  return [...s];
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function excerptOf(e: Entry, words = 28): string {
  const text = (e.excerpt || e.html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(" ");
  return parts.length > words ? parts.slice(0, words).join(" ") + "…" : text;
}
