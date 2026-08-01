/*
 * Dr Smartphone48 Service Worker
 * – Navigation: Netz zuerst, Cache als Fallback, /offline als letzte Instanz
 * – Statische Assets (_next/static, Icons): Cache zuerst (immutable)
 */
const VERSION = "v3";
const RUNTIME_CACHE = `ds48-${VERSION}`;
// Basis-Pfad aus der eigenen URL ableiten – funktioniert unter "/"
// genauso wie unter "/Koko/" (GitHub Pages).
const BASE = self.location.pathname.replace(/\/sw\.js$/, "");
const PRECACHE_URLS = [
  "/",
  "/reparatur",
  "/check",
  "/zwilling",
  "/refurbished",
  "/ersatzteile",
  "/werkstatt",
  "/kontakt",
  "/offline",
].map((path) => `${BASE}${path}`);

const OFFLINE_URL = `${BASE}/offline`;

/**
 * Vorrat anlegen, ohne alles aufs Spiel zu setzen.
 *
 * `cache.addAll()` ist atomar: Eine einzige URL, die 404 liefert, lässt die
 * gesamte Installation scheitern – der Service Worker wird dann nie aktiv und
 * die Seite hat still keinen Offline-Modus mehr. Da die Liste beim Umbenennen
 * einer Route veraltet, wird jede URL einzeln geholt. Die Offline-Seite ist die
 * einzige Pflichtressource: Ohne sie hat der Fallback keinen Inhalt.
 */
async function precache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const results = await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      await cache.put(url, response);
    }),
  );
  // Fehlschläge sind hinnehmbar, solange die Offline-Seite steht.
  const offlineCached = await cache.match(OFFLINE_URL);
  if (!offlineCached) {
    const failed = results.filter((r) => r.status === "rejected").length;
    console.warn(`[sw] Offline-Seite nicht im Cache (${failed} Fehlschläge).`);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== RUNTIME_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigationen: Netz zuerst, dann Cache, dann Offline-Seite
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Nur gültige Antworten ablegen. Sonst landet eine 404- oder
          // 500-Seite im Cache und wird beim nächsten Verbindungsabbruch als
          // vermeintlich gültige Seite ausgeliefert.
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match(OFFLINE_URL))
            .then((cached) => cached ?? Response.error()),
        ),
    );
    return;
  }

  // Build-Assets sind content-hashed → Cache zuerst
  if (
    url.pathname.startsWith(`${BASE}/_next/static/`) ||
    url.pathname.startsWith(`${BASE}/icons/`)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
