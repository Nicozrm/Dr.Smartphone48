/*
  Wann geht eine Nachricht raus – und wann nicht.

  Vier Bedingungen müssen zusammenkommen. Fehlt eine, passiert nichts, und das
  Ergebnis sagt warum. Diese Reihenfolge ist kein Zufall, sie geht vom
  Wichtigsten zum Technischen:

  1. Der Kunde hat einen Weg gewählt. `none` ist die Vorauswahl.
  2. Der Zustand ist eine Nachricht wert (`NOTIFYING_STATUSES`).
  3. Für diesen Zustand gibt es einen Text (`messages.ts`).
  4. Der Weg ist eingerichtet (`registry.ts`).

  Und eine Regel darüber: **Ein Versandfehler bricht nie einen Statuswechsel
  ab.** Der Vorgang ist zu dem Zeitpunkt bereits geschrieben; die Nachricht ist
  eine Freundlichkeit obendrauf. Deshalb gibt diese Funktion ein Ergebnis
  zurück und wirft nicht – die Werkstatt sieht im Dashboard, ob es geklappt
  hat, und kann zum Telefon greifen.
*/

import { NOTIFYING_STATUSES, type TicketStatus } from "@/lib/tickets/status";
import { statusUrl } from "@/lib/tickets/links";
import type { RepairTicket } from "@/lib/tickets/types";
import { draftForStatus } from "./messages";
import { getAdapter } from "./registry";
import { channelFromContact, type NotificationResult } from "./types";

export type DispatchOutcome =
  | { sent: false; reason: "kein-kanal" | "kein-anlass" | "kein-text" | "nicht-eingerichtet" }
  | { sent: true; result: NotificationResult };

export async function dispatchStatusChange(options: {
  ticket: RepairTicket;
  status: TicketStatus;
  /** Vermerk der Werkstatt, sofern er für den Kunden gedacht ist. */
  note: string | null;
  /** Basis für die Adresse in der Nachricht (Origin der Anfrage). */
  origin?: string;
}): Promise<DispatchOutcome> {
  const { ticket, status, note, origin } = options;

  const channel = channelFromContact(ticket.contactChannel);
  if (!channel) return { sent: false, reason: "kein-kanal" };

  if (!NOTIFYING_STATUSES.includes(status)) {
    return { sent: false, reason: "kein-anlass" };
  }

  const draft = draftForStatus(ticket, status, note);
  if (!draft) return { sent: false, reason: "kein-text" };

  const adapter = getAdapter(channel);
  if (!adapter.isConfigured()) return { sent: false, reason: "nicht-eingerichtet" };

  const to = channel === "email" ? ticket.email : ticket.phone;
  if (!to) return { sent: false, reason: "kein-kanal" };

  const result = await adapter.send({
    channel,
    to,
    subject: draft.subject,
    text: draft.text,
    ticketCode: ticket.ticketCode,
    status,
    statusUrl: statusUrl(ticket.ticketCode, origin),
  });

  return { sent: true, result };
}
