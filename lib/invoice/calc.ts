import type { Invoice, InvoiceLine, TaxMode, TaxRate } from "./types";

/**
 * Rechenkern. Ganzzahlig in Cent, kaufmännisch gerundet.
 *
 * Zwei Wege führen zum selben Blatt: Der Betrieb denkt in Ladenpreisen
 * (brutto), das Finanzamt in Netto plus Steuer. Beide Richtungen sind hier
 * abgebildet – gerundet wird pro Position, nicht erst in der Summe, damit die
 * ausgewiesenen Zeilen sich auch tatsächlich zur Endsumme addieren. Wer erst
 * am Ende rundet, produziert Rechnungen, die um einen Cent nicht aufgehen.
 */

/** Kaufmännische Rundung (halbe Cent immer aufwärts, auch bei Negativbeträgen). */
function round(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export interface LineTotals {
  /** Positionswert vor Rabatt, in der eingegebenen Preisart. */
  rawCents: number;
  discountCents: number;
  netCents: number;
  taxCents: number;
  grossCents: number;
  /** Tatsächlich angewandter Steuersatz (0 bei § 19 / § 25a). */
  effectiveRate: TaxRate;
}

/** § 19 und § 25a weisen keine Umsatzsteuer aus – der Satz fällt auf 0. */
export function effectiveRate(rate: TaxRate, mode: TaxMode): TaxRate {
  return mode === "regel" ? rate : 0;
}

export function lineTotals(line: InvoiceLine, invoice: Invoice): LineTotals {
  const rate = effectiveRate(line.taxRate, invoice.taxMode);
  const factor = 1 + rate / 100;

  const rawCents = round(line.qty * line.unitCents);
  const discountCents = round(rawCents * (line.discountPct / 100));
  const value = rawCents - discountCents;

  let netCents: number;
  let grossCents: number;

  if (invoice.grossEntry) {
    grossCents = value;
    netCents = round(grossCents / factor);
  } else {
    netCents = value;
    grossCents = round(netCents * factor);
  }

  return {
    rawCents,
    discountCents,
    netCents,
    taxCents: grossCents - netCents,
    grossCents,
    effectiveRate: rate,
  };
}

export interface TaxGroup {
  rate: TaxRate;
  netCents: number;
  taxCents: number;
  grossCents: number;
}

export interface InvoiceTotals {
  lines: (LineTotals & { id: string })[];
  /** Aufschlüsselung nach Steuersätzen – § 14 Abs. 4 Nr. 8 UStG. */
  groups: TaxGroup[];
  netCents: number;
  taxCents: number;
  grossCents: number;
  discountCents: number;
  /** Fälligkeitsdatum als ISO-String, aus Datum + Zahlungsziel. */
  dueDate: string;
}

export function invoiceTotals(invoice: Invoice): InvoiceTotals {
  const lines = invoice.lines.map((l) => ({ id: l.id, ...lineTotals(l, invoice) }));

  const byRate = new Map<TaxRate, TaxGroup>();
  for (const l of lines) {
    const g = byRate.get(l.effectiveRate) ?? {
      rate: l.effectiveRate,
      netCents: 0,
      taxCents: 0,
      grossCents: 0,
    };
    g.netCents += l.netCents;
    g.taxCents += l.taxCents;
    g.grossCents += l.grossCents;
    byRate.set(l.effectiveRate, g);
  }

  const groups = [...byRate.values()].sort((a, b) => b.rate - a.rate);

  return {
    lines,
    groups,
    netCents: lines.reduce((s, l) => s + l.netCents, 0),
    taxCents: lines.reduce((s, l) => s + l.taxCents, 0),
    grossCents: lines.reduce((s, l) => s + l.grossCents, 0),
    discountCents: lines.reduce((s, l) => s + l.discountCents, 0),
    dueDate: addDays(invoice.date, invoice.dueDays),
  };
}

/* ---- Formatierung -------------------------------------------------------- */

const euroFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Cent → „1.234,56 €“. */
export function cents(value: number): string {
  return euroFmt.format(value / 100);
}

/** Cent → „1234.56“ (Maschinenformat für QR-Code und Export). */
export function centsPlain(value: number): string {
  return (value / 100).toFixed(2);
}

/** Eingabefeld-Format ohne Währungszeichen. */
export function centsInput(value: number): string {
  return numFmt.format(value / 100);
}

/** „129,90“ oder „129.90“ → 12990. Leere Eingabe ergibt 0. */
export function parseCents(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "");
  const normalised = cleaned.replace(",", ".");
  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) ? round(value * 100) : 0;
}

/** „1,5“ → 1.5. Mengen unter 0 sind nicht zulässig. */
export function parseQty(input: string): number {
  const value = Number.parseFloat(input.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function formatQty(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);
}

/* ---- Datum --------------------------------------------------------------- */

export function today(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** ISO → „01.08.2026“. */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}
