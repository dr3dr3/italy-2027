/**
 * Extract the 11-char YouTube video ID from any common URL format.
 * Returns null if the URL isn't recognisable as YouTube.
 */
export function extractYouTubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtube.com") {
    if (u.pathname === "/watch") {
      return u.searchParams.get("v") ?? null;
    }
    const embedMatch = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    return null;
  }

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  return null;
}
