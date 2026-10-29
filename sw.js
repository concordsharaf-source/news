const CACHE_VERSION = "mihbarah-pwa-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/assets/style.css",
  "/assets/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/data/news-rules.json",
  "/data/ticker-rules.json",
  "/data/dictionary.json",
  "/data/news-examples/index.json",
  "/data/news-examples/example-01.json",
  "/data/ticker-examples/index.json",
  "/data/ticker-examples/bulletin-01.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache serverless AI proxy or external API requests
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-First for /data/ JSON files so updates pushed to GitHub appear immediately when online,
  // while falling back cleanly to cached JSON when offline!
  if (url.pathname.startsWith("/data/")) {
    const cleanUrl = new URL(url.pathname, self.location.origin).toString();
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(cleanUrl, copy));
          }
          return res;
        })
        .catch(() => caches.match(cleanUrl))
    );
    return;
  }

  // Navigation requests -> Network-First with /index.html offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static shell assets (CSS, JS, Icons, Manifest) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
