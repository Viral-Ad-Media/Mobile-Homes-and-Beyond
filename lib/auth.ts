import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { count } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";

/**
 * Admin login for editing site content.
 *
 * There is no public sign-up. The only account that can be created is the
 * first one, and only with the email in ADMIN_EMAIL (see /admin/setup).
 */
function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL,
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    session: { expiresIn: 60 * 60 * 24 * 14 },
    rateLimit: { enabled: true, window: 60, max: 20 },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const [{ n }] = await db().select({ n: count() }).from(schema.user);
            if (n > 0) throw new APIError("FORBIDDEN", { message: "Sign-up is closed." });
            const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
            if (!allowed || user.email.toLowerCase() !== allowed)
              throw new APIError("FORBIDDEN", { message: "Only the ADMIN_EMAIL account can be created." });
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

let _auth: ReturnType<typeof createAuth> | null = null;
export function getAuth() {
  _auth ??= createAuth();
  return _auth;
}

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login/");
  return session;
}

export async function hasAnyUser() {
  const [{ n }] = await db().select({ n: count() }).from(schema.user);
  return n > 0;
}
