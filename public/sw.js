// NYISH service worker — caches app shell for offline use.
const CACHE = "nyish-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Don't intercept API calls or Supabase requests — always go live.
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) return;
  // For navigation requests, serve the cached shell.
  if (e.request.mode === "navigate") {
    e.respondWith(caches.match("/index.html").then((r) => r || fetch(e.request)));
    return;
  }
  // For assets, try cache first then network and cache the response.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
