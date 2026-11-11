import { Entry } from "@/lib/content";

/** Post/page body. HTML is sanitised when it is imported or saved in /admin. */
export default function EntryBody({ entry }: { entry: Entry }) {
  return <div className="entry-content" dangerouslySetInnerHTML={{ __html: entry.html }} />;
}
