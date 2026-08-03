/*
  Die Redaktion – eine Stelle, an der entschieden wird, was nach draußen geht.

  Der Vorgangscode ist ein Schlüssel, kein Ausweis. Wer ihn hat, hat ihn
  vielleicht weitergeleitet bekommen, vielleicht über die Schulter gelesen.
  Deshalb entsteht die öffentliche Sicht nicht dadurch, dass man ein paar
  Felder im Template weglässt, sondern hier: Was `toPublicTicket` nicht
  zurückgibt, kann keine Seite versehentlich anzeigen.

  Nicht enthalten: Name, Telefon, E-Mail, IMEI, interne Vermerke, die
  Anmerkung des Kunden.
*/

import { statusProgress } from "./status";
import type {
  PublicHistoryEntry,
  PublicTicket,
  RepairTicket,
  TicketHistoryEntry,
} from "./types";

/**
 * Präfix, das einen Vermerk für den Kunden sichtbar macht.
 *
 * Standard ist Vertraulichkeit: Ein Vermerk in der Werkstatt ist eine Notiz
 * unter Kollegen („Kunde ruft ständig an", „Schraube abgerissen") und gehört
 * niemandem sonst. Wer bewusst etwas mitteilen will, stellt `+` voran –
 * dann steht der Satz auf der Statusseite.
 */
export const PUBLIC_NOTE_PREFIX = "+";

/** Gibt den Vermerk zurück, wenn er für den Kunden gedacht ist. */
export function publicNote(note: string | null): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  if (!trimmed.startsWith(PUBLIC_NOTE_PREFIX)) return null;
  const text = trimmed.slice(PUBLIC_NOTE_PREFIX.length).trim();
  return text.length > 0 ? text : null;
}

function toPublicHistory(entry: TicketHistoryEntry): PublicHistoryEntry {
  return {
    oldStatus: entry.oldStatus,
    newStatus: entry.newStatus,
    note: publicNote(entry.note),
    createdAt: entry.createdAt,
  };
}

export function toPublicTicket(
  ticket: RepairTicket,
  history: TicketHistoryEntry[],
): PublicTicket {
  return {
    ticketCode: ticket.ticketCode,
    device: ticket.device,
    repairItems: ticket.repairItems,
    totalPrice: ticket.totalPrice,
    estimatedMinutes: ticket.estimatedMinutes,
    estimatedReadyAt: ticket.estimatedReadyAt,
    status: ticket.status,
    progress: statusProgress(ticket.status),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    statusChangedAt: ticket.statusChangedAt,
    history: history.map(toPublicHistory),
  };
}

/**
 * IMEI für die Werkstattansicht kürzen.
 *
 * Auch intern gilt: Die vollständige Nummer braucht man beim Gerät in der
 * Hand, nicht in einer Übersicht, die den halben Tag offen auf dem Tresen
 * liegt. Die letzten vier Stellen genügen zum Zuordnen.
 */
export function maskImei(imei: string | null): string | null {
  if (!imei) return null;
  const digits = imei.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••• •••• ••${digits.slice(-4)}`;
}
