/*
 * Dr Smartphone48 Service Worker
 * – Navigation: Netz zuerst, Cache als Fallback, /offline als letzte Instanz
 * – Statische Assets (_next/static, Icons): Cache zuerst (immutable)
 */
const VERSION = "v4";
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
  "/vorbereitung",
  "/ankauf",
  "/zwilling",
  "/refurbished",
  "/ersatzteile",
  "/werkstatt",
  "/kontakt",
  "/offline",
].map((path) => `${BASE}${path}`);

const OFFLINE_URL = `${BASE}/offline`;

/**
 * Die zwei Seiten, ohne die der Offline-Betrieb sinnlos wäre: der Fallback
 * selbst und die Notfallhilfe. Alles andere ist Komfort.
 */
const CRITICAL_URLS = [OFFLINE_URL, `${BASE}/notfall`];

/**
 * Vorrat anlegen, ohne alles aufs Spiel zu setzen.
 *
 * `cache.addAll()` ist atomar: Eine einzige URL, die 404 liefert, lässt die
 * gesamte Installation scheitern – der Service Worker wird dann nie aktiv und
 * die Seite hat still keinen Offline-Modus mehr. Da die Liste beim Umbenennen
 * einer Route veraltet, wird jede URL einzeln geholt.
 */
async function precache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const results = await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      await cache.put(url, response);
      return url;
    }),
  );
  /*
   * Das Ergebnis wird zurückgegeben, nicht verschluckt.
   *
   * `allSettled` sorgt dafür, dass ein einzelner Fehlschlag die Installation
   * nicht mitnimmt – das ist richtig. Es sorgte aber auch dafür, dass diese
   * Funktion selbst dann erfüllt zurückkam, wenn kein einziger Abruf geklappt
   * hatte. Der Knopf auf /notfall meldete daraufhin Erfolg und hatte nichts
   * getan. Wer den Ausgang nicht weitergibt, kann ihn nicht melden.
   */
  return {
    gespeichert: results.filter((r) => r.status === "fulfilled").length,
    fehlgeschlagen: results
      .filter((r) => r.status === "rejected")
      .map((r) => String(r.reason?.message ?? r.reason)),
  };
}

/**
 * Sorgt dafür, dass die Pflichtseiten im neuen Cache liegen – notfalls
 * übernommen aus einem älteren, sonst noch einmal aus dem Netz.
 *
 * Der Grund für diesen Umweg: Beim Update installiert der neue Worker,
 * während die alte Fassung noch bedient. Schlägt dabei ein einzelner Abruf
 * fehl – ein Funkloch reicht –, wäre die Notfallseite im neuen Cache nicht
 * vorhanden. Würden wir jetzt die alten Caches löschen, hätten wir ihre
 * funktionierende Kopie gleich mit vernichtet, und genau die Seite, die
 * offline erreichbar sein soll, endete bei Response.error().
 *
 * Gibt die Adressen zurück, die weiterhin fehlen.
 */
async function ensureCritical() {
  const cache = await caches.open(RUNTIME_CACHE);
  const missing = [];

  for (const url of CRITICAL_URLS) {
    if (await cache.match(url)) continue;

    // caches.match() ohne Optionen durchsucht alle Caches, auch die alten.
    const inherited = await caches.match(url);
    if (inherited) {
      await cache.put(url, inherited.clone());
      continue;
    }

    try {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) {
        await cache.put(url, response);
        continue;
      }
    } catch {
      // Kein Netz – dann bleibt es beim Vermerk unten.
    }
    missing.push(url);
  }

  return missing;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const missing = await ensureCritical();

      if (missing.length === 0) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((key) => key !== RUNTIME_CACHE).map((key) => caches.delete(key)),
        );
      } else {
        // Lieber ein Cache zu viel als eine Notfallseite zu wenig. Der
        // nächste Start räumt auf, sobald der Abruf gelingt.
        console.warn(
          `[sw] Alte Caches bleiben bestehen – nicht im Vorrat: ${missing.join(", ")}`,
        );
      }

      await self.clients.claim();
    })(),
  );
});

/*
 * Vorrat auf Zuruf ergänzen.
 *
 * Der Abschnitt „Offline-Vorrat" auf /notfall zeigt, welche Seiten im
 * Speicher liegen, und bietet an, fehlende nachzuladen. Der naheliegende Weg
 * – die Seite ruft die fehlenden Adressen selbst per `fetch` ab – sieht aus,
 * als würde er funktionieren, und tut es nicht: Der Handler unten legt HTML
 * nur bei `request.mode === "navigate"` ab, und ein `fetch` aus einem Skript
 * ist keine Navigation. Der Knopf lief ins Leere, ohne dass etwas fehlschlug.
 *
 * Der Vorrat gehört dem Service Worker, also legt er ihn auch nach. Die
 * Antwort läuft über einen MessagePort zurück, damit die Seite weiß, wann
 * sie neu nachsehen kann – ein Zeitgeber wäre geraten, nicht gewusst.
 */
const REFILL = "vorrat-nachlegen";

self.addEventListener("message", (event) => {
  if (event.data?.type !== REFILL) return;
  const port = event.ports[0];
  event.waitUntil(
    precache()
      .then((result) => port?.postMessage({ ok: true, ...result }))
      .catch((error) =>
        port?.postMessage({
          ok: false,
          gespeichert: 0,
          fehlgeschlagen: [String(error?.message ?? error)],
        }),
      ),
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
