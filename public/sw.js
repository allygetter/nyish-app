// Minimal service worker — enables "Add to Home Screen" / installability.
// Not doing offline caching yet; safe to extend later.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
self.addEventListener("fetch", () => {});
