/*
  Eingabeprüfung – dieselbe Handschrift wie `lib/invoice/validate.ts`:
  eine Funktion, eine Liste von Befunden, keine Ausnahmen als Steuerfluss.

  Diese Datei ist die einzige Stelle, an der Eingaben aus dem Netz zu Werten
  werden. Alles, was von außen kommt, geht hier durch – auch das, was der
  eigene Client schon geprüft hat. Was nur im Browser geprüft wird, ist nicht
  geprüft.

  Gegen SQL-Injektion hilft hier nichts davon; das übernimmt die
  parametrisierte Abfrage im Supabase-Client. Was hier passiert, ist etwas
  anderes: Längen begrenzen, Steuerzeichen entfernen (sie eröffnen in einer
  E-Mail zusätzliche Kopfzeilen) und Unsinn früh abweisen, damit er gar nicht
  erst in die Datenbank kommt.
*/

import { isTicketStatus, type TicketStatus } from "./status";
import { normalizeTicketCode } from "./code";
import { isContactChannel, type ContactChannel } from "./types";

export interface FieldIssue {
  field: string;
  message: string;
}

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; issues: FieldIssue[] };

/** Obergrenzen. Großzügig für Menschen, eng genug gegen Massenversand. */
export const LIMITS = {
  customer: 120,
  phone: 40,
  email: 160,
  imei: 24,
  note: 2000,
  internalNotes: 4000,
  statusNote: 500,
} as const;

/**
 * Einzeiler säubern: Steuerzeichen raus, Rand trimmen, kappen.
 * Zeilenumbrüche zählen hier zu den Steuerzeichen – ein Name mit Umbruch
 * ist kein Name, sondern ein Versuch.
 */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

/** Wie `cleanLine`, behält aber Absätze – für Freitextfelder. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

/** Absichtlich schlicht: Die Zustellbarkeit entscheidet sich beim Versand. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
/** Ziffern, Leerzeichen, Klammern, Plus, Schrägstrich, Bindestrich. */
const PHONE = /^[+\d][\d\s()/.-]{4,}$/;

/** Anmeldung eines Vorgangs durch den Kunden. */
export interface TicketRegistrationInput {
  /** Kanonische Parameter des Voranschlags (`g=…&r=…`). */
  query: string;
  customer: string;
  phone: string | null;
  email: string | null;
  imei: string | null;
  customerNote: string | null;
  contactChannel: ContactChannel;
}

export function validateRegistration(
  raw: unknown,
): Validated<TicketRegistrationInput> {
  const issues: FieldIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });

  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  // Die Einwilligung steht vor allem anderen. Ohne sie entsteht kein
  // Datensatz – auch kein halber, den man später „vervollständigen" könnte.
  if (body.consent !== true) {
    add("consent", "Ohne Einwilligung wird nichts gespeichert.");
  }

  const query = cleanLine(body.query, 300);
  if (!query) add("query", "Zum Vorgang fehlt der Voranschlag.");

  const customer = cleanLine(body.customer, LIMITS.customer);
  if (customer.length < 2) add("customer", "Bitte Namen angeben.");

  const phoneRaw = cleanLine(body.phone, LIMITS.phone);
  const phone = phoneRaw || null;
  if (phone && !PHONE.test(phone)) {
    add("phone", "Diese Telefonnummer sieht nicht aus wie eine.");
  }

  const emailRaw = cleanLine(body.email, LIMITS.email);
  const email = emailRaw || null;
  if (email && !EMAIL.test(email)) {
    add("email", "Bitte gültige E-Mail angeben.");
  }

  if (!phone && !email) {
    add("phone", "Wir brauchen einen Weg für die Fertigmeldung – Telefon oder E-Mail.");
  }

  // Nur Ziffern speichern. Die Prüfziffer ist bereits im Formular
  // nachgerechnet (`lib/imei.ts`); hier zählt nur die Form.
  const imeiDigits = cleanLine(body.imei, LIMITS.imei).replace(/\D/g, "");
  if (imeiDigits && imeiDigits.length !== 15) {
    add("imei", "Eine IMEI hat 15 Ziffern.");
  }

  const contactChannel: ContactChannel = isContactChannel(body.contactChannel)
    ? body.contactChannel
    : "none";
  if (contactChannel === "email" && !email) {
    add("email", "Für Nachrichten per E-Mail brauchen wir eine Adresse.");
  }
  if ((contactChannel === "whatsapp" || contactChannel === "sms") && !phone) {
    add("phone", "Für Nachrichten aufs Telefon brauchen wir eine Nummer.");
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      query,
      customer,
      phone,
      email,
      imei: imeiDigits || null,
      customerNote: cleanText(body.customerNote, LIMITS.note) || null,
      contactChannel,
    },
  };
}

/**
 * Statuswechsel oder Vermerk aus der Werkstatt.
 *
 * `undefined` heißt überall „nicht anfassen". Das ist kein Detail: Ohne
 * diese Unterscheidung räumte jeder Statuswechsel, der ohne Notizfeld
 * gesendet wird, die vorhandenen Vermerke ab.
 */
export interface TicketPatchInput {
  status?: TicketStatus;
  /** Begründung des Wechsels. Landet in der Historie. */
  note?: string;
  /** Leerer String löscht die Vermerke. */
  internalNotes?: string;
  /** `null` nimmt eine gesetzte Zusage zurück. */
  estimatedReadyAt?: string | null;
}

export function validatePatch(raw: unknown): Validated<TicketPatchInput> {
  const issues: FieldIssue[] = [];
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const patch: TicketPatchInput = {};

  if (body.status !== undefined && body.status !== null) {
    if (!isTicketStatus(body.status)) {
      issues.push({ field: "status", message: "Unbekannter Status." });
    } else {
      patch.status = body.status;
    }
  }

  const note = cleanText(body.note, LIMITS.statusNote);
  if (note) patch.note = note;

  if (body.internalNotes !== undefined) {
    patch.internalNotes = cleanText(body.internalNotes, LIMITS.internalNotes);
  }

  if (body.estimatedReadyAt === null) {
    patch.estimatedReadyAt = null;
  } else if (body.estimatedReadyAt !== undefined) {
    const value = typeof body.estimatedReadyAt === "string" ? body.estimatedReadyAt : "";
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
      issues.push({ field: "estimatedReadyAt", message: "Kein gültiges Datum." });
    } else {
      patch.estimatedReadyAt = date.toISOString();
    }
  }

  const touchesSomething =
    patch.status !== undefined ||
    patch.internalNotes !== undefined ||
    patch.estimatedReadyAt !== undefined;
  if (!touchesSomething) {
    issues.push({
      field: "status",
      message: "Die Anfrage ändert nichts – Status, Vermerk oder Termin angeben.",
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: patch };
}

/** Vorgangscode aus einem Adresssegment. */
export function validateTicketCode(raw: string | undefined): string | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Kaputte Prozentzeichen sind kein Code – der Rohwert scheitert gleich.
  }
  return normalizeTicketCode(decoded);
}
