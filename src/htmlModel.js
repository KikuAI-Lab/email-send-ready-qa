export function parseEmailHtml(html) {
  const source = html || "";
  const links = extractLinks(source);
  const images = extractImages(source);
  const styleBlocks = extractStyleBlocks(source);

  return {
    source,
    links,
    images,
    styleBlocks,
    text: stripTags(source).toLowerCase(),
    sizeBytes: byteSize(source)
  };
}

export function byteSize(value) {
  return new TextEncoder().encode(value || "").length;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function getAttribute(attrs, name) {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = attrs.match(pattern);
  return match ? match[2] || match[3] || match[4] || "" : "";
}

export function hasAttribute(attrs, name) {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}(\\s*=|\\s|$)`, "i");
  return pattern.test(attrs);
}

export function isHttpHref(href) {
  return /^https?:\/\//i.test((href || "").trim());
}

export function countMatches(source, pattern) {
  return (source.match(pattern) || []).length;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractLinks(html) {
  return [...html.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    tag: match[0],
    attrs: match[1],
    text: stripTags(match[2]).trim(),
    href: getAttribute(match[1], "href")
  }));
}

function extractImages(html) {
  return [...html.matchAll(/<img\b([^>]*?)>/gi)].map((match) => ({
    tag: match[0],
    attrs: match[1],
    src: getAttribute(match[1], "src")
  }));
}

function extractStyleBlocks(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => ({
    tag: match[0],
    css: match[1]
  }));
}

function stripTags(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
