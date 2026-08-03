/*
  Benachrichtigungen – die Form, nicht der Anbieter.

  Ein Reparaturbetrieb wechselt den Weg, auf dem er seine Kunden erreicht,
  häufiger als seine Preisliste: heute E-Mail, morgen WhatsApp Business, in
  zwei Jahren etwas, das es noch nicht gibt. Deshalb steht hier nur, was ein
  Weg können muss, und in `adapters/` je eine Umsetzung.

  Drei Regeln, die für jeden Adapter gelten:

  1. **`isConfigured()` lügt nicht.** Ein Adapter, der ohne Zugangsdaten
     „ja" sagt und dann still verwirft, ist schlimmer als keiner: Die
     Werkstatt glaubt, der Kunde sei informiert.
  2. **`send()` wirft nicht.** Ein Zustellfehler ist ein Ergebnis, kein
     Absturz. Ein Statuswechsel darf nie daran scheitern, dass ein
     E-Mail-Anbieter gerade nicht erreichbar ist.
  3. **Kein Adapter entscheidet, ob gesendet wird.** Das entscheidet der
     Kunde bei der Anmeldung (`contact_channel`) und `dispatch.ts`.
*/

import type { TicketStatus } from "@/lib/tickets/status";
import type { ContactChannel } from "@/lib/tickets/types";

/**
 * Die Wege, die es geben kann.
 *
 * Bewusst eine eigene Liste und nicht `ContactChannel` ohne `none`: Was ein
 * Kunde bei der Anmeldung **wählen** kann, ist weniger als das, was die
 * Zustellschicht **kann**. `push` setzt eine Anmeldung im Browser voraus
 * (Service Worker, gespeicherte Subscription) – die gibt es hier noch nicht,
 * den Adapter dafür schon. Ein Kanal ohne Auswahlmöglichkeit ist kein
 * Widerspruch, sondern eine vorbereitete Stelle.
 */
export type NotificationChannelId = "email" | "whatsapp" | "sms" | "push";

/** Die Wahl des Kunden auf einen Zustellweg abbilden. `null` heißt: keiner. */
export function channelFromContact(
  contact: ContactChannel,
): NotificationChannelId | null {
  return contact === "none" ? null : contact;
}

export interface NotificationMessage {
  channel: NotificationChannelId;
  /** E-Mail-Adresse oder Rufnummer – was der Kanal braucht. */
  to: string;
  /** Nur für E-Mail sinnvoll; andere Kanäle stellen ihn voran oder ignorieren ihn. */
  subject: string;
  /** Der Text. Reiner Fließtext, keine Auszeichnung – jeder Kanal kann ihn. */
  text: string;
  /** Kontext für Protokoll und Vorlagen. */
  ticketCode: string;
  status: TicketStatus;
  /** Adresse der Statusseite, damit jede Nachricht einen Weg zurück hat. */
  statusUrl: string;
}

export type NotificationResult =
  | { ok: true; channel: NotificationChannelId; detail?: string }
  | { ok: false; channel: NotificationChannelId; error: string };

export interface NotificationAdapter {
  readonly id: NotificationChannelId;
  /** Sprechender Name für Protokoll und Einrichtungshinweise. */
  readonly name: string;
  /**
   * Steht dieser Weg zur Verfügung? Wird vor jedem Versand gefragt, nicht
   * einmal beim Start – Umgebungsvariablen ändern sich beim Deploy.
   */
  isConfigured(): boolean;
  /** Was fehlt, wenn `isConfigured()` falsch ist. Für die Einrichtung. */
  readonly requires: readonly string[];
  send(message: NotificationMessage): Promise<NotificationResult>;
}
