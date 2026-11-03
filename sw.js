/* Service Worker のひな形。scripts/local-build.mjs が、下の VERSION と PRECACHE の印を埋めて dist-local/sw.js を作る。
   目的：一度開いたあとは、オフライン（機内モード）でも起動できるようにする。
   🔴 保存するのは、このサイト自身のファイルだけ。入力データ（IndexedDB）には触れない。 */
const VERSION = "1ece8e4151";
const CACHE = "salary-local-" + VERSION;
const PRECACHE = [
  "./",
  "./app.css",
  "./app.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 🔴 配信側（GitHub Pages 等）の HTTP キャッシュに古いファイルが残っていても、新しい版の控えには必ず最新を入れる。
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("salary-local-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // 先に控えを返し、無ければネットワーク（取得できたら控えに足さない＝控えは PRECACHE の分だけ）。
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      // ホーム画面から開くとき等のナビゲーションは、控えの index.html で起動する（オフライン対応）。
      if (req.mode === "navigate") return caches.match("./index.html").then((idx) => idx || fetch(req));
      return fetch(req);
    })
  );
});
