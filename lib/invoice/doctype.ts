/**
 * Belegarten.
 *
 * Eine Werkstatt schreibt nicht nur Rechnungen. Der Kostenvoranschlag ist im
 * Reparaturgeschäft sogar der häufigere Beleg – er geht raus, bevor irgendwer
 * einen Schraubendreher anfasst, und oft weiter an eine Versicherung. Er
 * braucht dieselbe Rechenlogik, dieselben Positionen und dasselbe Blatt, aber
 * eine andere Sprache: keine Zahlungsaufforderung, dafür eine Bindefrist.
 *
 * Deshalb ist die Belegart ein Feld und keine zweite Anwendung.
 */

export type DocType =
  | "rechnung"
  | "kostenvoranschlag"
  | "angebot"
  | "gutschrift"
  | "storno";

export interface DocTypeMeta {
  id: DocType;
  /** Überschrift auf dem Blatt. */
  label: string;
  /** Kurzform für die Werkzeugleiste. */
  short: string;
  /** Vorschlag für den Nummernkreis. */
  prefix: string;
  /** Fordert Geld – steuert Zahlungsziel, GiroCode und Abschnitt. */
  demandsPayment: boolean;
  /** Betragszeile am Fuß der Summenkaskade. */
  totalLabel: string;
  /** Steht unter der Summe, wenn kein Geld gefordert wird. */
  validityNote?: string;
}

export const docTypes: DocTypeMeta[] = [
  {
    id: "rechnung",
    label: "Rechnung",
    short: "Rechnung",
    prefix: "RE-",
    demandsPayment: true,
    totalLabel: "Rechnungsbetrag",
  },
  {
    id: "kostenvoranschlag",
    label: "Kostenvoranschlag",
    short: "Kostenvoranschlag",
    prefix: "KV-",
    demandsPayment: false,
    totalLabel: "Voraussichtliche Kosten",
    validityNote:
      "Unverbindliche Schätzung nach Sichtprüfung. Zeigt sich beim Öffnen ein weiterer Schaden, melden wir uns vor jeder Mehrarbeit. Bindefrist 30 Tage.",
  },
  {
    id: "angebot",
    label: "Angebot",
    short: "Angebot",
    prefix: "AN-",
    demandsPayment: false,
    totalLabel: "Angebotssumme",
    validityNote: "Freibleibendes Angebot, gültig 30 Tage ab Ausstellungsdatum.",
  },
  {
    id: "gutschrift",
    label: "Gutschrift",
    short: "Gutschrift",
    prefix: "GS-",
    demandsPayment: false,
    totalLabel: "Gutschriftbetrag",
    validityNote:
      "Der Betrag wird auf das uns bekannte Konto erstattet oder mit der nächsten Rechnung verrechnet.",
  },
  {
    id: "storno",
    label: "Stornorechnung",
    short: "Storno",
    prefix: "ST-",
    demandsPayment: false,
    totalLabel: "Stornobetrag",
    validityNote:
      "Diese Stornorechnung hebt die genannte Ursprungsrechnung vollständig auf. Bereits gezahlte Beträge werden erstattet.",
  },
];

export function docTypeMeta(id: DocType): DocTypeMeta {
  return docTypes.find((d) => d.id === id) ?? docTypes[0];
}
