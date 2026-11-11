import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Neon in production (HTTP driver, works on Vercel and other serverless hosts).
 * Any other Postgres URL (e.g. localhost for development) uses node-postgres.
 */
function connect(url: string) {
  if (/\.neon\.tech/.test(url)) return drizzleNeon(neon(url), { schema });
  return drizzlePg(new Pool({ connectionString: url }), { schema });
}

type DB = ReturnType<typeof drizzleNeon<typeof schema>>;
let _db: DB | null = null;

export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

export function db(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Both drivers expose the same query builder API.
  _db ??= connect(url) as unknown as DB;
  return _db;
}

export { schema };
