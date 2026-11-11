import { notFound } from "next/navigation";
import { deleteEntry } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { getAllEntriesForAdmin, getCategories } from "@/lib/content";
import EntryForm from "../../EntryForm";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const [entries, categories] = await Promise.all([getAllEntriesForAdmin(), getCategories()]);
  const entry = entries.find((e) => e.id === Number(id));
  if (!entry) notFound();
  return (
    <>
      <h1>Edit {entry.type}</h1>
      <EntryForm key={entry.id} entry={entry} categories={categories} justSaved={saved === "1"} />
      <form action={deleteEntry} style={{ marginTop: 48 }}>
        <input type="hidden" name="id" value={entry.id} />
        <details>
          <summary>Delete this {entry.type}</summary>
          <p>This removes it from the site permanently.</p>
          <button className="btn btn-danger">Yes, delete “{entry.title}”</button>
        </details>
      </form>
    </>
  );
}
