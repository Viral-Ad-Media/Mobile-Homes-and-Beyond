// Shared HTML sanitiser for post bodies: used by the WordPress importer and
// by the admin editor when an article is saved.
import sanitizeHtml from "sanitize-html";

export const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img", "figure", "figcaption", "iframe", "h1", "h2", "span", "del", "ins", "sup", "sub",
  ]),
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "title", "loading"],
    iframe: ["src", "width", "height", "allow", "allowfullscreen", "title"],
    "*": ["class", "id"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href || "");
      return {
        tagName: "a",
        attribs: external ? { ...attribs, rel: "nofollow sponsored noopener", target: "_blank" } : attribs,
      };
    },
    img: (tagName, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
};

/** @param {string} html */
export function sanitizeBody(html) {
  return sanitizeHtml(html, sanitizeOptions);
}

/** Plain text: strip all tags and decode entities. @param {string} s */
export function plainText(s) {
  return sanitizeHtml(s || "", { allowedTags: [], allowedAttributes: {} })
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|#039|nbsp);/g, (_, e) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#039": "'", nbsp: " " })[e])
    .trim();
}
