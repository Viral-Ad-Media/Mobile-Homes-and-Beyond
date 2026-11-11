import type { NextConfig } from "next";

// The hacked WordPress install had fake folders at these URLs that served
// an attacker's pages. Search engines may have indexed them, so send them
// permanently to the real articles.
const hijacked: Record<string, string> = {
  "/general": "/",
  "/metal-mobile-home-skirting": "/metal-mobilehome-skirting/",
  "/mobile-home-wood-skirting": "/mobilehome-wood-skirting/",
  "/mobile-homes-brick-skirting": "/mobilehomes-brick-skirting/",
  "/mobile-homes-concrete-skirting": "/mobilehomes-concrete-skirting/",
  "/mobile-homes-faux-stone-skirting": "/best-mobile-homes-faux-stone-skirting/",
  "/mobile-homes-fiber-cement-skirting": "/mobile-homes-fiber-cement-skirting-installation/",
  "/mobile-homes-lattice-skirting": "/best-mobile-homes-lattice-skirting/",
  "/mobile-homes-vinyl-skirting": "/mobilehomes-vinyl-skirting/",
  // Older slugs of current posts
  "/lattice-skirting-types-and-the-best-for-mobile-homes": "/best-mobile-homes-lattice-skirting/",
  "/manufactured-home-financing-options-comparing-loans": "/manufactured-home-financing-options/",
  "/mobile-home-skirting-repair-how-to-spot-damage-early": "/mobile-home-skirting-repair/",
  "/home": "/",
};

const nextConfig: NextConfig = {
  trailingSlash: true, // match WordPress permalinks (/slug/)
  // proxy.ts adds the trailing slash itself so /api/auth/* (Better Auth) is left alone.
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      ...Object.entries(hijacked).map(([source, destination]) => ({
        source: `${source}/`,
        destination,
        permanent: true,
      })),
      { source: "/category/:slug/", destination: "/:slug/", permanent: true },
      { source: "/page-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/post-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap_index.xml", destination: "/sitemap.xml", permanent: true },
    ];
  },
};

export default nextConfig;
