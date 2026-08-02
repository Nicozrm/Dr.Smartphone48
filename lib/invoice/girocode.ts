/**
 * GiroCode nach EPC069-12 – der QR-Code, den jede deutsche Banking-App liest.
 *
 * Der Kunde scannt, die Überweisung steht fertig ausgefüllt im Formular:
 * Empfänger, IBAN, Betrag, Verwendungszweck. Kein Abtippen, keine
 * Zahlendreher, kein „ich hab die Rechnungsnummer vergessen“. Genau das ist
 * die häufigste Ursache für Zahlungen, die sich nicht zuordnen lassen.
 */

/** Prüft die IBAN nach ISO 13616 (Modulo-97-Verfahren). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  // Stückweise rechnen – die Zahl wäre sonst größer als Number.MAX_SAFE_INTEGER.
  let remainder = 0;
  for (const d of digits) {
    remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

/** IBAN in Vierergruppen – wie auf jedem Kontoauszug. */
export function formatIban(input: string): string {
  return (
    input
      .replace(/\s+/g, "")
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join(" ") ?? ""
  );
}

export interface GiroCodeInput {
  /** Kontoinhaber, höchstens 70 Zeichen. */
  name: string;
  iban: string;
  bic?: string;
  /** Betrag in Cent. 0 lässt das Betragsfeld leer. */
  amountCents: number;
  /** Verwendungszweck, höchstens 140 Zeichen. */
  reference: string;
}

/**
 * Baut die Nutzlast. Leere Felder am Ende dürfen entfallen, die Reihenfolge
 * ist bindend – ein zusätzlicher Zeilenumbruch macht den Code unlesbar.
 */
export function giroCodePayload({
  name,
  iban,
  bic = "",
  amountCents,
  reference,
}: GiroCodeInput): string {
  const cleanIban = iban.replace(/\s+/g, "").toUpperCase();
  const amount =
    amountCents > 0 && amountCents <= 99_999_999_999
      ? `EUR${(amountCents / 100).toFixed(2)}`
      : "";

  const fields = [
    "BCD", // Service Tag
    "002", // Version
    "1", // Zeichensatz: UTF-8
    "SCT", // SEPA Credit Transfer
    bic.replace(/\s+/g, "").toUpperCase(),
    name.slice(0, 70),
    cleanIban,
    amount,
    "", // Zweckcode
    "", // Strukturierte Referenz – schließt Feld 11 aus
    reference.slice(0, 140), // Unstrukturierter Verwendungszweck
  ];

  // Leere Felder am Ende abschneiden, den Rest unverändert lassen.
  while (fields.length > 0 && fields[fields.length - 1] === "") fields.pop();

  return fields.join("\n");
}

/** Sagt, ob ein GiroCode überhaupt erzeugt werden kann. */
export function canRenderGiroCode(iban: string, name: string): boolean {
  return isValidIban(iban) && name.trim().length > 0;
}
