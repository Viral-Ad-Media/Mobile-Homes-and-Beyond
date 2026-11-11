import Link from "next/link";
import Logo from "./Logo";
import { categories, getPosts } from "@/lib/content";

export default function Footer() {
  const recent = getPosts().slice(0, 5);
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            Guides, product picks and how-tos for mobile home skirting, repairs
            and financing.
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
            {recent.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}/`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} Mobile Homes &amp; Beyond. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
