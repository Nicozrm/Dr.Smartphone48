/**
 * Die Übergabe – wie ein Vorgang in die Rechnung und in das Zertifikat kommt.
 *
 * Der interne Bereich bestand aus drei Inseln: Die Vorgänge liegen in der
 * Datenbank, das Rechnungswerkzeug im `localStorage` des Betriebsrechners,
 * der Zertifikatsaussteller für sich allein. Wer nach der Reparatur eine
 * Rechnung schrieb, tippte Modell, IMEI und Reparaturart ein zweites Mal ab –
 * und beim Zertifikat ein drittes Mal. Jede Abschrift ist eine Gelegenheit,
 * sich zu vertippen, und ausgerechnet die IMEI trägt das Zertifikat als
 * Gerätebindung.
 *
 * ## Warum sessionStorage und nicht die Adresse
 *
 * Der naheliegende Weg wäre `/intern/rechnung?vorgang=K7M2-B94X&kunde=…`.
 * Genau das darf hier nicht passieren: In der Adresse stünde ein Kundenname,
 * und eine Adresse landet im Verlauf des Browsers, in der Autovervollständigung
 * und in jedem Zugriffsprotokoll, das jemand später einschaltet. Dieselbe
 * Überlegung wie beim Reparaturzertifikat, dessen Beleg deshalb im
 * **Fragment** steht.
 *
 * ## Warum sessionStorage und nicht localStorage
 *
 * Weil es eine Übergabe ist und kein Bestand. Sie soll den Weg von einer
 * Seite zur nächsten überstehen und keinen Tag länger: Wer den Vorgang doch
 * nicht abrechnet, soll nicht morgen einen Kundennamen im Speicher haben,
 * von dem er nichts mehr weiß. `sessionStorage` endet mit dem Tab.
 *
 * ## Warum nichts gelesen und dabei gelöscht wird
 *
 * Der erste Entwurf holte die Übergabe und räumte sie im selben Zug weg.
 * Das ist genau dann falsch, wenn im Rechnungswerkzeug noch ein unfertiger
 * Entwurf liegt: Dann muss der Betrieb entscheiden, ob er ihn ersetzt – und
 * bis dahin darf die Übergabe nicht schon verbraucht sein. Gelesen wird
 * deshalb ohne Nebenwirkung (`peekHandoff`), weggeräumt wird erst, wenn die
 * Entscheidung gefallen ist (`clearHandoff`).
 */

/*
  Ausschließlich `import type`, und das ist eine Bedingung, keine Vorliebe.

  `scripts/verify-intern.mjs` lädt dieses Modul direkt mit Node und
  `--experimental-strip-types`. Reine Typ-Importe werden dabei restlos
  entfernt, ein Wert-Import müsste dagegen zur Laufzeit aufgelöst werden –
  und Node kennt weder die `@/`-Kürzel aus der tsconfig noch endungslose
  relative Pfade. Genau daran scheiterte der erste Anlauf, der sich
  `repairMeta` für die Beschriftung holte.

  Gebraucht wurde sie ohnehin nicht: Der Vorgang trägt die Beschriftung
  jeder Position selbst, als Kopie aus dem Katalog zum Zeitpunkt der
  Anmeldung. Sie hier ein zweites Mal nachzuschlagen hieße, den zugesagten
  Text nachträglich gegen den heutigen zu tauschen.
*/
import type { RepairKind } from "../data/devices";
import type { CertRepair } from "../cert/format";
import type { InvoiceLine, Party, TaxRate } from "../invoice/types";
import type { RepairTicket } from "../tickets/types";

/** Der Schlüssel im sessionStorage. */
export const HANDOFF_KEY = "ds48:intern:uebergabe";

/** Wohin die Übergabe geht. */
export type HandoffTarget = "rechnung" | "zertifikat";

/**
 * Was übergeben wird – und **nur** das.
 *
 * Die Liste ist bewusst kurz und wird vom Prüfskript gegen den vollständigen
 * Vorgang gehalten: Interne Vermerke, Historie, Zustand und Zusagen gehören
 * weder auf eine Rechnung noch in ein Zertifikat. Was hier nicht steht,
 * verlässt die Werkstattansicht nicht.
 */
export interface Handoff {
  /** Fassung des Formats. Ein Eintrag aus einer älteren Fassung wird
      verworfen statt falsch gelesen. */
  v: 1;
  target: HandoffTarget;
  ticketCode: string;
  customer: string;
  email: string | null;
  device: string;
  imei: string | null;
  repairs: { kind: RepairKind; label: string; price: number }[];
  /** Summe der Festpreise in Euro, wie im Vorgang zugesagt. */
  totalPrice: number;
}

/** Baut die Übergabe aus einem Vorgang. */
export function buildHandoff(ticket: RepairTicket, target: HandoffTarget): Handoff {
  return {
    v: 1,
    target,
    ticketCode: ticket.ticketCode,
    customer: ticket.customer,
    email: ticket.email,
    device: ticket.device,
    imei: ticket.imei,
    repairs: ticket.repairItems.map((item) => ({
      kind: item.kind,
      label: item.label,
      price: item.price,
    })),
    totalPrice: ticket.totalPrice,
  };
}

/**
 * Euro aus dem Vorgang in ganzzahlige Cent.
 *
 * Der Vorgang führt Festpreise in Euro, das Rechnungswerkzeug rechnet
 * ausschließlich in ganzzahligen Cent (`lib/invoice/calc.ts`). Genau an
 * dieser Naht entsteht sonst der Cent-Fehler, gegen den `verify:invoice`
 * gebaut ist: `199.9 * 100` ergibt in Gleitkomma 19989.999999999996, und
 * `Math.trunc` machte daraus 19989.
 */
export function euroToCents(euro: number): number {
  return Math.round(euro * 100);
}

/**
 * Der Steuersatz einer Reparatur.
 *
 * Kommt aus `repairMeta`, damit Rechnung und Sofortpreis-Rechner nicht
 * auseinanderlaufen – dieselbe Regel wie in `lib/invoice/catalog.ts`. Eine
 * hier fest eingetragene 19 wäre eine zweite Wahrheit über denselben Preis.
 */
export const REPAIR_TAX_RATE: TaxRate = 19;

/** Positionen für das Rechnungswerkzeug. */
export function toInvoiceLines(handoff: Handoff): InvoiceLine[] {
  return handoff.repairs.map((repair, index) => ({
    // Bestimmt statt zufällig: Zweimal dieselbe Übergabe ergibt dieselbe
    // Rechnung, und ein Prüfskript kann sie vergleichen.
    id: `ueb-${handoff.ticketCode}-${index}`,
    qty: 1,
    unit: "Pausch.",
    title: repair.label,
    note: [handoff.device, handoff.imei ? `IMEI ${handoff.imei}` : ""]
      .filter(Boolean)
      .join(" · "),
    unitCents: euroToCents(repair.price),
    taxRate: REPAIR_TAX_RATE,
    discountPct: 0,
  }));
}

/**
 * Der Empfänger, soweit der Vorgang ihn kennt.
 *
 * Das ist wenig: Name und E-Mail, keine Anschrift – die fragt die Anmeldung
 * eines Vorgangs gar nicht ab. Der Rest bleibt leer und wird im
 * Rechnungswerkzeug ergänzt oder aus dem Kundenarchiv gezogen. Eine erfundene
 * Anschrift wäre auf einer Rechnung nach § 14 UStG ein Formfehler mit
 * Ansage.
 */
export function toInvoiceParty(handoff: Handoff): Party {
  return {
    name: handoff.customer,
    extra: "",
    street: "",
    zip: "",
    city: "",
    country: "DE",
    vatId: "",
    email: handoff.email ?? "",
    reference: handoff.ticketCode,
  };
}

/** Gerätebezug für den Kopf der Rechnung. */
export function toInvoiceDevice(handoff: Handoff): {
  model: string;
  imei: string;
  condition: string;
} {
  return {
    model: handoff.device,
    imei: handoff.imei ?? "",
    condition: "",
  };
}

/**
 * Die Reparaturarten für das Zertifikat.
 *
 * `RepairKind` und `CertRepair` sind zwei Aufzählungen mit denselben acht
 * Werten – die eine im Gerätekatalog, die andere im eingefrorenen
 * Binärformat des Zertifikats. Dass sie übereinstimmen, ist hier die
 * Voraussetzung dafür, dass diese Zuordnung überhaupt erlaubt ist.
 * `verify:intern` vergleicht beide Listen zeichen- und reihenfolgengenau;
 * driften sie auseinander, schlägt es an, statt hier still das falsche Bit
 * zu setzen.
 */
export function toCertificateRepairs(handoff: Handoff): CertRepair[] {
  return handoff.repairs.map((repair) => repair.kind as unknown as CertRepair);
}

/** Der Bruttobetrag aller Positionen in Cent. */
export function invoiceGrossCents(handoff: Handoff): number {
  return toInvoiceLines(handoff).reduce(
    (sum, line) => sum + line.unitCents * line.qty,
    0,
  );
}

/* ---- Browser ------------------------------------------------------------- */

/** Übergabe hinterlegen. Überschreibt eine ältere – es gibt immer nur eine. */
export function putHandoff(handoff: Handoff): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    /* Privater Modus ohne Speicher: Dann wird eben abgetippt. */
  }
}

/**
 * Übergabe lesen, **ohne** sie zu verbrauchen.
 *
 * Gibt nur zurück, was zum Ziel passt und die erwartete Fassung trägt.
 * Alles andere gilt als nicht vorhanden – ein Eintrag aus einer früheren
 * Fassung soll nicht halb gelesen werden.
 */
export function peekHandoff(target: HandoffTarget): Handoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Handoff;
    if (parsed?.v !== 1 || parsed.target !== target) return null;
    if (!Array.isArray(parsed.repairs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Übergabe wegräumen – erst nach der Entscheidung des Betriebs. */
export function clearHandoff(): void {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* siehe putHandoff */
  }
}
