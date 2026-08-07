/**
 * Der private Schlüssel und das Ausstellungsbuch – beides nur im Browser.
 *
 * Es gibt für dieses Werkzeug keinen Server, und das ist keine Sparmaßnahme:
 * Ein privater Signaturschlüssel, der auf einem Server liegt, ist ein
 * Schlüssel, den der Hoster hat. Er bleibt deshalb dort, wo er hingehört –
 * auf dem Rechner in der Werkstatt, in `localStorage`, mit einer Sicherung
 * als Datei.
 *
 * Was das kostet, steht auch dazu: Wer den Browserspeicher leert und keine
 * Sicherung hat, kann keine neuen Zertifikate mehr ausstellen. Die bereits
 * ausgestellten bleiben gültig – die Prüfung braucht nur die öffentliche
 * Hälfte, und die steht im Quelltext der Website.
 */

const KEY_SLOT = "ds48.zertifikat.schluessel";
const LOG_SLOT = "ds48.zertifikat.buch";

export interface StoredKey {
  id: number;
  /** Private Hälfte als JWK. Verlässt den Browser nur als Sicherungsdatei. */
  privateJwk: JsonWebKey;
  /** Öffentliche Hälfte, roh und base64url – die Zeile für `keys.ts`. */
  publicKey: string;
  createdAt: string;
}

/** Ein Eintrag im Ausstellungsbuch. Ohne Namen, ohne IMEI. */
export interface LogEntry {
  code: string;
  model: string;
  issued: string;
  fingerprint: string;
}

function read<T>(slot: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(slot);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Beschädigter oder gesperrter Speicher darf das Werkzeug nicht mitnehmen.
    return null;
  }
}

function write(slot: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(slot, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadKey(): StoredKey | null {
  return read<StoredKey>(KEY_SLOT);
}

export function saveKey(key: StoredKey): boolean {
  return write(KEY_SLOT, key);
}

export function loadLog(): LogEntry[] {
  return read<LogEntry[]>(LOG_SLOT) ?? [];
}

/** Neuester Eintrag zuerst, höchstens 50 – das Buch ist eine Hilfe, kein Archiv. */
export function appendLog(entry: LogEntry): LogEntry[] {
  const next = [entry, ...loadLog()].slice(0, 50);
  write(LOG_SLOT, next);
  return next;
}
