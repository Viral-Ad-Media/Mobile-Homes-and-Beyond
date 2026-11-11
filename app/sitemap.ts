import type { MetadataRoute } from "next";
import { categories, getPages, getPosts, siteInfo } from "@/lib/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${siteInfo.url}/${p ? p + "/" : ""}`;
  return [
    ...getPages().map((p) => ({ url: u(p.slug), lastModified: p.modified ?? undefined })),
    { url: u("blog") },
    ...getPosts().map((p) => ({ url: u(p.slug), lastModified: p.modified ?? undefined })),
    ...categories
      .filter((c) => !getPages().some((p) => p.slug === c.slug))
      .map((c) => ({ url: u(c.slug) })),
  ];
}
