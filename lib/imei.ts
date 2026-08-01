/*
  IMEI – prüfen, erklären, nachrechnen.

  Die IMEI ist die einzige Nummer, die ein Smartphone eindeutig identifiziert.
  Sie steht auf jedem Auftrag, jeder Versicherungsmeldung und jeder
  Diebstahlanzeige – und trotzdem weiß kaum jemand, was sie bedeutet oder ob
  die abgetippte Nummer überhaupt stimmt.

  Die letzte Ziffer ist eine Prüfziffer nach dem Luhn-Verfahren. Damit lässt
  sich ein Tippfehler sofort erkennen, ohne Datenbank, ohne Netz, ohne dass
  die Nummer das Gerät verlässt. Genau das passiert hier – und die Rechnung
  wird offengelegt, statt nur „gültig" oder „ungültig" zu behaupten.

  Bewusst nicht enthalten: eine Zuordnung der Nummer zu Hersteller oder
  Modell. Dafür bräuchte es die kostenpflichtige GSMA-Datenbank; alles andere
  wäre geraten. Was wir nicht sicher wissen, behaupten wir nicht.
*/

export type ImeiVerdict = "gueltig" | "pruefziffer-falsch" | "unvollstaendig" | "zu-lang" | "leer";

export interface ImeiStep {
  /** Ziffer an dieser Stelle (1-basiert von links). */
  digit: number;
  /** Wird diese Stelle im Luhn-Verfahren verdoppelt? */
  doubled: boolean;
  /** Beitrag zur Quersumme nach der Verdopplung. */
  contribution: number;
}

export interface ImeiInfo {
  verdict: ImeiVerdict;
  /** Auf Ziffern reduzierte Eingabe. */
  digits: string;
  /** Gruppiert für die Anzeige: TAC · Seriennummer · Prüfziffer. */
  formatted: string;
  /** Type Allocation Code – die ersten acht Ziffern (Gerätetyp). */
  tac: string | null;
  /** Seriennummer innerhalb des Gerätetyps – Stelle 9 bis 14. */
  serial: string | null;
  /** Angegebene Prüfziffer (Stelle 15). */
  checkDigit: number | null;
  /** Prüfziffer, die sich aus den ersten 14 Stellen ergibt. */
  expectedCheckDigit: number | null;
  /** Die Software-Version bei einer 16-stelligen IMEISV. */
  softwareVersion: string | null;
  /** Die einzelnen Schritte der Luhn-Rechnung, für die Anzeige. */
  steps: ImeiStep[];
  /** Quersumme über alle 14 Stellen vor der Prüfziffer. */
  sum: number;
  /** Klartext für die Anzeige. */
  message: string;
}

/**
 * Luhn-Prüfziffer für die ersten 14 Stellen.
 * Von rechts nach links wird jede zweite Ziffer verdoppelt; ist das Ergebnis
 * zweistellig, wird seine Quersumme genommen. Die Prüfziffer füllt die Summe
 * auf das nächste Vielfache von zehn auf.
 */
export function luhnCheckDigit(first14: string): { digit: number; sum: number; steps: ImeiStep[] } {
  const steps: ImeiStep[] = [];
  let sum = 0;
  for (let i = 0; i < first14.length; i++) {
    const digit = Number(first14[i]);
    // Position von rechts gezählt (0-basiert); jede ungerade wird verdoppelt.
    const fromRight = first14.length - 1 - i;
    const doubled = fromRight % 2 === 0;
    let contribution = digit;
    if (doubled) {
      contribution = digit * 2;
      if (contribution > 9) contribution -= 9;
    }
    sum += contribution;
    steps.push({ digit, doubled, contribution });
  }
  return { digit: (10 - (sum % 10)) % 10, sum, steps };
}

const empty: Omit<ImeiInfo, "verdict" | "message" | "digits" | "formatted"> = {
  tac: null,
  serial: null,
  checkDigit: null,
  expectedCheckDigit: null,
  softwareVersion: null,
  steps: [],
  sum: 0,
};

/** Gruppiert eine IMEI für die Anzeige: 8 · 6 · 1. */
export function formatImei(digits: string): string {
  const tac = digits.slice(0, 8);
  const serial = digits.slice(8, 14);
  const rest = digits.slice(14);
  return [tac, serial, rest].filter(Boolean).join(" ");
}

/**
 * Prüft eine IMEI vollständig lokal. Die Eingabe darf Leerzeichen, Punkte
 * und Bindestriche enthalten – alles Nicht-Ziffern wird verworfen.
 */
export function inspectImei(input: string): ImeiInfo {
  const digits = input.replace(/\D/g, "");
  const formatted = formatImei(digits);

  if (digits.length === 0) {
    return {
      ...empty,
      verdict: "leer",
      digits,
      formatted,
      message: "Geben Sie die 15-stellige IMEI ein – auf dem Gerät abrufbar mit *#06#.",
    };
  }

  if (digits.length > 16) {
    return {
      ...empty,
      verdict: "zu-lang",
      digits,
      formatted,
      message: `${digits.length} Ziffern sind zu viele. Eine IMEI hat 15 Stellen, eine IMEISV 16.`,
    };
  }

  if (digits.length < 15) {
    return {
      ...empty,
      verdict: "unvollstaendig",
      digits,
      formatted,
      message: `Noch ${15 - digits.length} ${
        15 - digits.length === 1 ? "Ziffer" : "Ziffern"
      } bis zur vollständigen IMEI.`,
    };
  }

  // Bei 16 Stellen liegt eine IMEISV vor: Stelle 15 und 16 sind die
  // Software-Version, eine Prüfziffer gibt es dort nicht.
  const isSv = digits.length === 16;
  const first14 = digits.slice(0, 14);
  const { digit: expected, sum, steps } = luhnCheckDigit(first14);
  const tac = digits.slice(0, 8);
  const serial = digits.slice(8, 14);

  if (isSv) {
    return {
      verdict: "gueltig",
      digits,
      formatted: `${tac} ${serial} ${digits.slice(14)}`,
      tac,
      serial,
      checkDigit: null,
      expectedCheckDigit: expected,
      softwareVersion: digits.slice(14),
      steps,
      sum,
      message: `IMEISV erkannt – 16 Stellen mit Software-Version ${digits.slice(14)}. Für den Auftrag genügen die ersten 14 Stellen plus Prüfziffer ${expected}.`,
    };
  }

  const given = Number(digits[14]);
  if (given !== expected) {
    return {
      verdict: "pruefziffer-falsch",
      digits,
      formatted,
      tac,
      serial,
      checkDigit: given,
      expectedCheckDigit: expected,
      softwareVersion: null,
      steps,
      sum,
      message: `Die Prüfziffer passt nicht: erwartet ${expected}, angegeben ${given}. Meist steckt ein Zahlendreher in den ersten 14 Stellen.`,
    };
  }

  return {
    verdict: "gueltig",
    digits,
    formatted,
    tac,
    serial,
    checkDigit: given,
    expectedCheckDigit: expected,
    softwareVersion: null,
    steps,
    sum,
    message: "Prüfziffer stimmt. Die Nummer ist korrekt abgetippt.",
  };
}
