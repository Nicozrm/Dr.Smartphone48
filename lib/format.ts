const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatEuro(value: number): string {
  return euro.format(value);
}

export function formatMinutes(minutes: number): string {
  if (minutes >= 1440) return "1–2 Werktage";
  if (minutes < 60) return `${minutes} Minuten`;
  const halves = Math.round((minutes / 60) * 2) / 2;
  const label = halves.toLocaleString("de-DE");
  return `ca. ${label} Std.`;
}

/*
  Zeitangaben.

  Die Zeitzone steht fest auf Europe/Berlin, und das ist kein Detail: Ohne sie
  formatiert der Server nach seiner eigenen Zone (auf Cloudflare und Vercel
  UTC), der Browser nach der des Besuchers – und React meldet beim Hydrieren
  einen Unterschied, den niemand versteht. Eine Werkstatt in Greven rechnet in
  deutscher Zeit; das gilt auch für einen Kunden, der von unterwegs schaut.
*/

const dateTime = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

const dateOnly = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

const timeOnly = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

/** „3. August 2026, 14:12 Uhr" – für Zeitpunkte, die genau sein müssen. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${dateTime.format(date)} Uhr`;
}

/** „3. August 2026" – für Tage. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateOnly.format(date);
}

/** „14:12" – wenn der Tag aus dem Zusammenhang hervorgeht. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return timeOnly.format(date);
}

/**
 * „vor 3 Stunden".
 *
 * `now` wird ausdrücklich übergeben statt hier gelesen: Eine Angabe, die von
 * der aktuellen Uhrzeit abhängt, unterscheidet sich zwischen Server und
 * Browser immer. Wer sie benutzt, tut das in einer Client-Komponente nach dem
 * ersten Rendern – wie die Restlaufzeit auf /versorgung.
 */
export function formatSince(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "gerade eben";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Minute${minutes === 1 ? "" : "n"}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Stunde${hours === 1 ? "" : "n"}`;

  const days = Math.round(hours / 24);
  if (days < 31) return `vor ${days} Tag${days === 1 ? "" : "en"}`;

  const months = Math.round(days / 30);
  return `vor ${months} Monat${months === 1 ? "" : "en"}`;
}
