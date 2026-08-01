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

// /notfall steht bewusst an erster Stelle: Es ist die einzige Seite, die
// jemand aufruft, während etwas schiefgeht – oft mit schlechtem Netz, im
// Keller, im Regen. Sie muss auch dann da sein, wenn sonst nichts lädt.
const PRECACHE_URLS = [
  "/notfall",
  "/",
  "/reparatur",
  "/check",
  "/ankauf",
  "/zwilling",
  "/refurbished",
  "/ersatzteile",
  "/werkstatt",
  "/kontakt",
  "/offline",
].map((path) => `${BASE}${path}`);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      // Einzeln statt addAll: Ein fehlender Eintrag darf die Installation
      // nicht scheitern lassen und damit den gesamten Offline-Betrieb.
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
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
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match(`${BASE}/offline`))
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
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
