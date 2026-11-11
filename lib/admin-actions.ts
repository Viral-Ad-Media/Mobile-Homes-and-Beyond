"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { plainText, sanitizeBody } from "@/lib/sanitize.mjs";

export type SaveState = { error?: string; saved?: boolean };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(["admin", "api", "blog", "wp-content", "fonts", "sitemap.xml", "robots.txt"]);

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function saveEntry(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const type = str(form, "type") === "page" ? "page" : "post";
  const slug = str(form, "slug").toLowerCase();
  const title = plainText(str(form, "title"));
  const status = str(form, "status") === "draft" ? "draft" : "published";
  const date = str(form, "publishedAt");
  const categories = form.getAll("categories").map(String);

  if (!title) return { error: "Title is required." };
  if (!SLUG.test(slug)) return { error: "Slug can only use lowercase letters, numbers and single hyphens." };
  if (RESERVED.has(slug)) return { error: `"${slug}" is reserved.` };

  const values = {
    type: type as "post" | "page",
    slug,
    title,
    status: status as "published" | "draft",
    publishedAt: date ? new Date(date) : new Date(),
    updatedAt: new Date(),
    featuredImage: str(form, "featuredImage") || null,
    excerpt: plainText(str(form, "excerpt")),
    html: sanitizeBody(String(form.get("html") ?? "")),
    seoTitle: plainText(str(form, "seoTitle")) || null,
    seoDescription: plainText(str(form, "seoDescription")) || null,
  };

  const clash = await db().select({ id: schema.entries.id }).from(schema.entries).where(eq(schema.entries.slug, slug));
  if (clash.length && clash[0].id !== id) return { error: `Another page already uses /${slug}/.` };

  let entryId = id;
  let oldSlug: string | null = null;
  if (id) {
    const [old] = await db().select({ slug: schema.entries.slug }).from(schema.entries).where(eq(schema.entries.id, id));
    oldSlug = old?.slug ?? null;
    await db().update(schema.entries).set(values).where(eq(schema.entries.id, id));
  } else {
    const [row] = await db().insert(schema.entries).values(values).returning({ id: schema.entries.id });
    entryId = row.id;
  }
  await db().delete(schema.entryCategories).where(eq(schema.entryCategories.entryId, entryId!));
  if (type === "post" && categories.length)
    await db()
      .insert(schema.entryCategories)
      .values(categories.map((c, i) => ({ entryId: entryId!, categorySlug: c, position: i })));

  revalidatePath("/", "layout");
  if (oldSlug && oldSlug !== slug) revalidatePath(`/${oldSlug}/`);
  if (!id) redirect(`/admin/edit/${entryId}/?saved=1`);
  return { saved: true };
}

export async function deleteEntry(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (id) await db().delete(schema.entries).where(eq(schema.entries.id, id));
  revalidatePath("/", "layout");
  redirect("/admin/");
}
