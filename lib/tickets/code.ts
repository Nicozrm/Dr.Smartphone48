/*
  Der Vorgangscode – die Adresse, unter der ein Kunde seinen Vorgang findet.

  Er ist bewusst etwas anderes als die Vorgangsnummer aus `lib/ticket.ts`:
  Die dortige Nummer entsteht deterministisch aus der Auswahl, damit derselbe
  Voranschlag immer dieselbe Nummer trägt. Genau das macht sie als Schlüssel
  untauglich – zwei Kunden mit einem iPhone 15 Pro und einem Displayschaden
  bekämen denselben Wert.

  Der Vorgangscode wird deshalb bei der Anmeldung gezogen, ist eindeutig und
  nicht erratbar. Er ist damit zugleich der Schlüssel zur Statusseite: Wer ihn
  hat, sieht den Vorgang. Deshalb steht auf der Statusseite nichts, was in
  fremden Händen schaden könnte – keine Anschrift, keine vollständige IMEI,
  keine internen Vermerke.

  32^8 ≈ 1,1 Billionen Kombinationen. Bei einer Werkstatt mit ein paar tausend
  Vorgängen im Jahr ist Raten aussichtslos, und die Ratenbremse in der API
  macht systematisches Durchprobieren zusätzlich unbezahlbar.
*/

/** Ohne I, O, 0 und 1 – am Telefon und auf Papier nicht verwechselbar. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const GROUP = 4;
const LENGTH = GROUP * 2;

/** Anzeige- und Speicherform: `K7M2-B94X`. */
export const TICKET_CODE_PATTERN = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/**
 * Zieht einen neuen Code.
 *
 * `crypto.getRandomValues` statt `Math.random`: Der Code ist der einzige
 * Schutz des Vorgangs. Ein vorhersagbarer Zufallsgenerator wäre hier kein
 * Schönheitsfehler, sondern das Schloss aus Pappe.
 *
 * Das Modulo verzerrt nichts: 256 ist genau das Achtfache der 32 Zeichen,
 * die Rechnung geht ohne Rest auf. Bei einem Alphabet anderer Länge müsste
 * hier verworfen und neu gezogen werden.
 */
export function generateTicketCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `${out.slice(0, GROUP)}-${out.slice(GROUP)}`;
}

/**
 * Bringt eine Eingabe auf die kanonische Form oder gibt `null` zurück.
 *
 * Verziehen wird nur, was nichts bedeutet: Groß-/Kleinschreibung, Leerzeichen,
 * Binde- und Unterstriche. Unbekannte Zeichen werden **nicht** stillschweigend
 * entfernt – „ABCD-EFGH!" ist kein Code, und ein Werkzeug, das daraus einen
 * gültigen macht, verschleiert nur den Tippfehler.
 */
export function normalizeTicketCode(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[\s_-]+/g, "");
  if (compact.length !== LENGTH) return null;
  for (const char of compact) {
    if (!ALPHABET.includes(char)) return null;
  }
  return `${compact.slice(0, GROUP)}-${compact.slice(GROUP)}`;
}

/** Typwächter für alles, was aus der Adresse oder einem Formular kommt. */
export function isTicketCode(value: unknown): value is string {
  return typeof value === "string" && TICKET_CODE_PATTERN.test(value);
}
