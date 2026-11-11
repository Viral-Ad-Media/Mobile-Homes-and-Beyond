import Link from "next/link";
import PostCard from "@/components/PostCard";
import { getCategories, getPosts } from "@/lib/content";

export const revalidate = 3600;

const GUIDE_CATEGORIES = ["traditional-skirting", "rock-skirting", "premium-skirting"];

export default async function Home() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  const guides = posts.filter(
    (p) => p.featuredImage && p.categories.some((c) => GUIDE_CATEGORIES.includes(c)),
  );
  const latest = posts.filter((p) => !guides.includes(p)).slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Mobile Homes and Beyond</p>
          <h1>Unbiased reviews for top mobile home products</h1>
          <p className="lead">
            Mobile home skirting ideas, benefits and helpful installation tips:
            vinyl, metal, wood, brick, faux stone, concrete, lattice and fiber
            cement, plus repair and financing guides.
          </p>
          <div className="hero-actions">
            <Link href="/mobile-home-skirting/" className="btn">Explore skirting ideas</Link>
            <Link href="/blog/" className="btn btn-ghost">Read the blog</Link>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="section-title">Our latest mobile home reviews</h2>
        <div className="banner-grid">
          {guides.map((p) => (
            <Link key={p.slug} href={`/${p.slug}/`} className="banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.featuredImage!} alt={p.title} loading="lazy" />
            </Link>
          ))}
        </div>
      </section>

      {latest.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <h2 className="section-title">Guides and advice</h2>
            <div className="card-grid">
              {latest.map((p) => (
                <PostCard key={p.slug} post={p} categories={categories} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
