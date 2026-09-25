// 離線快取：第一次開啟時把整個遊戲存起來，之後沒有網路也能玩。
// 版本號由 build_web.py 依 index.html 內容產生；內容一改，瀏覽器就會換上新版。
const CACHE = "othello6-78626d359c";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("othello6-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 先用快取（離線可玩、開啟快）；快取沒有的才上網抓
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).catch(() =>
      e.request.mode === "navigate" ? caches.match("./index.html") : Response.error()))
  );
});
