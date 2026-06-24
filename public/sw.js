// sw.js — 간단한 오프라인 캐시 (런타임 cache-first)
const CACHE = "blockari-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  // "./"는 sw.js 위치(=배포 base) 기준으로 해석됨
  e.waitUntil(caches.open(CACHE).then((c) => c.add("./")));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});
