/* Service Worker のひな形。scripts/local-build.mjs が、下の VERSION と PRECACHE の印を埋めて dist-local/sw.js を作る。
   目的：一度開いたあとは、オフライン（機内モード）でも起動できるようにする。
   🔴 保存するのは、このサイト自身のファイルだけ。入力データ（IndexedDB）には触れない。 */
const VERSION = "ffceece333";
// 変種を問わない「入力のハッシュ」。本番の公開は、テスト版に載っているものと同じソースのときだけ許す（scripts/local-publish.mjs・app-local-staging.md §3-2）。
const SOURCE = "ffceece333";
// 控えの名前の接頭辞（変種ごと）。🔴 本番は salary-local-、テスト版は salary-beta-。本番の Service Worker は「salary-local- で始まる控えのうち自分の版以外」を
// 消すので、テスト版の接頭辞は salary-local- で始まってはいけない（同じドメインの別フォルダに置くため。scripts/local-variant.mjs）。
const CACHE_PREFIX = "salary-local-";
const CACHE = CACHE_PREFIX + VERSION;
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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // 開いている画面に「いま有効な版」を知らせる（画面は、自分の版と違えば更新を促す。app-local-autoupdate.md §3-2）。
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "build", build: VERSION })))
  );
});

// 画面から「版は？」と聞かれたら、自分の版を返す（長く開いたままの画面・戻ってきた画面が、新しい版の有無を確かめるため）。
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "which" && event.source) event.source.postMessage({ type: "build", build: VERSION });
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
