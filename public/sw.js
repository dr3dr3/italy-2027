// Service worker for Italia 2027. Read-only offline cache.
// Bump CACHE_VERSION to invalidate all caches on next activation.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const TILES_CACHE = `tiles-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const TILES_MAX = 200;

const SHELL_URLS = ["/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !n.endsWith(CACHE_VERSION))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  const excess = keys.length - max;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(cacheName, request, offlineFallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (offlineFallback) {
      const fallback = await caches.match(offlineFallback);
      if (fallback) return fallback;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  if (url.host.endsWith("tile.openstreetmap.org")) {
    event.respondWith(
      (async () => {
        const response = await cacheFirst(TILES_CACHE, request);
        trimCache(TILES_CACHE, TILES_MAX);
        return response;
      })(),
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(PAGES_CACHE, request, "/offline"));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(PAGES_CACHE, request));
  }
});
