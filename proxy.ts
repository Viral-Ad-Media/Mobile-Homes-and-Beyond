import { NextResponse, type NextRequest } from "next/server";

// WordPress-style URLs end in "/". Redirect /slug to /slug/ for pages, but
// leave the API (Better Auth needs exact paths) and files alone.
export function proxy(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/") || /\.[a-z0-9]+$/i.test(url.pathname)) return NextResponse.next();
  url.pathname += "/";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!api/|_next/|wp-content/|fonts/).*)"],
};
