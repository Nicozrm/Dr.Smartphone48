/**
 * Anmeldung eines Vorgangs.
 *
 * Der einzige Punkt, an dem aus einem Ticket in der Adresszeile ein Datensatz
 * wird. Bis hierher war alles flüchtig – das ist die Grenze, und sie wird
 * bewusst überschritten: mit Einwilligung, mit genannter Datenverwendung und
 * mit der Möglichkeit, es sein zu lassen.
 *
 * Drei Dinge passieren hier, die im Browser nicht passieren können:
 *
 * 1. **Der Preis wird neu gerechnet.** Aus den Voranschlagsparametern, mit
 *    derselben Funktion wie auf der Ticketseite. Was im Rumpf der Anfrage an
 *    Beträgen steht, wird nicht gelesen.
 * 2. **Die Einwilligung wird ein zweites Mal geprüft.** Was nur im Browser
 *    geprüft wird, ist nicht geprüft.
 * 3. **Der Vorgangscode wird gezogen.** Zufällig, serverseitig, eindeutig.
 */

import { getAdminClient } from "@/lib/supabase/admin";
import { createTicket } from "@/lib/tickets/repository";
import { buildTicketInsert, estimateFromQuery } from "@/lib/tickets/registration";
import { validateRegistration } from "@/lib/tickets/validate";
import { statusPath } from "@/lib/tickets/links";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { fail, noBackend, ok, readJson, serverError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fünf Anmeldungen in zehn Minuten je Adresse – mehr ist kein Kundenverhalten. */
const LIMIT = { scope: "ticket-anmeldung", limit: 5, windowMs: 10 * 60 * 1000 };

export async function POST(request: Request) {
  const verdict = rateLimit(clientKey(request), LIMIT);
  if (verdict.limited) {
    return fail("Zu viele Anmeldungen. Bitte später erneut versuchen.", 429);
  }

  const admin = getAdminClient();
  if (!admin) return noBackend();

  const body = await readJson(request);

  // Ein für Menschen unsichtbares Feld. Bots füllen es aus; wir antworten mit
  // Erfolg, damit sie nichts lernen – legen aber nichts an.
  if (typeof body === "object" && body !== null && "website" in body) {
    const honeypot = (body as Record<string, unknown>).website;
    if (typeof honeypot === "string" && honeypot.trim()) {
      return ok({ ticketCode: null, statusPath: null }, 202);
    }
  }

  const validation = validateRegistration(body);
  if (!validation.ok) {
    return fail("Bitte prüfen Sie die markierten Angaben.", 422, validation.issues);
  }

  const estimate = estimateFromQuery(validation.value.query);
  if (!estimate) {
    return fail(
      "Zu diesem Voranschlag gibt es kein Gerät im Katalog. Bitte im Sofortpreis-Rechner neu auswählen.",
      422,
      [{ field: "query", message: "Unbekanntes Gerät." }],
    );
  }

  try {
    const ticket = await createTicket(admin, buildTicketInsert(validation.value, estimate));
    return ok(
      {
        ticketCode: ticket.ticketCode,
        statusPath: statusPath(ticket.ticketCode),
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      201,
    );
  } catch (error) {
    return serverError("Vorgang anlegen", error);
  }
}
