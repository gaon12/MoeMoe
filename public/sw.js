/// <reference lib="webworker" />

/**
 * MoeMoe offline shell.
 *
 * Bump this when the caching strategy changes. Every cache whose name does not
 * match is deleted on activation, so a bump is also how stale entries are
 * evicted.
 */
const CACHE_NAME = "moemoe-shell-v2";

/** The document to fall back to when a navigation cannot reach the network. */
const APP_SHELL_URL = "/index.html";

const PRECACHED_URLS = [APP_SHELL_URL, "/manifest.webmanifest", "/favicon.png"];

/**
 * Never cached, in either direction:
 * - `/api/` is the time and CORS-proxy backend. A stale clock is worse than
 *   no clock, and proxied wallpapers are large and single-use.
 * - Cross-origin responses are wallpapers, weather and geolocation. They are
 *   opaque, individually up to 20 MB, and never requested twice.
 */
function isCacheable(request, url) {
  return (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/")
  );
}

/** Content-hashed build output: the URL changes whenever the bytes do. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/assets/");
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

/**
 * Navigations go to the network first so a deployed build is picked up as soon
 * as the user is online, and fall back to the cached shell when they are not.
 */
async function networkFirstForNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(APP_SHELL_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(APP_SHELL_URL);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/** Serve the stored copy immediately and refresh it in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached ?? network;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHED_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstForNavigation(request));
    return;
  }

  if (!isCacheable(request, url)) {
    return;
  }

  event.respondWith(
    isImmutableAsset(url) ? cacheFirst(request) : staleWhileRevalidate(request),
  );
});
