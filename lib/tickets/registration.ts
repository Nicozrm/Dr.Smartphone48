/*
  Von der Anmeldung zum Datensatz.

  Der entscheidende Satz steht in `buildTicketInsert`: Preise, Dauer und Gerät
  kommen **nicht** aus dem Formular, sondern werden auf dem Server aus den
  Voranschlagsparametern neu gerechnet – mit derselben Funktion, die auch die
  Ticketseite benutzt (`parseTicket` aus `lib/ticket.ts`).

  Damit ist der Client kein Zeuge in eigener Sache. Wer im Netzwerkfenster
  `total_price: 0` einträgt, ändert nichts: Der Server kennt die Preisliste.
  Und weil dieselbe Funktion rechnet, kann die zugesagte Summe im Ticket nie
  von der gespeicherten abweichen – es gibt keine zweite Preislogik.
*/

import type { RepairTicketInsert } from "@/lib/supabase/database";
import { parseTicket, type Ticket } from "@/lib/ticket";
import type { TicketRegistrationInput } from "./validate";
import type { TicketRepairItem } from "./types";

/** Baut den Voranschlag aus den kanonischen Parametern nach. */
export function estimateFromQuery(query: string): Ticket | null {
  try {
    return parseTicket(new URLSearchParams(query));
  } catch {
    // Kaputte Parameter sind kein Vorgang.
    return null;
  }
}

export function toRepairItems(ticket: Ticket): TicketRepairItem[] {
  return ticket.positions.map((position) => ({
    kind: position.kind,
    label: position.label,
    price: position.price,
    minutes: position.minutes,
  }));
}

export function buildTicketInsert(
  input: TicketRegistrationInput,
  ticket: Ticket,
): Omit<RepairTicketInsert, "ticket_code"> {
  return {
    estimate_reference: ticket.reference,
    estimate_query: ticket.query,
    customer: input.customer,
    phone: input.phone,
    email: input.email,
    device: `${ticket.brand.name} ${ticket.model.name}`,
    device_brand_id: ticket.brand.id,
    device_model_id: ticket.model.id,
    imei: input.imei,
    repair_items: toRepairItems(ticket),
    total_price: ticket.total,
    estimated_minutes: ticket.minutes,
    contact_channel: input.contactChannel,
    customer_note: input.customerNote,
  };
}
