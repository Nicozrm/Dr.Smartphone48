/**
 * Was diese Website auf dem Gerät vorhält.
 *
 * Die Liste steht zweimal: hier und in `public/sw.js`. Das ist unvermeidbar –
 * ein Service Worker ist eine eigenständige Datei ohne Zugriff auf das
 * Modulsystem der Anwendung – und deshalb maschinell abgesichert: Der
 * Prüfstand vergleicht beide Listen zeichen- und reihenfolgengenau. Zwei
 * Fassungen derselben Liste driften sonst auseinander, und dann zeigt
 * /notfall einen Vorrat an, den es nicht gibt.
 *
 * ## Warum /notfall an erster Stelle steht
 *
 * `cache.addAll()` legt der Reihe nach ab. Wenn der Speicherplatz knapp wird
 * oder die Verbindung abbricht, ist das Erste im Vorrat das Sicherste. Und
 * die eine Seite, die zählt, wenn jemand mit einem nassen Telefon und ohne
 * Netz dasteht, ist die Notfallhilfe. Diese Reihenfolge ist Absicht und wird
 * geprüft.
 */

export interface CachedPage {
  path: string;
  label: string;
  /**
   * Ohne diese Seite wäre der Offline-Betrieb sinnlos. Der Service Worker
   * legt sie bei jedem Start nach, falls sie fehlt.
   */
  critical?: boolean;
}

/**
 * Reihenfolge wie in `public/sw.js`. Wer hier etwas ändert, ändert dort
 * mit – sonst schlägt `npm run verify` an.
 */
export const cachedPages: CachedPage[] = [
  { path: "/notfall", label: "Notfall-Soforthilfe", critical: true },
  { path: "/", label: "Startseite" },
  { path: "/reparatur", label: "Sofortpreis und Reparatur" },
  { path: "/check", label: "Geräte-Check" },
  { path: "/vorbereitung", label: "Vor der Abgabe" },
  { path: "/ankauf", label: "Ankauf" },
  { path: "/zwilling", label: "Digitaler Zwilling" },
  { path: "/refurbished", label: "Aufbereitete Geräte" },
  { path: "/ersatzteile", label: "Ersatzteile" },
  { path: "/werkstatt", label: "Werkstatt" },
  { path: "/kontakt", label: "Kontakt und Anfahrt" },
  { path: "/offline", label: "Offline-Hinweis", critical: true },
];

/**
 * Die Nachricht, mit der die Seite den Service Worker bittet, den Vorrat zu
 * ergänzen. Sie steht auch in `public/sw.js`; der Prüfstand vergleicht beide.
 * Ein Tippfehler wäre sonst ein Knopf, der stumm nichts tut – genau der
 * Fehler, der diesen Weg überhaupt nötig gemacht hat.
 */
export const REFILL = "vorrat-nachlegen";

/** Byte in eine Zahl, die man vorlesen kann. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0).replace(".", ",")} kB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
