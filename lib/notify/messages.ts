/*
  Die Texte.

  Sie stehen hier und nicht in den Adaptern, damit derselbe Satz auf jedem Weg
  ankommt – und damit man sie an einer Stelle lesen kann, ohne Code zu lesen.
  Wer den Ton der Website ändert, ändert ihn hier mit.

  Zwei Dinge stehen in keinem dieser Texte: eine Uhrzeit, die niemand zugesagt
  hat, und eine Aufforderung zur Zahlung. Beides entsteht erst am Tresen.
*/

import { site } from "@/lib/site";
import { ticketStatusMeta, type TicketStatus } from "@/lib/tickets/status";
import type { RepairTicket } from "@/lib/tickets/types";

export interface MessageDraft {
  subject: string;
  text: string;
}

/**
 * Anrede ohne Geschlecht: Der Name steht genau so da, wie er angegeben wurde.
 * „Sehr geehrte Frau …" aus einem Vornamen zu raten geht in einem von zwanzig
 * Fällen daneben, und zwar sichtbar.
 */
function greeting(customer: string): string {
  const name = customer.trim();
  return name ? `Guten Tag ${name},` : "Guten Tag,";
}

const bodies: Partial<Record<TicketStatus, (ticket: RepairTicket) => string>> = {
  device_received: (ticket) =>
    `Ihr ${ticket.device} ist bei uns angekommen und aufgenommen. Wir melden uns wieder, sobald es etwas zu berichten gibt.`,

  waiting_for_parts: (ticket) =>
    `Für Ihr ${ticket.device} fehlt noch ein Ersatzteil. Es ist bestellt – sobald es da ist, geht es sofort weiter. Sie hören von uns, es ist nichts zu tun.`,

  ready_for_pickup: (ticket) =>
    `Ihr ${ticket.device} ist fertig und kann abgeholt werden.\n\nWir haben ${site.openingHoursShort} geöffnet. Bezahlt wird bei der Abholung; auf Teil und Arbeit gilt eine Garantie von ${site.warrantyMonths} Monaten.`,
};

/**
 * Baut die Nachricht zu einem Zustand – oder gibt `null` zurück, wenn dieser
 * Zustand keine ist. Das ist der Regelfall: Die meisten Schritte sind
 * Werkstattinterna, und wer für jeden Handgriff eine Nachricht bekommt,
 * schaltet sie ab.
 */
export function draftForStatus(
  ticket: RepairTicket,
  status: TicketStatus,
  note: string | null,
): MessageDraft | null {
  const body = bodies[status];
  if (!body) return null;

  const lines = [greeting(ticket.customer), "", body(ticket)];
  if (note) lines.push("", note);
  lines.push("", `Vorgang ${ticket.ticketCode}`, site.name);

  return {
    subject: `${ticketStatusMeta[status].label} – Vorgang ${ticket.ticketCode}`,
    text: lines.join("\n"),
  };
}
