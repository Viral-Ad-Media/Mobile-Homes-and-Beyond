// Drizzle mirror of db/schema.sql. Keep the two in sync.
import { boolean, integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["post", "page"] }).notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status", { enum: ["published", "draft"] }).notNull().default("published"),
  publishedAt: ts("published_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  featuredImage: text("featured_image"),
  excerpt: text("excerpt").notNull().default(""),
  html: text("html").notNull().default(""),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
});

export const entryCategories = pgTable(
  "entry_categories",
  {
    entryId: integer("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
    categorySlug: text("category_slug").notNull().references(() => categories.slug, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.categorySlug] })],
);

// Better Auth core tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});
