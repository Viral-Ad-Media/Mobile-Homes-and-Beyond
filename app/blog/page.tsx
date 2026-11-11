import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import { getPosts } from "@/lib/content";

export const metadata: Metadata = { title: "Blog", alternates: { canonical: "/blog/" } };

export default function Blog() {
  return (
    <>
      <section className="page-hero">
        <div className="container"><h1>Blog</h1></div>
      </section>
      <section className="container section">
        <div className="card-grid">
          {getPosts().map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
      </section>
    </>
  );
}
