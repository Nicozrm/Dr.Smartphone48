/**
 * Die Seiten des internen Bereichs – an genau einer Stelle.
 *
 * Sie werden zweimal dargestellt: als Leiste über jeder internen Seite
 * (`InternNav`) und als Kacheln auf der Übersicht (`InternHome`). Zwei
 * handgepflegte Listen wären dieselbe Falle wie beim Offline-Vorrat und bei
 * den Prüfskripten in CI – sie driften auseinander, und dann fehlt die
 * neueste Seite ausgerechnet in der Navigation.
 *
 * Die Reihenfolge ist die des Arbeitstages und nicht das Alphabet: Erst
 * sehen, was ansteht (Übersicht), dann daran arbeiten (Werkstatt), dann
 * abrechnen (Rechnung), dann unterschreiben (Zertifikat).
 */

export interface InternPage {
  href: string;
  /** Kurzform für die Leiste. */
  label: string;
  /** Langform für die Kachel auf der Übersicht. */
  title: string;
  desc: string;
  /**
   * Braucht diese Seite eine Datenbank?
   *
   * Ohne Backend gibt es keine Vorgänge. Die Werkstatt stünde dann leer da,
   * und ein Verweis auf eine Seite, die nichts kann, ist schlimmer als
   * keiner – er sieht nach Fehler aus.
   */
  needsBackend?: boolean;
}

export const INTERN_PAGES: InternPage[] = [
  {
    href: "/intern",
    label: "Übersicht",
    title: "Übersicht",
    desc: "Was quer liegt, und was als Nächstes ansteht.",
  },
  {
    href: "/intern/werkstatt",
    label: "Werkstatt",
    title: "Werkstatt",
    desc: "Vorgänge ansehen, Status setzen, Vermerke schreiben.",
    needsBackend: true,
  },
  {
    href: "/intern/rechnung",
    label: "Rechnung",
    title: "Rechnung",
    desc: "Beleg schreiben, drucken, als E-Rechnung ausgeben.",
  },
  {
    href: "/intern/zertifikat",
    label: "Zertifikat",
    title: "Zertifikat",
    desc: "Reparatur unterschreiben und als QR-Code mitgeben.",
  },
];

/** Die Werkzeuge ohne die Übersicht selbst – für die Kacheln. */
export const INTERN_TOOLS = INTERN_PAGES.filter((page) => page.href !== "/intern");
