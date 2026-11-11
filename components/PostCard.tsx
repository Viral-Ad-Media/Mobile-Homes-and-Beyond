import Link from "next/link";
import { Entry, excerptOf, formatDate, getCategory } from "@/lib/content";

export default function PostCard({ post }: { post: Entry }) {
  const cat = post.categories[0] ? getCategory(post.categories[0]) : undefined;
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
        {excerptOf(post) && <p>{excerptOf(post)}</p>}
        <div className="card-meta">{formatDate(post.date)}</div>
      </div>
    </article>
  );
}
