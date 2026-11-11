import type { MetadataRoute } from "next";
import { getCategories, getPages, getPosts, siteInfo } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, categories] = await Promise.all([getPages(), getPosts(), getCategories()]);
  const u = (p: string) => `${siteInfo.url}/${p ? p + "/" : ""}`;
  return [
    { url: u("") },
    { url: u("blog") },
    ...pages.map((p) => ({ url: u(p.slug), lastModified: p.modified ?? undefined })),
    ...posts.map((p) => ({ url: u(p.slug), lastModified: p.modified ?? undefined })),
    ...categories.filter((c) => !pages.some((p) => p.slug === c.slug)).map((c) => ({ url: u(c.slug) })),
  ];
}
