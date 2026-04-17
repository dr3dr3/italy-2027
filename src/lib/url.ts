/**
 * Render a URL for display: drop scheme + leading "www.", trim trailing slash,
 * truncate the path with an ellipsis when long. Pure — the raw url stays in href.
 */
export function formatUrlForDisplay(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  const host = u.hostname.replace(/^www\./, "");
  let path = u.pathname + u.search + u.hash;
  if (path === "/") path = "";

  const MAX_PATH = 30;
  if (path.length > MAX_PATH) {
    path = path.slice(0, MAX_PATH - 1) + "…";
  }
  return host + path;
}
