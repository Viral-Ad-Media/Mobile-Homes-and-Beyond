import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container section center">
      <h1>Page not found</h1>
      <p>Sorry, we couldn&apos;t find that page.</p>
      <Link href="/" className="btn">Back to home</Link>
    </section>
  );
}
