// Minimal service worker: exists so Chrome will treat this as an installable
// PWA. It deliberately does not cache anything — the app calls a live
// backend (Gemini, TTS, ffmpeg rendering) for everything that matters, so
// there's no meaningful offline experience to build here, and caching API
// responses or generated video/image files would only risk serving stale
// or oversized data. It just passes every request straight through.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
