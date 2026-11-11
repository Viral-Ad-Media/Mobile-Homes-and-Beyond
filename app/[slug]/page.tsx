import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EntryBody from "@/components/EntryBody";
import PostCard from "@/components/PostCard";
import {
  allSlugs,
  excerptOf,
  formatDate,
  getCategory,
  getEntry,
  getPostsInCategory,
} from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  const cat = getCategory(slug);
  const title = entry?.seoTitle || entry?.title || cat?.name || "";
  const description =
    entry?.seoDescription || (entry ? excerptOf(entry, 30) : cat?.description) || undefined;
  return {
    title: { absolute: entry?.seoTitle || `${title} | Mobile Homes & Beyond` },
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
  const entry = getEntry(slug);
  const cat = getCategory(slug);
  if (!entry && !cat) notFound();

  const catPosts = cat ? getPostsInCategory(slug) : [];

  if (entry?.type === "post") {
    const postCat = entry.categories[0] ? getCategory(entry.categories[0]) : undefined;
    return (
      <article>
        <section className="page-hero">
          <div className="container narrow">
            {postCat && (
              <Link href={`/${postCat.slug}/`} className="card-cat">{postCat.name}</Link>
            )}
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
            {catPosts.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}
    </>
  );
}
