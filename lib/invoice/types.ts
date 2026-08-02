import type { DocType } from "./doctype";

/**
 * Datenmodell der Rechnung.
 *
 * Alle Geldbeträge liegen als **ganzzahlige Cent** vor. Fließkomma-Euro ist die
 * häufigste Fehlerquelle in Abrechnungssoftware: 0.1 + 0.2 ergibt dort nicht
 * 0.3, und aus Rundungsdifferenzen von einem Cent werden bei der Steuerprüfung
 * unangenehme Gespräche. Umgerechnet wird ausschließlich an der Oberfläche.
 */

/** Steuerliche Behandlung der gesamten Rechnung. */
export type TaxMode =
  /** Regelbesteuerung – Umsatzsteuer wird ausgewiesen. */
  | "regel"
  /** Kleinunternehmer nach § 19 UStG – kein Steuerausweis. */
  | "klein"
  /** Differenzbesteuerung nach § 25a UStG – für Gebrauchtgeräte. */
  | "differenz";

export type PaymentMethod = "ueberweisung" | "bar" | "karte" | "paypal";

/** Zulässige Steuersätze. 0 % nur mit Grund (§ 19, § 25a). */
export type TaxRate = 0 | 7 | 19;

export interface InvoiceLine {
  id: string;
  /** Menge, auch gebrochen (1,5 Std.). */
  qty: number;
  /** Mengeneinheit: Stk., Std., Pausch. */
  unit: string;
  /** Bezeichnung der Leistung – Pflichtangabe nach § 14 Abs. 4 Nr. 5 UStG. */
  title: string;
  /** Zusatzzeile: Modell, IMEI, Seriennummer, Teilequalität. */
  note: string;
  /** Einzelpreis in Cent – je nach `grossEntry` brutto oder netto. */
  unitCents: number;
  taxRate: TaxRate;
  /** Rabatt in Prozent auf die Position. */
  discountPct: number;
}

export interface Party {
  name: string;
  /** Zusatz: z. Hd., Abteilung, c/o. */
  extra: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  /** USt-IdNr. des Empfängers – nötig bei innergemeinschaftlichen Leistungen. */
  vatId: string;
}

export interface Invoice {
  /** Belegart – steuert Sprache, Nummernkreis und Zahlungsabschnitt. */
  docType: DocType;
  /** Fortlaufende Rechnungsnummer – § 14 Abs. 4 Nr. 4 UStG. */
  number: string;
  /** Ausstellungsdatum, ISO `YYYY-MM-DD`. */
  date: string;
  /** Leistungs-/Lieferdatum – eigene Pflichtangabe, nicht identisch zum Datum. */
  serviceDate: string;
  /** Zahlungsziel in Tagen ab Ausstellung. 0 = sofort. */
  dueDays: number;
  customer: Party;
  lines: InvoiceLine[];
  taxMode: TaxMode;
  /** true = eingegebene Einzelpreise sind Bruttopreise (Ladenpreis). */
  grossEntry: boolean;
  /** Gerätebezug – der Teil, den nur eine Werkstattrechnung braucht. */
  device: {
    model: string;
    imei: string;
    /** Zustand/Befund bei Annahme. */
    condition: string;
  };
  /** Freitext über der Positionstabelle. */
  intro: string;
  /** Freitext unter der Summe (Garantie, Hinweise). */
  closing: string;
  paymentMethod: PaymentMethod;
  /** Bereits bezahlt – unterdrückt die Zahlungsaufforderung. */
  paid: boolean;
  /** Zweitausfertigung – setzt den Stempel „Kopie". */
  copy: boolean;
  /** Bezug bei Storno und Gutschrift: die Ursprungsrechnung. */
  reference: string;
}

/** Absender- und Bankdaten. Einmal hinterlegt, danach nie wieder angefasst. */
export interface CompanyProfile {
  name: string;
  owner: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  web: string;
  /** Steuernummer ODER USt-IdNr. – eines von beidem ist Pflicht. */
  taxNumber: string;
  vatId: string;
  bankName: string;
  iban: string;
  bic: string;
  /** Präfix des Nummernkreises, z. B. `RE-2026-`. */
  numberPrefix: string;
  /** Nächster laufender Zähler. */
  nextNumber: number;
  defaultTaxMode: TaxMode;
  defaultDueDays: number;
  warrantyMonths: number;
}
