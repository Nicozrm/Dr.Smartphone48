/**
 * Das Reparaturzertifikat – Datenformat.
 *
 * Worum es geht: Jeder Betrieb in dieser Branche schreibt „geprüfte
 * Qualität“ auf seine Rechnung. Niemand kann das nachprüfen. Ein Papier,
 * das der Aussteller jederzeit umschreiben kann, belegt nichts – es
 * behauptet nur etwas mit Briefkopf.
 *
 * Ein Zertifikat ist deshalb ein **signierter Datensatz**: das vollständige
 * Prüfprotokoll, die Gerätebindung und das Datum, unterschrieben mit dem
 * privaten Schlüssel des Betriebs. Wer eine Position nachträglich ändert,
 * zerstört die Unterschrift. Prüfen kann das jeder, auf jedem Gerät, in
 * fünf Jahren noch – ohne uns anzurufen und ohne uns zu glauben.
 *
 * ## Was das Zertifikat beweist – und was nicht
 *
 * Es beweist zwei Dinge, präzise und nicht mehr:
 *
 * 1. Der Datensatz wurde mit einem Schlüssel unterschrieben, dessen
 *    öffentliche Hälfte auf dieser Website steht.
 * 2. Seit der Unterschrift wurde kein Bit daran geändert – auch von uns
 *    nicht.
 *
 * Es beweist **nicht**, dass wir gut gearbeitet haben. Diese Zusicherung
 * kann keine Mathematik geben; sie steht auf der Prüfseite ausdrücklich so
 * da. Was die Unterschrift leistet, ist etwas anderes und in dieser Branche
 * neu: Sie nimmt uns die Möglichkeit, unsere eigene Aussage später
 * stillschweigend zu korrigieren.
 *
 * ## Warum ein Binärformat
 *
 * Das Zertifikat muss in einen QR-Code auf einem Kassenbon passen. JSON mit
 * Feldnamen käme auf über 700 Zeichen und damit in QR-Versionen, die auf
 * Thermopapier niemand mehr scannt. Das Format hier braucht rund 125 Byte;
 * base64url-kodiert sind das ~170 Zeichen, mit Adresse davor gut 210 – ein
 * QR-Code der Version 9, etwa 2,5 cm Kantenlänge.
 *
 * ```
 *   0      Formatversion (dieses Byte ändert sich nie ohne Not)
 *   1      Schlüssel-Kennung – welcher Schlüssel hat unterschrieben
 *   2–3    Ausstellungstag, uint16 BE, Tage seit dem 1.1.2020
 *   4      Reparaturarten als Bitmaske (CERT_REPAIRS)
 *   5–14   40 Prüfergebnisse à 2 Bit
 *   15–18  Gerätebindung: die ersten vier Byte von SHA-256 über die IMEI
 *   19     Garantiemonate laut Zusage am Ausstellungstag
 *   20…    drei längenpräfigierte UTF-8-Zeichenketten:
 *          Modellbezeichnung, Teilecharge, Kürzel der ausführenden Person
 *   …      64 Byte Signatur (ECDSA P-256, r‖s)
 * ```
 *
 * ## Warum die Modellbezeichnung als Text und nicht als Index
 *
 * Ein Index in `lib/data/devices.ts` wäre zwei Byte kürzer und eine
 * Zeitbombe: Wird ein Modell aus dem Katalog genommen, zeigen alle alten
 * Zertifikate plötzlich auf ein anderes Gerät. Ein Beleg, dessen Bedeutung
 * sich mit dem nächsten Deploy ändert, ist kein Beleg. Der Datensatz
 * beschreibt sich deshalb vollständig selbst.
 *
 * ## Warum die Gerätebindung genau vier Byte hat
 *
 * Die IMEI steht **nicht** im Zertifikat – sie ist personenbezogen und ein
 * QR-Code auf einem Bon wird abfotografiert. Stattdessen steht dort ein
 * Ausschnitt ihres Hashwerts, und die Prüfseite fragt die IMEI beim Kunden
 * ab. Die Länge ist eine Abwägung in beide Richtungen:
 *
 * - **Nach unten** begrenzt sie die Verwechslung: Ein fremdes Zertifikat
 *   passt zufällig mit einer Wahrscheinlichkeit von 1 : 4,3 Milliarden.
 * - **Nach oben** begrenzt sie die Rückrechnung. Es gibt rund 10¹⁴ mögliche
 *   IMEIs; auf vier Byte fallen davon etwa 23 000 auf denselben Wert. Wer
 *   den Bon findet, hat also 23 000 Kandidaten – keine IMEI. Mit fünf Byte
 *   wären es 90, mit sechs genau eine.
 *
 * Mehr Bytes wären an dieser Stelle also **schlechter**, nicht besser.
 */

/** Formatversion. Ein Zertifikat mit anderer Nummer lehnt der Leser ab. */
export const CERT_FORMAT = 1;

/** Tag 0 der Zeitrechnung dieses Formats. uint16 reicht damit bis 2199. */
export const CERT_EPOCH = Date.UTC(2020, 0, 1);

const DAY_MS = 86_400_000;

/** Länge des festen Kopfes in Byte. */
export const HEADER_BYTES = 20;
/** ECDSA P-256, rohe Form: 32 Byte r, 32 Byte s. */
export const SIGNATURE_BYTES = 64;
/** Ausschnitt des IMEI-Hashwerts. Die Länge ist begründet – siehe oben. */
export const BINDING_BYTES = 4;

/**
 * Die Reparaturarten in **eingefrorener** Reihenfolge. Sie bestimmt, welches
 * Bit in Byte 4 welche Art meint, und darf sich niemals ändern – sonst wird
 * aus einem alten Akkutausch ein Wasserschaden. Neue Arten kommen hinten an.
 *
 * Bewusst eine eigene Liste statt `Object.keys(repairMeta)`: Dort entscheidet
 * die Reihenfolge im Quelltext, und die verschiebt beim Aufräumen irgendwann
 * jemand. `npm run verify:cert` prüft, dass beide Listen dieselben Arten
 * enthalten.
 */
export const CERT_REPAIRS = [
  "display",
  "battery",
  "backglass",
  "camera",
  "chargeport",
  "speaker",
  "water",
  "diagnose",
] as const;

export type CertRepair = (typeof CERT_REPAIRS)[number];

/**
 * Ergebnis einer Prüfposition. Zwei Bit, vier Zustände.
 *
 * `0` ist bewusst „nicht geprüft“ und nicht „bestanden“: Ein Protokoll, in
 * dem der Standardwert das gute Ergebnis ist, füllt sich von selbst mit
 * Zusagen, die niemand gemacht hat.
 */
export const CHECK_OPEN = 0;
export const CHECK_PASSED = 1;
export const CHECK_NOTED = 2;
export const CHECK_NA = 3;

export type CheckResult = 0 | 1 | 2 | 3;

export const CHECK_LABEL: Record<CheckResult, string> = {
  [CHECK_OPEN]: "nicht geprüft",
  [CHECK_PASSED]: "bestanden",
  [CHECK_NOTED]: "Befund vermerkt",
  [CHECK_NA]: "nicht zutreffend",
};

/** Der lesbare Inhalt eines Zertifikats. */
export interface Certificate {
  /** Kennung des Schlüssels, mit dem unterschrieben wurde. */
  keyId: number;
  /** Ausstellungstag, auf den Tag genau (UTC-Mitternacht). */
  issued: Date;
  /** Ausgeführte Reparaturen. */
  repairs: CertRepair[];
  /** 40 Ergebnisse in der Reihenfolge von `inspectionGroups`. */
  checks: CheckResult[];
  /** Vier Byte Hashwert der IMEI – siehe Kopfkommentar. */
  binding: Uint8Array;
  /** Zugesagte Garantie in Monaten am Tag der Ausstellung. */
  warrantyMonths: number;
  /** Modellbezeichnung im Klartext, z. B. „iPhone 14 Pro“. */
  model: string;
  /** Chargen- oder Lieferscheinnummer des verbauten Teils. */
  batch: string;
  /** Kürzel der ausführenden Person. */
  technician: string;
}

/** Ein gelesenes Zertifikat samt der Bytes, über die unterschrieben wurde. */
export interface ParsedCertificate {
  certificate: Certificate;
  /** Genau die Bytes, die in die Signatur eingegangen sind. */
  signed: Uint8Array;
  /** Die Signatur selbst, 64 Byte. */
  signature: Uint8Array;
}

/* ---- base64url --------------------------------------------------------- */

/*
  Ohne `=`-Auffüllung und ohne `+` und `/`: Der Code landet in einem
  URL-Fragment und in einem QR-Code. `+` würde beim Einfügen in eine Adresse
  zum Leerzeichen, `/` bräche den Pfad, `=` überlebt manche
  Weiterleitung nicht.
*/

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64URL[a >>> 2];
    out += B64URL[((a & 3) << 4) | ((b ?? 0) >>> 4)];
    if (b === undefined) break;
    out += B64URL[((b & 15) << 2) | ((c ?? 0) >>> 6)];
    if (c === undefined) break;
    out += B64URL[c & 63];
  }
  return out;
}

export function fromBase64Url(text: string): Uint8Array {
  const clean = text.trim();
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = B64URL.indexOf(char);
    if (value < 0) throw new Error(`Ungültiges Zeichen im Zertifikatscode: „${char}“`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >>> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/* ---- Bitfelder --------------------------------------------------------- */

function packRepairs(repairs: readonly CertRepair[]): number {
  let mask = 0;
  for (const repair of repairs) {
    const index = CERT_REPAIRS.indexOf(repair);
    if (index >= 0) mask |= 1 << index;
  }
  return mask;
}

function unpackRepairs(mask: number): CertRepair[] {
  return CERT_REPAIRS.filter((_, index) => (mask >>> index) & 1);
}

/** 40 Ergebnisse à 2 Bit in 10 Byte, das erste Ergebnis im höchsten Bitpaar. */
function packChecks(checks: readonly CheckResult[], count: number): Uint8Array {
  const out = new Uint8Array(Math.ceil((count * 2) / 8));
  for (let i = 0; i < count; i++) {
    const value = (checks[i] ?? CHECK_OPEN) & 3;
    const byte = i >>> 2;
    const shift = 6 - (i & 3) * 2;
    out[byte] |= value << shift;
  }
  return out;
}

function unpackChecks(bytes: Uint8Array, count: number): CheckResult[] {
  const out: CheckResult[] = [];
  for (let i = 0; i < count; i++) {
    const byte = bytes[i >>> 2] ?? 0;
    const shift = 6 - (i & 3) * 2;
    out.push(((byte >>> shift) & 3) as CheckResult);
  }
  return out;
}

/* ---- Zeichenketten ----------------------------------------------------- */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Länge in einem Byte, dann die Bytes. Zu lange Eingaben werden **auf
 * Zeichengrenze** gekürzt, nicht auf Bytegrenze: Ein halbes „ö“ macht aus
 * dem Rest der Zeichenkette Fragezeichen.
 */
function encodeString(value: string, limit = 40): Uint8Array {
  let text = value.trim();
  let bytes = encoder.encode(text);
  while (bytes.length > limit) {
    text = [...text].slice(0, -1).join("");
    bytes = encoder.encode(text);
  }
  const out = new Uint8Array(1 + bytes.length);
  out[0] = bytes.length;
  out.set(bytes, 1);
  return out;
}

/* ---- Kodieren und Lesen ------------------------------------------------ */

/**
 * Erzeugt die Bytes, über die unterschrieben wird. Die Signatur wird
 * anschließend angehängt – sie kann sich nicht selbst enthalten.
 */
export function encodeSignable(
  certificate: Omit<Certificate, "keyId"> & { keyId: number },
  checkpointCount: number,
): Uint8Array {
  const header = new Uint8Array(HEADER_BYTES);
  header[0] = CERT_FORMAT;
  header[1] = certificate.keyId & 0xff;

  const day = Math.floor((certificate.issued.getTime() - CERT_EPOCH) / DAY_MS);
  if (day < 0 || day > 0xffff) {
    throw new Error("Ausstellungsdatum liegt außerhalb des Formats (2020–2199).");
  }
  header[2] = (day >>> 8) & 0xff;
  header[3] = day & 0xff;
  header[4] = packRepairs(certificate.repairs);

  const checks = packChecks(certificate.checks, checkpointCount);
  if (checks.length !== 10) {
    throw new Error(
      `Das Format hält 10 Byte für Prüfergebnisse bereit, gebraucht werden ${checks.length}. ` +
        "Wer die Zahl der Positionen ändert, ändert die Formatversion mit.",
    );
  }
  header.set(checks, 5);

  const binding = certificate.binding.subarray(0, BINDING_BYTES);
  if (binding.length !== BINDING_BYTES) {
    throw new Error("Gerätebindung fehlt oder ist zu kurz.");
  }
  header.set(binding, 15);
  header[19] = certificate.warrantyMonths & 0xff;

  // Die drei Längen sind nicht großzügig gewählt, sondern gerechnet: Sie
  // begrenzen den schlimmsten Fall auf einen QR-Code der Version 11. Darüber
  // wird der Code auf Thermopapier in der üblichen Größe unzuverlässig.
  // `npm run verify:cert` rechnet das nach.
  const model = encodeString(certificate.model, 32);
  const batch = encodeString(certificate.batch, 24);
  const technician = encodeString(certificate.technician, 12);

  const out = new Uint8Array(
    header.length + model.length + batch.length + technician.length,
  );
  let at = 0;
  for (const part of [header, model, batch, technician]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Hängt die Signatur an und kodiert das Ganze als Zertifikatscode. */
export function encodeCertificate(signable: Uint8Array, signature: Uint8Array): string {
  if (signature.length !== SIGNATURE_BYTES) {
    throw new Error(`Signatur muss ${SIGNATURE_BYTES} Byte haben.`);
  }
  const out = new Uint8Array(signable.length + signature.length);
  out.set(signable, 0);
  out.set(signature, signable.length);
  return toBase64Url(out);
}

/**
 * Liest einen Zertifikatscode. Wirft mit einem Satz, den man einem Kunden
 * zeigen kann – „unexpected token“ hilft an dieser Stelle niemandem.
 */
export function decodeCertificate(code: string, checkpointCount: number): ParsedCertificate {
  const bytes = fromBase64Url(code);
  if (bytes.length < HEADER_BYTES + 3 + SIGNATURE_BYTES) {
    throw new Error("Der Code ist zu kurz für ein Zertifikat.");
  }
  if (bytes[0] !== CERT_FORMAT) {
    throw new Error(
      `Unbekannte Formatversion ${bytes[0]}. Diese Seite liest Version ${CERT_FORMAT}.`,
    );
  }

  const signed = bytes.subarray(0, bytes.length - SIGNATURE_BYTES);
  const signature = bytes.subarray(bytes.length - SIGNATURE_BYTES);

  const day = (bytes[2] << 8) | bytes[3];
  let at = HEADER_BYTES;
  const readString = (): string => {
    const length = signed[at];
    if (length === undefined || at + 1 + length > signed.length) {
      throw new Error("Der Code bricht mitten in einem Textfeld ab.");
    }
    const text = decoder.decode(signed.subarray(at + 1, at + 1 + length));
    at += 1 + length;
    return text;
  };

  const model = readString();
  const batch = readString();
  const technician = readString();
  if (at !== signed.length) {
    throw new Error("Am Ende des Codes stehen Bytes, die nicht zum Format gehören.");
  }

  return {
    certificate: {
      keyId: bytes[1],
      issued: new Date(CERT_EPOCH + day * DAY_MS),
      repairs: unpackRepairs(bytes[4]),
      checks: unpackChecks(bytes.subarray(5, 15), checkpointCount),
      binding: bytes.slice(15, 15 + BINDING_BYTES),
      warrantyMonths: bytes[19],
      model,
      batch,
      technician,
    },
    signed,
    signature,
  };
}
