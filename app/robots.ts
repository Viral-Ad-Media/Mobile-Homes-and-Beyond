import type { MetadataRoute } from "next";
import { siteInfo } from "@/lib/content";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteInfo.url}/sitemap.xml`,
  };
}
