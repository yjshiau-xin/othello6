// 離線快取：第一次開啟時把整個遊戲存起來，之後沒有網路也能玩。
// 版本號由 build_web.py 依 index.html 內容產生；內容一改，瀏覽器就會換上新版。
// 遊戲頁面本身「先上網抓、離線才用快取」，網站一更新，下次打開就是新版（不必重新整理兩次）。
const CACHE = "othello6-385eb3863b";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  // cache: "reload"：略過瀏覽器的一般快取，才不會把剛下載過的舊版存進新版快取
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("othello6-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 遊戲頁面：先上網抓最新版（向網站確認有沒有更新，沒改只回 304，很快）並存進快取；
// 連不上或 4 秒內沒回應就用快取裡的，離線照樣能玩
const PAGE_WAIT_MS = 4000;
function freshPage(req) {
  const net = fetch(new Request(req.url, { cache: "no-cache" })).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("./index.html", copy));
    }
    return res;
  });
  const cached = () => caches.match("./index.html");
  const late = new Promise(ok => setTimeout(ok, PAGE_WAIT_MS)).then(cached).then(hit => hit || net);
  return Promise.race([net.catch(cached), late]).then(r => r || net);
}

// 其他檔案（圖示、manifest）先用快取；快取沒有的才上網抓。別的網站（共用計分板）不經過快取
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (e.request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith(freshPage(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).catch(() => Response.error()))
  );
});
