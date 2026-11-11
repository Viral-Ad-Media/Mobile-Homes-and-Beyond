import Link from "next/link";
import Logo from "./Logo";
import { getCategories, getPosts } from "@/lib/content";

export default async function Footer() {
  const [categories, posts] = await Promise.all([getCategories(), getPosts()]);
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            Unbiased reviews, guides and how-tos for mobile home skirting,
            repairs and financing.
          </p>
          <p className="disclosure">
            As an Amazon Associate we earn from qualifying purchases.
          </p>
        </div>
        <div>
          <h3>Categories</h3>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}/`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Recent posts</h3>
          <ul>
            {posts.slice(0, 5).map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}/`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} Mobile Homes and Beyond. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
