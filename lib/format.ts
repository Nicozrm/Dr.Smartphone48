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
