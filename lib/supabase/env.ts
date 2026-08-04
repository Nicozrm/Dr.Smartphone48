/*
  Die Umgebung – und die Frage, ob es das Backend überhaupt gibt.

  Diese Website hat drei Ziele (Server, statischer Export, GitHub Pages) und
  soll auf allen dreien laufen, auch ohne Datenbank. Deshalb wird nirgends
  vorausgesetzt, dass Supabase konfiguriert ist. Stattdessen fragt jede Stelle,
  die etwas davon braucht, hier nach – und zeigt sonst einen ehrlichen
  Ersatztext statt eines Fehlers.

  Die Prüfung muss statisch stehen: Next.js ersetzt `process.env.NEXT_PUBLIC_*`
  beim Bauen durch den Wert. Ein dynamischer Zugriff (`process.env[name]`) käme
  im Browser als `undefined` an – und die Funktionen wären auf jedem Ziel
  abgeschaltet.
*/

/** Öffentliche Adresse des Projekts. Auch im Browser bekannt. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Der öffentliche Schlüssel. Er darf im Browser stehen – seine einzige
 * Berechtigung ist die der Rolle `anon`, und für die gibt es auf den
 * Vorgangstabellen keine einzige Policy.
 */
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Ist ein Backend hinterlegt?
 *
 * Im Browser beantwortbar, weil beide Werte öffentlich sind. Die Oberfläche
 * blendet daran ihre Backend-Teile ein oder aus.
 */
export function hasPublicBackend(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/**
 * Gibt es einen Server, der die API-Routen ausliefert?
 *
 * Im statischen Export nicht: `scripts/build-static.mjs` legt `app/api`
 * beiseite, bevor gebaut wird. Wer dort eine Anfrage an `/api/...` schickt,
 * bekommt die 404-Seite als HTML zurück.
 */
export const HAS_API_ROUTES = process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true";

/**
 * Steht die Statusverfolgung für Besucher zur Verfügung?
 *
 * Beides muss stimmen: ein Projekt **und** ein Server. Die Statusseite liest
 * über die API, weil die Kundensicht redigiert wird – und Redaktion, die im
 * Browser stattfindet, ist keine.
 */
export function hasTicketBackend(): boolean {
  return hasPublicBackend() && HAS_API_ROUTES;
}
