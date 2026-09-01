const SERVICE_WORKER_URL = "/sw.js";

/**
 * Registers the offline shell.
 *
 * Development is deliberately excluded: a service worker that serves cached
 * assets in front of the dev server turns every hot reload into a guessing
 * game. Registration is also deferred until `load` so it never competes with
 * the first wallpaper request for bandwidth.
 */
export function registerServiceWorker(): void {
  if (!(import.meta.env.PROD && "serviceWorker" in navigator)) {
    return;
  }

  globalThis.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
        // Offline support is an enhancement; the app works without it.
      });
    },
    { once: true },
  );
}
