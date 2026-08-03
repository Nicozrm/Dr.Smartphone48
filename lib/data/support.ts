/**
 * Wie lange ein Gerät noch Sicherheitsupdates bekommt.
 *
 * Die wichtigste Zahl beim Reparieren – und die einzige, die in dieser
 * Branche nirgends steht. Ein Displaytausch für 289 € an einem Telefon, das
 * in acht Monaten keine Sicherheitslücken mehr geschlossen bekommt, ist eine
 * schlechte Entscheidung. Wer das verschweigt, verkauft besser. Wer es sagt,
 * wird wiedergefragt.
 *
 * Zwei Sorten Angabe, streng getrennt:
 *
 * - `hersteller` – der Hersteller hat einen Zeitraum öffentlich zugesagt.
 *   Google und Samsung tun das seit 2023 ausdrücklich und benennen die Jahre.
 * - `schaetzung` – es gibt keine Zusage, nur ein bisher eingehaltenes Muster.
 *   Das trifft auf Apple zu: Apple nennt keinen Zeitraum, hat aber über
 *   Jahre hinweg rund sechs Jahre neue iOS-Versionen geliefert und danach
 *   noch Sicherheitskorrekturen für die letzte unterstützte Version.
 *
 * Auf der Seite steht die Sorte immer dabei. Eine Schätzung, die aussieht
 * wie eine Zusage, ist eine Lüge mit Zwischenschritt.
 *
 * WARTUNG: Diese Tabelle veraltet von selbst. `SUPPORT_CHECKED` ist das
 * Datum, an dem sie zuletzt gegen die Herstellerangaben geprüft wurde – vor
 * dem Livegang und danach etwa halbjährlich nachziehen.
 */

/** Stand der Angaben. Beim Prüfen mit hochsetzen. */
export const SUPPORT_CHECKED = "2026-08-01";

export type SupportSource = "hersteller" | "schaetzung";

export interface SupportEntry {
  /** Modell-Kennung aus `lib/data/devices.ts`. */
  model: string;
  /** Markteinführung, Monatsgenauigkeit (YYYY-MM). */
  released: string;
  /** Letzter Monat mit neuen Betriebssystem-Versionen (YYYY-MM). */
  osUntil: string;
  /** Letzter Monat mit Sicherheitsupdates (YYYY-MM). */
  securityUntil: string;
  source: SupportSource;
  /** Worauf die Angabe beruht – erscheint als Beleg auf der Seite. */
  basis: string;
}

/*
  Apple: keine veröffentlichte Zusage. Grundlage der Schätzung ist das
  bisherige Muster – etwa sechs Jahre neue iOS-Versionen ab Markteinführung,
  danach rund zwei Jahre Sicherheitskorrekturen für die letzte Version, die
  das Gerät noch erhalten hat.
*/
const APPLE_BASIS =
  "Apple nennt keinen Zeitraum. Geschätzt nach dem bisherigen Muster: rund sechs Jahre neue iOS-Versionen, danach etwa zwei Jahre Sicherheitskorrekturen.";

const SAMSUNG_7 =
  "Samsung sagt für diese Reihe sieben Jahre Betriebssystem- und Sicherheitsupdates ab Markteinführung zu.";
const SAMSUNG_4_5 =
  "Samsung sagt für dieses Modell vier Jahre Betriebssystem-Updates und fünf Jahre Sicherheitsupdates ab Markteinführung zu.";

const GOOGLE_7 =
  "Google sagt für diese Reihe sieben Jahre Betriebssystem-, Sicherheits- und Funktionsupdates ab Markteinführung zu.";
const GOOGLE_3_5 =
  "Google sagt für dieses Modell drei Jahre Betriebssystem-Updates und fünf Jahre Sicherheitsupdates ab Markteinführung zu.";

export const supportEntries: SupportEntry[] = [
  // Apple – Schätzungen, keine Zusagen
  { model: "iphone-16-pro-max", released: "2024-09", osUntil: "2030-09", securityUntil: "2032-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-16-pro", released: "2024-09", osUntil: "2030-09", securityUntil: "2032-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-16", released: "2024-09", osUntil: "2030-09", securityUntil: "2032-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-15-pro", released: "2023-09", osUntil: "2029-09", securityUntil: "2031-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-15", released: "2023-09", osUntil: "2029-09", securityUntil: "2031-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-14-pro", released: "2022-09", osUntil: "2028-09", securityUntil: "2030-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-14", released: "2022-09", osUntil: "2028-09", securityUntil: "2030-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-13", released: "2021-09", osUntil: "2027-09", securityUntil: "2029-09", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-12", released: "2020-10", osUntil: "2026-10", securityUntil: "2028-10", source: "schaetzung", basis: APPLE_BASIS },
  { model: "iphone-se-2022", released: "2022-03", osUntil: "2028-03", securityUntil: "2030-03", source: "schaetzung", basis: APPLE_BASIS },

  // Samsung – ausdrückliche Zusagen
  { model: "galaxy-s24-ultra", released: "2024-01", osUntil: "2031-01", securityUntil: "2031-01", source: "hersteller", basis: SAMSUNG_7 },
  { model: "galaxy-s24", released: "2024-01", osUntil: "2031-01", securityUntil: "2031-01", source: "hersteller", basis: SAMSUNG_7 },
  { model: "galaxy-s23-ultra", released: "2023-02", osUntil: "2027-02", securityUntil: "2028-02", source: "hersteller", basis: SAMSUNG_4_5 },
  { model: "galaxy-s23", released: "2023-02", osUntil: "2027-02", securityUntil: "2028-02", source: "hersteller", basis: SAMSUNG_4_5 },
  { model: "galaxy-s22", released: "2022-02", osUntil: "2026-02", securityUntil: "2027-02", source: "hersteller", basis: SAMSUNG_4_5 },
  { model: "galaxy-z-flip-5", released: "2023-08", osUntil: "2027-08", securityUntil: "2028-08", source: "hersteller", basis: SAMSUNG_4_5 },
  { model: "galaxy-a54", released: "2023-03", osUntil: "2027-03", securityUntil: "2028-03", source: "hersteller", basis: SAMSUNG_4_5 },
  { model: "galaxy-a34", released: "2023-03", osUntil: "2027-03", securityUntil: "2028-03", source: "hersteller", basis: SAMSUNG_4_5 },

  // Google – ausdrückliche Zusagen
  { model: "pixel-9-pro", released: "2024-08", osUntil: "2031-08", securityUntil: "2031-08", source: "hersteller", basis: GOOGLE_7 },
  { model: "pixel-9", released: "2024-08", osUntil: "2031-08", securityUntil: "2031-08", source: "hersteller", basis: GOOGLE_7 },
  { model: "pixel-8-pro", released: "2023-10", osUntil: "2030-10", securityUntil: "2030-10", source: "hersteller", basis: GOOGLE_7 },
  { model: "pixel-8", released: "2023-10", osUntil: "2030-10", securityUntil: "2030-10", source: "hersteller", basis: GOOGLE_7 },
  { model: "pixel-7a", released: "2023-05", osUntil: "2026-05", securityUntil: "2028-05", source: "hersteller", basis: GOOGLE_3_5 },
  { model: "pixel-7", released: "2022-10", osUntil: "2025-10", securityUntil: "2027-10", source: "hersteller", basis: GOOGLE_3_5 },
  { model: "pixel-6a", released: "2022-07", osUntil: "2025-07", securityUntil: "2027-07", source: "hersteller", basis: GOOGLE_3_5 },
];

const byModel = new Map(supportEntries.map((entry) => [entry.model, entry]));

export function supportFor(modelId: string): SupportEntry | undefined {
  return byModel.get(modelId);
}

/**
 * Monate zwischen heute und einem Monatsdatum (YYYY-MM). Gerechnet wird auf
 * das Ende des genannten Monats – „bis Februar 2027" heißt einschließlich
 * Februar.
 */
export function monthsUntil(iso: string, today = new Date()): number {
  const [year, month] = iso.split("-").map(Number);
  return (year - today.getFullYear()) * 12 + (month - (today.getMonth() + 1));
}

export type SupportLevel = "lang" | "mittel" | "knapp" | "abgelaufen";

export interface SupportStatus {
  entry: SupportEntry;
  /** Verbleibende Monate mit Sicherheitsupdates. Negativ = vorbei. */
  months: number;
  level: SupportLevel;
  /** Kurzurteil in einem Halbsatz. */
  label: string;
}

/*
  Die Schwellen sind bewusst grob. Drei Jahre sind länger als der übliche
  Besitzzeitraum – da lohnt jede Reparatur. Unter einem Jahr wird es zur
  Rechenaufgabe, und die soll der Kunde selbst machen können, nicht wir für
  ihn.
*/
export function supportStatus(entry: SupportEntry, today = new Date()): SupportStatus {
  const months = monthsUntil(entry.securityUntil, today);
  let level: SupportLevel;
  let label: string;

  if (months <= 0) {
    level = "abgelaufen";
    label = "Keine Sicherheitsupdates mehr";
  } else if (months < 12) {
    level = "knapp";
    label = "Weniger als ein Jahr Sicherheitsupdates";
  } else if (months < 36) {
    level = "mittel";
    label = "Noch einige Jahre versorgt";
  } else {
    level = "lang";
    label = "Lange versorgt";
  }

  return { entry, months, level, label };
}

/** „September 2029" – Monat und Jahr, wie es auf der Seite steht. */
export function formatMonth(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

/** „3 Jahre 4 Monate" – aus einer Monatszahl. */
export function formatDuration(months: number): string {
  if (months <= 0) return "abgelaufen";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Jahr" : "Jahre"}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? "Monat" : "Monate"}`);
  return parts.join(" ");
}
