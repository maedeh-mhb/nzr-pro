self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A minimal service worker is enough to support installability.
self.addEventListener("fetch", (event) => {
  // This service worker does not modify fetch behavior.
});
