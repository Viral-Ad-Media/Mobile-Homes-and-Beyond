import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import { getCategories, getPosts } from "@/lib/content";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Blog", alternates: { canonical: "/blog/" } };

export default async function Blog() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  return (
    <>
      <section className="page-hero">
        <div className="container"><h1>Blog</h1></div>
      </section>
      <section className="container section">
        <div className="card-grid">
          {posts.map((p) => <PostCard key={p.slug} post={p} categories={categories} />)}
        </div>
      </section>
    </>
  );
}
