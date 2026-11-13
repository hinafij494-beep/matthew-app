const CACHE = "king-matthew-v24";
const FILES = [
  "./", "./index.html", "./styles.css", "./app.js", "./voice-web-fallback.js",
  "./lessons.js", "./learning.js", "./math-journey.js", "./math-english.js",
  "./science.js", "./interactive-games.js", "./voice.bundle.js",
  "./voice-clips-pack-1.js", "./voice-clips-pack-2.js", "./voice-clips-pack-3.js",
  "./voice-clips-pack-4.js", "./voice-clips-pack-5.js", "./voice-clips-pack-6.js",
  "./voice-clips-pack-7.js", "./voice-clips-pack-8.js", "./voice-clips-pack-9.js",
  "./voice-clips-pack-10.js", "./voice-clips-pack-11.js", "./voice-clips-pack-12.js",
  "./voice-clips-pack-13.js", "./voice-clips-pack-14.js", "./voice-clips-pack-15.js",
  "./voice-clips-pack-16.js", "./voice-clips-text-1.js",
  "./manifest.webmanifest", "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(FILES.map(f => cache.add(f).catch(e => { console.warn("[sw] failed to cache", f, e); }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => {
    if (hit) return hit;
    return fetch(event.request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    });
  }));
});
