/**
 * Unterschreiben und Prüfen.
 *
 * ## Warum ECDSA P-256 und nicht Ed25519
 *
 * Ed25519 wäre die modernere Wahl und in jedem Vortrag die richtige Antwort.
 * Hier ist sie es nicht, und der Grund steht im Zweck: Das Zertifikat wird
 * **auf dem Gerät des Kunden** geprüft, oft auf genau dem Telefon, das
 * gerade repariert wurde – also auf älterer Software. `Ed25519` kam in
 * WebCrypto erst mit Safari 17 (2023), Firefox 129 (2024) und Chrome 137
 * (2025) an. Ein Beleg, den ein drei Jahre altes Telefon nicht prüfen kann,
 * erfüllt seinen Zweck nicht.
 *
 * ECDSA mit P-256 und SHA-256 ist seit 2014 in jedem Browser vorhanden, gilt
 * unverändert als sicher und liefert dieselbe Signaturlänge: 64 Byte. Die
 * modernere Kurve hätte an dieser Stelle nichts gewonnen und Kunden
 * ausgeschlossen.
 *
 * ## Rohes r‖s statt DER
 *
 * WebCrypto liefert und erwartet die Signatur roh: 32 Byte r, 32 Byte s.
 * Die DER-Verpackung, die OpenSSL gewohnt ist, wäre 6–8 Byte länger und
 * variabel lang – beides schlecht für ein Format, das in einen QR-Code
 * passen soll.
 *
 * ## Der private Schlüssel ist exportierbar – mit Absicht
 *
 * Das ist die unbequemere Wahl. Ein nicht exportierbarer Schlüssel wäre
 * sicherer gegen Diebstahl aus dem Browser, aber er stirbt mit dem
 * Browserprofil: Ein geleerter Speicher, ein neuer Rechner, ein defektes
 * Gerät – und der Betrieb kann keine Zertifikate mehr ausstellen. Bereits
 * ausgestellte blieben prüfbar, aber der Schlüsselring müsste wachsen und
 * jeder Wechsel wäre erklärungsbedürftig.
 *
 * Deshalb: exportierbar, mit einer ausdrücklichen Sicherung als Datei und
 * einem deutlichen Hinweis im Werkzeug. Wer die Sicherung verliert, verliert
 * die Unterschrift; wer sie weitergibt, verschenkt sie.
 */

const ALGORITHM = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_PARAMS = { name: "ECDSA", hash: "SHA-256" } as const;

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) {
    throw new Error(
      "Dieser Browser stellt WebCrypto nicht bereit. Zertifikate lassen sich " +
        "nur über eine gesicherte Verbindung (https) prüfen.",
    );
  }
  return api;
}

/* ---- Schlüssel --------------------------------------------------------- */

/** Erzeugt ein neues Schlüsselpaar für den Betrieb. */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return subtle().generateKey(ALGORITHM, true, ["sign", "verify"]);
}

/**
 * Der öffentliche Schlüssel als roher Punkt (65 Byte, unkomprimiert).
 * Das ist die Form, die im Schlüsselring dieser Website steht.
 */
export async function exportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await subtle().exportKey("raw", key));
}

export async function importPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey(
    "raw",
    raw as unknown as BufferSource,
    ALGORITHM,
    true,
    ["verify"],
  );
}

/** Der private Schlüssel als JWK – die Form, die gesichert wird. */
export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return subtle().exportKey("jwk", key);
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return subtle().importKey("jwk", jwk, ALGORITHM, true, ["sign"]);
}

/* ---- Unterschreiben und Prüfen ----------------------------------------- */

export async function sign(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const signature = await subtle().sign(
    SIGN_PARAMS,
    key,
    data as unknown as BufferSource,
  );
  return new Uint8Array(signature);
}

/**
 * Prüft die Unterschrift. Liefert `false` statt zu werfen – eine ungültige
 * Signatur ist hier das erwartete Ergebnis, kein Ausnahmefall.
 */
export async function verify(
  key: CryptoKey,
  signature: Uint8Array,
  data: Uint8Array,
): Promise<boolean> {
  try {
    return await subtle().verify(
      SIGN_PARAMS,
      key,
      signature as unknown as BufferSource,
      data as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}

/* ---- Gerätebindung ----------------------------------------------------- */

/**
 * Bereichstrennung. Ohne dieses Präfix wäre der Hashwert derselbe wie in
 * jeder anderen Anwendung, die eine IMEI hasht – eine fertige Regenbogen-
 * tabelle aus fremder Quelle würde auf unsere Zertifikate passen.
 */
const BINDING_DOMAIN = "drsmartphone48/zertifikat/imei/v1:";

/** Ziffern raus, alles andere weg. Menschen tippen Leerzeichen und Striche. */
export function normalizeImei(input: string): string {
  return input.replace(/\D+/g, "");
}

/**
 * Die Gerätebindung: der Anfang von SHA-256 über die IMEI.
 *
 * Wie viele Byte davon gebraucht werden, weiß das Format und nicht die
 * Kryptografie – `length` kommt deshalb von außen (`BINDING_BYTES`).
 * Warum ausgerechnet vier und warum mehr an dieser Stelle schlechter wäre:
 * siehe `format.ts`.
 */
export async function deviceBinding(
  imei: string,
  length: number,
): Promise<Uint8Array> {
  const digits = normalizeImei(imei);
  if (digits.length < 14) {
    throw new Error("Eine IMEI hat 15 Ziffern (Seriennummern mindestens 14).");
  }
  const data = new TextEncoder().encode(BINDING_DOMAIN + digits);
  const digest = await subtle().digest("SHA-256", data as unknown as BufferSource);
  return new Uint8Array(digest).slice(0, length);
}

/** Zeitunabhängiger Vergleich. Bei vier Byte Zierde, aber die richtige Zierde. */
export function bindingMatches(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
