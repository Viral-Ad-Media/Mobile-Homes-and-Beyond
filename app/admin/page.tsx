import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate, getAllEntriesForAdmin } from "@/lib/content";
import SignOutButton from "./SignOutButton";

export default async function AdminHome() {
  const session = await requireAdmin();
  const entries = await getAllEntriesForAdmin();
  const groups = [
    { label: "Posts", items: entries.filter((e) => e.type === "post") },
    { label: "Pages", items: entries.filter((e) => e.type === "page") },
  ];
  return (
    <>
      <div className="admin-bar">
        <div>
          <h1>Site content</h1>
          <p style={{ margin: 0 }}>Signed in as {session.user.email}</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/admin/new/">New post</Link>
          <Link className="btn btn-plain" href="/admin/new/?type=page">New page</Link>
          <SignOutButton />
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.label} style={{ marginBottom: 40 }}>
          <h2>{g.label} ({g.items.length})</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Title</th><th>URL</th><th>Status</th><th>Published</th></tr>
              </thead>
              <tbody>
                {g.items.map((e) => (
                  <tr key={e.id}>
                    <td><Link href={`/admin/edit/${e.id}/`}>{e.title}</Link></td>
                    <td><a href={`/${e.slug}/`} target="_blank" rel="noreferrer">/{e.slug}/</a></td>
                    <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                    <td>{formatDate(e.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
