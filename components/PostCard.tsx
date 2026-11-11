import Link from "next/link";
import { Category, Entry, excerptOf, formatDate } from "@/lib/content";

export default function PostCard({ post, categories }: { post: Entry; categories: Category[] }) {
  const cat = categories.find((c) => c.slug === post.categories[0]);
  return (
    <article className="card">
      <Link href={`/${post.slug}/`} className="card-media">
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featuredImage} alt={post.title} loading="lazy" />
        ) : (
          <span className="card-media-fallback">MHB</span>
        )}
      </Link>
      <div className="card-body">
        {cat && (
          <Link href={`/${cat.slug}/`} className="card-cat">
            {cat.name}
          </Link>
        )}
        <h3>
          <Link href={`/${post.slug}/`}>{post.title}</Link>
        </h3>
        <p>{excerptOf(post, 22)}</p>
        <div className="card-meta">{formatDate(post.date)}</div>
      </div>
    </article>
  );
}
