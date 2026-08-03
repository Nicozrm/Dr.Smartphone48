import { isValidIban } from "./girocode";
import type { CompanyProfile, Invoice } from "./types";

/**
 * Pflichtangaben-Prüfung nach § 14 Abs. 4 UStG.
 *
 * Der Sinn ist nicht Bürokratie, sondern Geld: Fehlt eine Pflichtangabe, kann
 * der Geschäftskunde die Vorsteuer nicht ziehen – er meldet sich, die Rechnung
 * wird storniert und neu geschrieben. Diese Liste verhindert genau das, bevor
 * gedruckt wird.
 *
 * Sonderfall Kleinbetragsrechnung (§ 33 UStDV): Bis 250 € brutto genügen
 * Aussteller, Datum, Leistungsbeschreibung, Bruttobetrag und Steuersatz. Der
 * Empfänger muss dann nicht genannt werden – im Ladengeschäft der Normalfall.
 *
 * Keine Rechtsberatung, sondern eine Checkliste. Im Zweifel entscheidet das
 * Steuerbüro.
 */

export const KLEINBETRAG_LIMIT_CENTS = 25_000;

export type IssueLevel = "pflicht" | "hinweis";

export interface Issue {
  id: string;
  level: IssueLevel;
  text: string;
  /** Abschnitt, zu dem der Editor springen soll. */
  anchor: "profil" | "kunde" | "positionen" | "zahlung" | "kopf";
}

export function validateInvoice(
  invoice: Invoice,
  profile: CompanyProfile,
  grossCents: number,
): Issue[] {
  const issues: Issue[] = [];
  const isSmall = grossCents <= KLEINBETRAG_LIMIT_CENTS;

  const add = (id: string, level: IssueLevel, text: string, anchor: Issue["anchor"]) =>
    issues.push({ id, level, text, anchor });

  /* Aussteller */
  if (!profile.name.trim() || !profile.street.trim() || !profile.city.trim()) {
    add("aussteller", "pflicht", "Vollständige Anschrift des Ausstellers fehlt.", "profil");
  }
  if (!profile.taxNumber.trim() && !profile.vatId.trim()) {
    add("steuernummer", "pflicht", "Steuernummer oder USt-IdNr. fehlt.", "profil");
  }

  /* Kopfdaten */
  if (!invoice.number.trim()) {
    add("nummer", "pflicht", "Fortlaufende Rechnungsnummer fehlt.", "kopf");
  }
  if (!invoice.date) {
    add("datum", "pflicht", "Ausstellungsdatum fehlt.", "kopf");
  }
  if (!invoice.serviceDate) {
    add(
      "leistungsdatum",
      isSmall ? "hinweis" : "pflicht",
      "Leistungs- bzw. Lieferdatum fehlt.",
      "kopf",
    );
  }

  /* Empfänger – bei Kleinbeträgen entbehrlich */
  if (!invoice.customer.name.trim()) {
    add(
      "empfaenger",
      isSmall ? "hinweis" : "pflicht",
      isSmall
        ? "Empfänger fehlt – bis 250 € zulässig, für den Vorsteuerabzug des Kunden aber besser genannt."
        : "Name des Leistungsempfängers fehlt.",
      "kunde",
    );
  } else if (!isSmall && (!invoice.customer.street.trim() || !invoice.customer.city.trim())) {
    add("empfaenger-adresse", "pflicht", "Anschrift des Leistungsempfängers ist unvollständig.", "kunde");
  }

  /* Positionen */
  if (invoice.lines.length === 0) {
    add("positionen", "pflicht", "Die Rechnung enthält keine Position.", "positionen");
  }
  if (invoice.lines.some((l) => !l.title.trim())) {
    add("bezeichnung", "pflicht", "Jede Position braucht eine handelsübliche Bezeichnung.", "positionen");
  }
  if (invoice.lines.some((l) => l.qty <= 0)) {
    add("menge", "hinweis", "Eine Position hat die Menge 0.", "positionen");
  }

  /* Steuer */
  if (invoice.taxMode === "regel" && invoice.lines.some((l) => l.taxRate === 0)) {
    add(
      "steuerbefreiung",
      "hinweis",
      "Position mit 0 % USt – der Grund der Steuerbefreiung gehört in den Schlusstext.",
      "zahlung",
    );
  }
  if (invoice.taxMode === "differenz" && invoice.lines.some((l) => l.discountPct > 0)) {
    add(
      "differenz-rabatt",
      "hinweis",
      "Rabatt bei Differenzbesteuerung – Bemessungsgrundlage vom Steuerbüro prüfen lassen.",
      "positionen",
    );
  }

  /* Zahlung */
  if (!invoice.paid && invoice.paymentMethod === "ueberweisung") {
    if (!profile.iban.trim()) {
      add("iban", "pflicht", "Ohne IBAN kann der Kunde nicht überweisen.", "profil");
    } else if (!isValidIban(profile.iban)) {
      add("iban-pruefziffer", "pflicht", "Die IBAN ist ungültig (Prüfziffer stimmt nicht).", "profil");
    }
  }

  return issues;
}

export function isReady(issues: Issue[]): boolean {
  return !issues.some((i) => i.level === "pflicht");
}

/**
 * IMEI-Prüfung (15 Ziffern, Luhn-Verfahren).
 *
 * Die IMEI ist die einzige Angabe auf der Rechnung, die niemand im Kopf hat
 * und die trotzdem jeder abtippt. Eine vertauschte Ziffer fällt erst auf,
 * wenn Monate später ein Garantiefall zugeordnet werden soll.
 */
export function checkImei(input: string): "leer" | "gueltig" | "laenge" | "pruefziffer" {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return "leer";
  if (digits.length !== 15) return "laenge";

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(digits[i]);
    // Jede zweite Ziffer von rechts wird verdoppelt; bei 15 Stellen sind das
    // die Positionen mit ungeradem Index von links.
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0 ? "gueltig" : "pruefziffer";
}
