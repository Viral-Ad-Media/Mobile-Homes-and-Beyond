import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/content";
import EntryForm from "../EntryForm";

type Props = { searchParams: Promise<{ type?: string }> };

export default async function NewPage({ searchParams }: Props) {
  await requireAdmin();
  const type = (await searchParams).type === "page" ? "page" : "post";
  const categories = await getCategories();
  return (
    <>
      <h1>New {type}</h1>
      <EntryForm entry={{ type }} categories={categories} />
    </>
  );
}
