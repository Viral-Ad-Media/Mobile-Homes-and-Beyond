import Link from "next/link";
import PostCard from "@/components/PostCard";
import { getEntry, getPosts } from "@/lib/content";

export default function Home() {
  const home = getEntry("");
  const posts = getPosts();
  const guideCats = ["traditional-skirting", "rock-skirting", "premium-skirting"];
  const skirting = posts.filter(
    (p) => p.featuredImage && p.categories.some((c) => guideCats.includes(c)),
  );
  const latest = posts.filter((p) => !skirting.includes(p)).slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Mobile Homes &amp; Beyond</p>
          <h1>Everything you need to know about mobile home skirting</h1>
          <p className="lead">
            Honest guides to vinyl, metal, wood, brick, faux stone, concrete,
            lattice and fiber cement skirting, plus repair tips and home
            financing advice.
          </p>
          <div className="hero-actions">
            <Link href="/mobile-home-skirting/" className="btn">Explore skirting types</Link>
            <Link href="/blog/" className="btn btn-ghost">Read the blog</Link>
          </div>
        </div>
      </section>

      {home?.html && (
        <section className="container section">
          <div className="entry-content" dangerouslySetInnerHTML={{ __html: home.html }} />
        </section>
      )}

      <section className="container section">
        <h2 className="section-title">Mobile home skirting guides</h2>
        <div className="banner-grid">
          {skirting.map((p) => (
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
            <h2 className="section-title">Latest articles</h2>
            <div className="card-grid">
              {latest.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
