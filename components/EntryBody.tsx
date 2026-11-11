import { Entry } from "@/lib/content";

/**
 * Renders a page/post body. The HTML comes from the WordPress database via
 * scripts/import-wordpress.mjs, which sanitises it at import time.
 * Until that import has run, we show the images the backup recorded for the URL.
 */
export default function EntryBody({ entry }: { entry: Entry }) {
  if (entry.html) {
    return (
      <div className="entry-content" dangerouslySetInnerHTML={{ __html: entry.html }} />
    );
  }
  return (
    <div className="entry-content">
      <p className="import-note">
        The text for this page is waiting on the WordPress database import.
      </p>
      {entry.images.length > 0 && (
        <div className="image-grid">
          {entry.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </div>
      )}
    </div>
  );
}
