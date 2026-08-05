import { addDays, invoiceTotals, round, type InvoiceTotals } from "./calc";
import { isValidIban } from "./girocode";
import type { CompanyProfile, Invoice, InvoiceLine, TaxRate } from "./types";
import type { Issue } from "./validate";

/**
 * E-Rechnung nach EN 16931 – die semantische Ebene.
 *
 * Warum das hier steht: Seit dem 1. Januar 2025 muss jedes deutsche
 * Unternehmen strukturierte E-Rechnungen **empfangen** können. Ausstellen muss
 * sie ab dem 1. Januar 2027, wer mehr als 800.000 € Vorjahresumsatz hat – und
 * ab dem 1. Januar 2028 **jeder** im B2B-Geschäft. Eine Werkstatt, die einer
 * GmbH ein Display tauscht, fällt darunter. Ein PDF per E-Mail ist dann keine
 * Rechnung mehr, sondern ein Bild von einer Rechnung.
 *
 * Dieses Modul übersetzt das interne Rechnungsmodell in die Begriffe der Norm
 * (die „BT-“-Nummern in den Kommentaren sind die Business Terms aus
 * EN 16931-1). Die Syntax – CII für ZUGFeRD und XRechnung – entsteht daraus in
 * `cii.ts`.
 *
 * Bewusst getrennt: Die Abbildung ist die Stelle, an der steuerliche
 * Entscheidungen fallen (welcher Steuerkategorie entspricht § 25a?). Die
 * Syntax ist danach stures Auffüllen von Elementen.
 *
 * Keine Steuerberatung. Die Zuordnung folgt der gängigen deutschen Praxis;
 * bei § 25a gehört sie einmal vom Steuerbüro bestätigt.
 */

/** Zielformat. Beide nutzen dieselbe CII-Syntax, nur eine andere Kennung. */
export type EInvoiceTarget = "zugferd" | "xrechnung";

/** Kennung des Regelwerks (BT-24). */
export const GUIDELINE: Record<EInvoiceTarget, string> = {
  // ZUGFeRD 2.3 / Factur-X, Profil EN 16931 („Comfort“).
  zugferd: "urn:cen.eu:en16931:2017",
  /*
    XRechnung 3.0 – die Ausprägung, die öffentliche Auftraggeber verlangen.

    Der Namensraum lautet `xeinkauf.de`, nicht `xoev-de`: Die KoSIT hat ihn mit
    Version 3.0 gewechselt. Die alte 2.x-Kennung sieht fast gleich aus, wird
    von der Prüfung der Verwaltung aber als „keine XRechnung“ gewertet – die
    Rechnung kommt zurück, ohne dass an ihrem Inhalt etwas falsch wäre.
  */
  xrechnung: "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0",
};

/**
 * Mengeneinheit → UN/ECE Recommendation 20.
 *
 * Die Norm kennt keine „Stk.“, sondern C62. Was nicht in der Liste steht, wird
 * zu C62 („one“) – lieber eine unspezifische Einheit als ein Code, den der
 * Empfänger nicht auflösen kann.
 */
export function unitCode(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (["std", "stunde", "stunden", "h"].includes(u)) return "HUR";
  if (["tag", "tage", "d"].includes(u)) return "DAY";
  if (["kg"].includes(u)) return "KGM";
  if (["m", "meter"].includes(u)) return "MTR";
  if (["l", "liter"].includes(u)) return "LTR";
  if (["set", "satz"].includes(u)) return "SET";
  return "C62";
}

/** Zahlungsart → UNTDID 4461 (BT-81). */
export function paymentMeansCode(invoice: Invoice): string {
  switch (invoice.paymentMethod) {
    case "bar":
      return "10"; // Barzahlung
    case "karte":
      return "48"; // Kartenzahlung
    case "paypal":
      return "68"; // Online-Bezahldienst
    default:
      return "58"; // SEPA-Überweisung
  }
}

/**
 * Steuerkategorie (BT-151) nach UNTDID 5305 – die heikelste Abbildung.
 *
 * - `S`  Regelbesteuerung mit ausgewiesenem Satz.
 * - `E`  steuerbefreit; verlangt zwingend einen Befreiungsgrund (BT-120).
 *
 * § 19 UStG (Kleinunternehmer) und § 25a UStG (Differenzbesteuerung) weisen
 * beide keine Umsatzsteuer aus und werden deshalb als `E` mit Begründung
 * abgebildet. Für § 25a ist das die verbreitete Praxis, aber keine reine
 * Lehre – die Norm kennt für die Differenzbesteuerung keine eigene Kategorie.
 */
export interface TaxCategory {
  code: "S" | "E";
  /** Prozentsatz (BT-119). Bei `E` immer 0. */
  rate: number;
  /** Befreiungsgrund im Klartext (BT-120). Nur bei `E`. */
  exemptionReason?: string;
}

export function taxCategory(invoice: Invoice, rate: TaxRate): TaxCategory {
  if (invoice.taxMode === "klein") {
    return {
      code: "E",
      rate: 0,
      exemptionReason: "Kleinunternehmer gemäß § 19 UStG – kein Ausweis von Umsatzsteuer.",
    };
  }
  if (invoice.taxMode === "differenz") {
    return {
      code: "E",
      rate: 0,
      exemptionReason:
        "Differenzbesteuerung nach § 25a UStG – Gebrauchtgegenstände. Umsatzsteuer wird nicht gesondert ausgewiesen.",
    };
  }
  if (rate === 0) {
    return {
      code: "E",
      rate: 0,
      exemptionReason: "Steuerfreier Umsatz.",
    };
  }
  return { code: "S", rate };
}

/* ---- Positionen ---------------------------------------------------------- */

/**
 * Eine Position in den Begriffen der Norm.
 *
 * Die Norm rechnet ausschließlich netto und von unten nach oben: Einzelpreis
 * mal Menge, minus Nachlass, ergibt den Positionsbetrag; die Summe der
 * Positionsbeträge ergibt BT-106. Das Werkzeug lässt dagegen Bruttopreise
 * eingeben, weil im Laden nun einmal Ladenpreise gelten. Diese Umrechnung ist
 * die Nahtstelle – und sie muss auf den Cent aufgehen, sonst weist ein
 * Prüfprogramm die Rechnung zurück.
 */
export interface EInvoiceLine {
  /** BT-126 – Positionsnummer, fortlaufend ab 1. */
  id: number;
  /** BT-153 – Bezeichnung. */
  name: string;
  /** BT-154 – Beschreibung (Zusatzzeile). */
  note: string;
  /** BT-129 – Menge. */
  qty: number;
  /** BT-130 – Einheit nach Rec 20. */
  unitCode: string;
  /** BT-146 – Einzelpreis netto **vor** Nachlass, in Cent (kann Bruchteile haben). */
  unitNetCents: number;
  /** BG-27 – Nachlass auf die Position, in Cent. 0 = keiner. */
  allowanceCents: number;
  /** BT-137 – Grundlage des Nachlasses (Positionswert vor Rabatt), netto. */
  allowanceBasisCents: number;
  /** BT-138 – Nachlass in Prozent, für die Begründung. */
  allowancePct: number;
  /** BT-131 – Positionsbetrag netto nach Nachlass, in Cent. */
  netCents: number;
  category: TaxCategory;
}

/**
 * Zerlegt eine Position so, dass Netto, Nachlass und Steuer exakt aufgehen.
 *
 * Reihenfolge wie in der Norm: erst den Bruttowert vor Nachlass ins Netto
 * umrechnen, dann den Nachlass ebenfalls netto bestimmen. Würde man den
 * Nachlass brutto abziehen und erst danach umrechnen, entstünde je nach
 * Rundung eine Differenz von einem Cent zwischen `BT-131` und dem, was auf
 * dem Blatt steht.
 */
export function eInvoiceLine(
  line: InvoiceLine,
  index: number,
  invoice: Invoice,
  netCents: number,
): EInvoiceLine {
  const category = taxCategory(invoice, line.taxRate);

  /*
    Der Nettobetrag kommt fertig aus `invoiceTotals` – dort ist er bereits
    gruppenweise gerundet und auf die Positionen verteilt. Hier darf er
    deshalb **nicht** neu berechnet werden: Jede eigene Rundung an dieser
    Stelle brächte XML und Blatt wieder auseinander.

    Rückwärts gerechnet wird nur der Wert *vor* Rabatt, weil die Norm den
    Nachlass getrennt ausweist (BG-27). Der Nachlass selbst ist die Differenz
    zum tatsächlichen Positionsbetrag – damit gilt
    `Grundlage − Nachlass === netCents` per Konstruktion und nicht nur meistens.
  */
  const pct = line.discountPct;
  const basisCents =
    pct > 0 && pct < 100 ? round(netCents / (1 - pct / 100)) : netCents;
  const allowanceCents = basisCents - netCents;

  return {
    id: index + 1,
    name: line.title.trim() || "Leistung",
    note: line.note.trim(),
    qty: line.qty,
    unitCode: unitCode(line.unit),
    // Einzelpreis mit vier Nachkommastellen; die Norm erlaubt das ausdrücklich.
    // Bei Menge 2 und 33,45 € netto wären zwei Stellen (16,72) mal zwei nur
    // 33,44 – ein Cent Differenz, den ein Prüfprogramm zu Recht anmerkt.
    unitNetCents: line.qty > 0 ? basisCents / line.qty : 0,
    allowanceCents,
    allowanceBasisCents: basisCents,
    allowancePct: pct,
    netCents,
    category,
  };
}

/* ---- Steueraufteilung ---------------------------------------------------- */

/** BG-23 – eine Zeile der Steueraufteilung. */
export interface EInvoiceTaxBreakdown {
  category: TaxCategory;
  /** BT-116 – Bemessungsgrundlage. */
  basisCents: number;
  /** BT-117 – Steuerbetrag. */
  taxCents: number;
}

/* ---- Gesamtbild ---------------------------------------------------------- */

export interface EInvoiceModel {
  target: EInvoiceTarget;
  guideline: string;
  /** BT-1 */
  number: string;
  /** BT-2, ISO `YYYY-MM-DD` */
  issueDate: string;
  /** BT-72 – Leistungsdatum */
  deliveryDate: string;
  /** BT-9 – Fälligkeit */
  dueDate: string;
  lines: EInvoiceLine[];
  breakdown: EInvoiceTaxBreakdown[];
  /** BT-106 */
  lineTotalCents: number;
  /** BT-109 */
  taxBasisCents: number;
  /** BT-110 */
  taxTotalCents: number;
  /** BT-112 */
  grossCents: number;
  /** BT-113 – bereits gezahlt */
  paidCents: number;
  /** BT-115 – noch zu zahlen */
  dueCents: number;
  paymentMeans: string;
  /** BT-20 – Zahlungsbedingungen im Klartext */
  paymentTerms: string;
  /** BT-22 – Hinweise (Einleitung, Schlusstext, Gerätebezug) */
  notes: string[];
}

export function eInvoiceModel(
  invoice: Invoice,
  profile: CompanyProfile,
  target: EInvoiceTarget,
  totals?: InvoiceTotals,
): EInvoiceModel {
  const t = totals ?? invoiceTotals(invoice);

  const lines = invoice.lines.map((line, i) =>
    eInvoiceLine(line, i, invoice, t.lines[i].netCents),
  );

  // Aufteilung nach Kategorie **und** Satz: 19 % und 7 % sind zwei Zeilen,
  // steuerfrei ist eine dritte. BR-S-08 verlangt je Kombination genau eine.
  const map = new Map<string, EInvoiceTaxBreakdown>();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const key = `${l.category.code}-${l.category.rate}`;
    const entry = map.get(key) ?? {
      category: l.category,
      basisCents: 0,
      taxCents: 0,
    };
    entry.basisCents += l.netCents;
    entry.taxCents += t.lines[i].taxCents;
    map.set(key, entry);
  }
  const breakdown = [...map.values()].sort((a, b) => b.category.rate - a.category.rate);

  const paidCents = invoice.paid ? t.grossCents : 0;

  const notes: string[] = [];
  if (invoice.intro.trim()) notes.push(invoice.intro.trim());
  const device = [
    invoice.device.model && `Gerät: ${invoice.device.model}`,
    invoice.device.imei && `IMEI/Seriennummer: ${invoice.device.imei}`,
    invoice.device.condition && `Befund bei Annahme: ${invoice.device.condition}`,
  ].filter(Boolean);
  if (device.length > 0) notes.push(device.join(" · "));
  if (invoice.closing.trim()) notes.push(invoice.closing.trim());
  notes.push(
    `Auf jede Reparatur und jedes verbaute Teil gewähren wir ${profile.warrantyMonths} Monate Garantie.`,
  );

  return {
    target,
    guideline: GUIDELINE[target],
    number: invoice.number,
    issueDate: invoice.date,
    deliveryDate: invoice.serviceDate || invoice.date,
    dueDate: t.dueDate,
    lines,
    breakdown,
    lineTotalCents: t.netCents,
    taxBasisCents: t.netCents,
    taxTotalCents: t.taxCents,
    grossCents: t.grossCents,
    paidCents,
    dueCents: t.grossCents - paidCents,
    paymentMeans: paymentMeansCode(invoice),
    paymentTerms: invoice.paid
      ? "Der Betrag ist beglichen. Diese Rechnung dient als Beleg."
      : invoice.dueDays === 0
        ? "Zahlbar sofort ohne Abzug."
        : `Zahlbar bis ${t.dueDate} ohne Abzug.`,
    notes,
  };
}

/* ---- Prüfung ------------------------------------------------------------- */

/**
 * Die Regeln der Norm, die dieses Werkzeug verletzen kann.
 *
 * Nicht die vollständigen ~150 Geschäftsregeln – nur die, an denen eine
 * Werkstattrechnung realistisch scheitert. Sie sind bewusst als `hinweis`
 * eingestuft, solange keine E-Rechnung angefordert wurde: Wer bar an einen
 * Privatkunden verkauft, braucht keine EN 16931 und soll sich von ihr auch
 * nicht den Abschluss sperren lassen.
 */
export function validateEInvoice(
  invoice: Invoice,
  profile: CompanyProfile,
  totals: InvoiceTotals,
  target: EInvoiceTarget = "zugferd",
): Issue[] {
  const issues: Issue[] = [];
  const add = (id: string, text: string, anchor: Issue["anchor"]) =>
    issues.push({ id: `en-${id}`, level: "hinweis", text, anchor });

  // BR-06 / BR-08: Verkäufer mit vollständiger Anschrift.
  if (!profile.name.trim() || !profile.street.trim() || !profile.city.trim() || !profile.zip.trim()) {
    add("verkaeufer", "E-Rechnung: Anschrift des Ausstellers ist unvollständig.", "profil");
  }

  // BR-CO-26: Verkäufer braucht USt-IdNr. oder Steuernummer.
  if (!profile.vatId.trim() && !profile.taxNumber.trim()) {
    add("verkaeufer-steuer", "E-Rechnung: USt-IdNr. oder Steuernummer des Ausstellers fehlt.", "profil");
  }

  // BR-07: Name des Käufers. BR-10/BR-11: Anschrift und Land.
  // Der Kleinbetragsrechnung reicht der Verzicht darauf – der Norm nicht.
  if (!invoice.customer.name.trim()) {
    add("kaeufer", "E-Rechnung: Name des Empfängers fehlt.", "kunde");
  }
  if (!invoice.customer.city.trim() || !invoice.customer.zip.trim()) {
    add(
      "kaeufer-anschrift",
      "E-Rechnung: PLZ und Ort des Empfängers sind Pflicht – auch bei Kleinbeträgen, für die die Papierrechnung sie erlässt.",
      "kunde",
    );
  }

  // BR-16: mindestens eine Position.
  if (invoice.lines.length === 0) {
    add("positionen", "E-Rechnung: Die Rechnung enthält keine Position.", "positionen");
  }

  // BR-E-10 / BR-E-09: steuerbefreite Positionen brauchen einen Grund.
  // Den liefert `taxCategory()` immer mit – geprüft wird der Sonderfall, dass
  // jemand bei Regelbesteuerung 0 % wählt, ohne den Grund zu nennen.
  if (
    invoice.taxMode === "regel" &&
    invoice.lines.some((l) => l.taxRate === 0) &&
    !invoice.closing.trim()
  ) {
    add(
      "befreiungsgrund",
      "E-Rechnung: Position mit 0 % USt – der Grund der Steuerbefreiung gehört in den Schlusstext.",
      "zahlung",
    );
  }

  // BR-CO-25: Ist noch etwas zu zahlen, braucht es Fälligkeit oder Bedingung.
  if (!invoice.paid && !totals.dueDate) {
    add("faelligkeit", "E-Rechnung: Fälligkeitsdatum fehlt.", "kopf");
  }

  // BR-61: Bei Überweisung ist die Kontokennung Pflicht.
  if (!invoice.paid && invoice.paymentMethod === "ueberweisung" && !isValidIban(profile.iban)) {
    add("iban", "E-Rechnung: Für die Zahlungsart Überweisung ist eine gültige IBAN Pflicht.", "profil");
  }

  /*
    Nur die XRechnung: Was die Verwaltung zusätzlich verlangt.

    BR-DE-15 (Leitweg-ID) und PEPPOL-EN16931-R010 (elektronische Adresse) sind
    keine Formalien – ohne sie findet die Rechnung im Haus des Empfängers
    niemanden. ZUGFeRD an ein Unternehmen kommt ohne beides aus.
  */
  if (target === "xrechnung") {
    if (!invoice.customer.reference?.trim()) {
      add(
        "leitweg",
        "XRechnung: Die Leitweg-ID des Empfängers fehlt (BT-10). Öffentliche Auftraggeber geben sie mit dem Auftrag heraus.",
        "kunde",
      );
    }
    if (!invoice.customer.email?.trim()) {
      add(
        "kaeufer-adresse",
        "XRechnung: Die elektronische Adresse des Empfängers fehlt (BT-49) – in der Regel die Rechnungs-E-Mail.",
        "kunde",
      );
    }
  }

  return issues;
}

/** Lässt sich aus dieser Rechnung überhaupt eine E-Rechnung erzeugen? */
export function canExportEInvoice(
  invoice: Invoice,
  profile: CompanyProfile,
  totals: InvoiceTotals,
  target: EInvoiceTarget = "zugferd",
): boolean {
  return validateEInvoice(invoice, profile, totals, target).length === 0;
}

/** Dateiname nach Konvention: ZUGFeRD verlangt exakt `factur-x.xml` im PDF. */
export const ATTACHMENT_NAME = "factur-x.xml";

export function xmlFileName(invoice: Invoice, target: EInvoiceTarget): string {
  const safe = invoice.number.replace(/[^\w.-]+/g, "-") || "rechnung";
  return target === "xrechnung" ? `xrechnung-${safe}.xml` : `zugferd-${safe}.xml`;
}

/** Fälligkeit als ISO-Datum, auch wenn das Zahlungsziel 0 Tage ist. */
export function dueDateOf(invoice: Invoice): string {
  return addDays(invoice.date, invoice.dueDays);
}
