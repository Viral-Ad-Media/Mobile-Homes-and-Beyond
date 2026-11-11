import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EntryBody from "@/components/EntryBody";
import PostCard from "@/components/PostCard";
import {
  allSlugs,
  excerptOf,
  formatDate,
  getCategories,
  getEntry,
  getPostsInCategory,
  siteInfo,
} from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

// Pre-render known URLs; new ones (added in /admin) render on first visit.
export const revalidate = 3600;
export async function generateStaticParams() {
  return (await allSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [entry, categories] = await Promise.all([getEntry(slug), getCategories()]);
  const cat = categories.find((c) => c.slug === slug);
  const title = entry?.title || cat?.name || "";
  const description = entry?.seoDescription || (entry ? excerptOf(entry, 30) : cat?.description) || undefined;
  return {
    title: { absolute: entry?.seoTitle || `${title} | ${siteInfo.name}` },
    description,
    alternates: { canonical: `/${slug}/` },
    openGraph: {
      title,
      description,
      images: entry?.featuredImage ? [entry.featuredImage] : undefined,
      type: entry?.type === "post" ? "article" : "website",
    },
  };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const [entry, categories] = await Promise.all([getEntry(slug), getCategories()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!entry && !cat) notFound();

  if (entry?.type === "post") {
    const postCat = categories.find((c) => c.slug === entry.categories[0]);
    return (
      <article>
        <section className="page-hero">
          <div className="container narrow">
            {postCat && <Link href={`/${postCat.slug}/`} className="card-cat">{postCat.name}</Link>}
            <h1>{entry.title}</h1>
            <p className="meta">{formatDate(entry.date)}</p>
          </div>
        </section>
        <div className="container narrow section">
          {entry.featuredImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="featured" src={entry.featuredImage} alt={entry.title} />
          )}
          <EntryBody entry={entry} />
        </div>
      </article>
    );
  }

  const catPosts = cat ? await getPostsInCategory(slug) : [];
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>{entry?.title ?? cat!.name}</h1>
          {!entry && cat?.description && <p className="lead">{cat.description}</p>}
        </div>
      </section>
      {entry && (
        <div className="container section">
          <EntryBody entry={entry} />
        </div>
      )}
      {catPosts.length > 0 && (
        <section className="container section">
          {entry && <h2 className="section-title">Articles</h2>}
          <div className="card-grid">
            {catPosts.map((p) => <PostCard key={p.slug} post={p} categories={categories} />)}
          </div>
        </section>
      )}
    </>
  );
}
