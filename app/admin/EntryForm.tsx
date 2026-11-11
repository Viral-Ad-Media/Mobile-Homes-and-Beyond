"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveEntry, type SaveState } from "@/lib/admin-actions";
import type { Category, Entry } from "@/lib/content";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-|-$/g, "");

export default function EntryForm({
  entry,
  categories,
  justSaved,
}: {
  entry: Partial<Entry> & { type: "post" | "page" };
  categories: Category[];
  justSaved?: boolean;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveEntry, justSaved ? { saved: true } : {});
  const [slug, setSlug] = useState(entry.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(entry.slug));
  const [html, setHtml] = useState(entry.html ?? "");
  const [preview, setPreview] = useState(false);
  const [type, setType] = useState(entry.type);

  return (
    <form action={action} className="form">
      {state.error && <p className="alert error">{state.error}</p>}
      {state.saved && !pending && <p className="alert ok">Saved. The live site is updated.</p>}
      <input type="hidden" name="id" value={entry.id ?? ""} />

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          defaultValue={entry.title}
          required
          onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))}
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="slug">URL slug</label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
            required
          />
          <small>mobilehomesandbeyond.com/{slug || "…"}/</small>
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as "post" | "page")}>
            <option value="post">Post</option>
            <option value="page">Page</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={entry.status ?? "published"}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="publishedAt">Publish date</label>
          <input
            id="publishedAt"
            name="publishedAt"
            type="date"
            defaultValue={(entry.date ?? new Date().toISOString()).slice(0, 10)}
          />
        </div>
      </div>

      {type === "post" && (
        <fieldset className="field">
          <legend>Categories</legend>
          <div className="checks">
            {categories.map((c) => (
              <label key={c.slug}>
                <input type="checkbox" name="categories" value={c.slug} defaultChecked={entry.categories?.includes(c.slug)} />
                {c.name}
              </label>
            ))}
          </div>
          <small>The first ticked category is shown on the post.</small>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="featuredImage">Featured image URL</label>
        <input id="featuredImage" name="featuredImage" defaultValue={entry.featuredImage ?? ""} placeholder="/wp-content/uploads/…" />
      </div>

      <div className="field">
        <label htmlFor="excerpt">Excerpt (optional)</label>
        <textarea id="excerpt" name="excerpt" rows={2} defaultValue={entry.excerpt ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="html">
          Body (HTML){" "}
          <button type="button" className="badge" onClick={() => setPreview(!preview)}>
            {preview ? "Edit" : "Preview"}
          </button>
        </label>
        {preview ? (
          <div className="preview entry-content" dangerouslySetInnerHTML={{ __html: html }} />
        ) : null}
        <textarea
          id="html"
          name="html"
          className="code"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          hidden={preview}
        />
        <small>Scripts and unsafe attributes are removed when you save.</small>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="seoTitle">SEO title (optional)</label>
          <input id="seoTitle" name="seoTitle" defaultValue={entry.seoTitle ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="seoDescription">SEO description (optional)</label>
          <input id="seoDescription" name="seoDescription" defaultValue={entry.seoDescription ?? ""} />
        </div>
      </div>

      <div className="admin-bar">
        <div className="actions">
          <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <Link className="btn btn-plain" href="/admin/">Back to list</Link>
          {entry.slug && (
            <a className="btn btn-plain" href={`/${entry.slug}/`} target="_blank" rel="noreferrer">View live</a>
          )}
        </div>
      </div>
    </form>
  );
}
