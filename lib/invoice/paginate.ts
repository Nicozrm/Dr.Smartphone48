import type { LineTotals } from "./calc";
import type { Invoice, InvoiceLine } from "./types";

/**
 * Seitenumbruch.
 *
 * Vorher schnitt das Blatt bei 297 mm einfach ab – ab etwa vierzehn Positionen
 * fiel die Summe unter den Rand. Der Editor hat davor gewarnt; das ist besser
 * als nichts, aber keine Lösung. Eine Rechnung mit dreißig Positionen ist im
 * Werkstattalltag normal (Ersatzteile, Arbeitszeit, Zubehör), und sie gehört
 * auf zwei Blätter, nicht in eine Fehlermeldung.
 *
 * Gerechnet wird ohne DOM: Die Zeilenhöhe folgt aus der Zeichenzahl, weil
 * Schriftgröße, Spaltenbreite und Zeilenabstand hier festgelegt sind und nicht
 * vom Browser abhängen. Messen im Layout wäre genauer, würde aber bei jedem
 * Tastendruck einen Reflow auslösen – für ein Werkzeug, das während des Tippens
 * mitrechnet, ist das der falsche Tausch. Die Schätzung fällt bewusst
 * großzügig aus: Eine halbe Zeile Luft zu viel kostet nichts, eine halbe zu
 * wenig kostet ein abgeschnittenes Blatt.
 *
 * Alle Maße in Millimetern.
 */

/* ---- Seitengeometrie ----------------------------------------------------- */

export const PAGE_H = 297;
export const PAGE_W = 210;
export const MARGIN_L = 25;
export const MARGIN_R = 20;
export const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/** Oberkante der Positionstabelle auf Folgeseiten (unter dem schmalen Kopf). */
const TOP_FOLLOW = 46;
/** Unterkante der Tabelle auf Zwischenseiten. */
const BOTTOM_LIMIT = 252;
/** Unterkante des Textflusses auf der Schlussseite ohne Zahlungsabschnitt. */
const LAST_BOTTOM = 258;
/** Mit Zahlungsabschnitt: Der Abschnitt sitzt fest über der Fußzeile. */
const LAST_BOTTOM_SLIP = 230;

/** Grundhöhe einer Position ohne Zusatzzeilen. */
const ROW_BASE = 8.2;
/** Jede weitere Textzeile innerhalb einer Position. */
const ROW_EXTRA = 4.3;
/** Zeichen, die in der Bezeichnungsspalte pro Zeile Platz finden. */
const CHARS_TITLE = 44;
const CHARS_NOTE = 52;
/** Übertragszeile am Seitenfuß bzw. Seitenkopf. */
export const CARRY_H = 8.2;

/* ---- Höhenabschätzung ---------------------------------------------------- */

function wraps(text: string, perLine: number): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / perLine));
}

/** Höhe einer Positionszeile in Millimetern. */
export function lineHeight(line: InvoiceLine): number {
  const titleLines = Math.max(1, wraps(line.title || "Ohne Bezeichnung", CHARS_TITLE));
  const noteLines = wraps(line.note, CHARS_NOTE);
  const discountLines = line.discountPct > 0 ? 1 : 0;
  return ROW_BASE + (titleLines - 1 + noteLines + discountLines) * ROW_EXTRA;
}

interface HeadHeights {
  /** Oberkante der Tabelle auf Seite 1 – abhängig von Gerätefeld und Intro. */
  top: number;
  /** Platzbedarf von Summenblock, Hinweisen und Zahlungsabschnitt. */
  closing: number;
}

/* Die folgenden Höhen sind aus dem Stylesheet nachgerechnet, nicht geraten:
   Schriftgröße mal Zeilenabstand plus Innenabstände. Wer an globals.css
   schraubt, muss hier mitziehen – deshalb steht die Herleitung dabei. */

/** Betreffzeile (6,2 mm) + 2,4 mm Abstand + Regel + 4 mm Luft. */
const SUBJECT_H = 14;
/** Geräteblock: 2×2 mm Polsterung, Label 2,5 mm, Wert 3,2 mm, 4 mm Abstand. */
const DEVICE_H = 15;
/** Summenkaskade: Abstand 5 mm, zwei Zeilen à 6,8 mm, Gesamtbetrag 11,4 mm. */
const SUMMARY_H = 31;
/**
 * Schlusstext.
 *
 * Steht seit dieser Fassung **neben** der Summe, nicht darunter. Untereinander
 * kosteten beide zusammen 72 mm – bei 137 mm Kopfhöhe blieben damit sieben
 * Millimeter für Positionen übrig, und schon eine einzelne Zeile drückte die
 * Rechnung auf zwei Blätter. Nebeneinander zählt nur der höhere von beiden.
 */
const NOTES_H = 24;
/** Abtrennbarer Zahlungsabschnitt mit GiroCode, inklusive Perforation. */
export const SLIP_H = 34;

export function headHeights(invoice: Invoice): HeadHeights {
  const hasDevice = Boolean(
    invoice.device.model || invoice.device.imei || invoice.device.condition,
  );
  const introLines = wraps(invoice.intro, 88);
  const closingLines = wraps(invoice.closing, 88);

  return {
    top:
      98 +
      SUBJECT_H +
      (hasDevice ? DEVICE_H : 0) +
      (introLines > 0 ? introLines * 4.6 + 4 : 0),
    // Der Zahlungsabschnitt fließt nicht mit – er sitzt absolut über der
    // Fußzeile. Für ihn wird stattdessen die Unterkante angehoben.
    closing: Math.max(SUMMARY_H, NOTES_H + closingLines * 4.6) + 6,
  };
}

/* ---- Aufteilung ---------------------------------------------------------- */

export interface PageLine {
  line: InvoiceLine;
  totals: LineTotals;
  /** Fortlaufende Nummer über alle Seiten hinweg. */
  index: number;
}

export interface SheetPage {
  lines: PageLine[];
  /** Summe aller Positionen der Vorseiten – 0 auf Seite 1. */
  carryIn: number;
  /** Summe einschließlich dieser Seite – null auf der letzten Seite. */
  carryOut: number | null;
  /** Trägt diese Seite den Summenblock? */
  isLast: boolean;
  /** Oberkante der Tabelle auf dieser Seite. */
  top: number;
  /** Unterkante der Tabelle nach der Aufteilung – für die Platzprüfung. */
  endY: number;
}

/**
 * Verteilt die Positionen auf Blätter.
 *
 * Ablauf: Seiten füllen, bis der Platz endet; danach prüfen, ob auf der
 * letzten Seite noch Summe und Zahlungsabschnitt hineinpassen. Wenn nicht,
 * bekommt der Abschluss ein eigenes Blatt. Eine Rechnung, deren Endsumme
 * einsam auf Seite drei steht, ist unschön – eine abgeschnittene ist falsch.
 */
export function paginate(
  invoice: Invoice,
  lineTotals: LineTotals[],
  grossOf: (t: LineTotals) => number,
  hasSlip: boolean,
): SheetPage[] {
  const { top: top1, closing } = headHeights(invoice);
  const lastBottom = hasSlip ? LAST_BOTTOM_SLIP : LAST_BOTTOM;
  const items: PageLine[] = invoice.lines.map((line, i) => ({
    line,
    totals: lineTotals[i],
    index: i,
  }));

  if (items.length === 0) {
    return [
      { lines: [], carryIn: 0, carryOut: null, isLast: true, top: top1, endY: top1 },
    ];
  }

  const pages: SheetPage[] = [];
  let cursor = 0;
  let carry = 0;

  while (cursor < items.length) {
    const first = pages.length === 0;
    const top = first ? top1 : TOP_FOLLOW;
    // Auf Folgeseiten steht oben eine Übertragszeile.
    let y = top + (first ? 0 : CARRY_H);
    const bucket: PageLine[] = [];

    while (cursor < items.length) {
      const h = lineHeight(items[cursor].line);
      const remaining = items.length - cursor;
      // Platz für die Übertragszeile am Fuß freihalten, falls noch etwas folgt.
      const reserve = remaining > 1 ? CARRY_H : 0;
      if (y + h + reserve > BOTTOM_LIMIT && bucket.length > 0) break;
      bucket.push(items[cursor]);
      y += h;
      cursor++;
    }

    const pageSum = bucket.reduce((s, b) => s + grossOf(b.totals), 0);
    const carryIn = carry;
    carry += pageSum;

    pages.push({
      lines: bucket,
      carryIn,
      carryOut: cursor < items.length ? carry : null,
      isLast: false,
      top,
      endY: y,
    });
  }

  const last = pages[pages.length - 1];

  if (last.endY + closing > lastBottom) {
    // Der Abschluss passt nicht mehr: eigenes Blatt, mit Übertrag als Anschluss.
    const tail: SheetPage = {
      lines: [],
      carryIn: carry,
      carryOut: null,
      isLast: true,
      top: TOP_FOLLOW,
      endY: TOP_FOLLOW + CARRY_H,
    };

    /*
      Schusterjunge vermeiden.

      Ein Blatt, auf dem nichts steht außer der Endsumme, sieht nach einem
      Fehler aus – der Kunde dreht das Papier um und sucht die fehlenden
      Positionen. Deshalb wandern bis zu drei Zeilen vom Vorblatt mit, solange
      sie samt Abschluss hineinpassen. Klassischer Umbruchsatz, nur eben in
      TypeScript statt in Blei.
    */
    while (last.lines.length > 1 && tail.lines.length < 3) {
      const candidate = last.lines[last.lines.length - 1];
      const h = lineHeight(candidate.line);
      if (tail.endY + h + closing > lastBottom) break;
      last.lines.pop();
      tail.lines.unshift(candidate);
      tail.endY += h;
      last.endY -= h;
    }

    // Überträge nach der Verschiebung neu bestimmen.
    const moved = tail.lines.reduce((sum, l) => sum + grossOf(l.totals), 0);
    last.carryOut = carry - moved;
    tail.carryIn = carry - moved;

    pages.push(tail);
  } else {
    last.isLast = true;
  }

  return pages;
}
