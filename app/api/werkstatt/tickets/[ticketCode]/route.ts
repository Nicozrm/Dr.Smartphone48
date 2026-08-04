/**
 * Die Akte eines Vorgangs für die Werkstatt: alles, was gespeichert ist,
 * plus die vollständige Historie.
 *
 * Getrennt von der Liste, weil beides unterschiedlich oft gebraucht wird: Die
 * Liste lädt jede Werkstatt hundertmal am Tag, die Akte nur für den einen
 * Vorgang, der gerade auf dem Tisch liegt. Notizen, Kontaktdaten und IMEI
 * hängen deshalb nicht an jeder Listenzeile.
 */

import { requireStaff } from "@/lib/supabase/server";
import { findTicketByCode, getHistory } from "@/lib/tickets/repository";
import { validateTicketCode } from "@/lib/tickets/validate";
import { fail, noBackend, ok, serverError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticketCode: string }> },
) {
  const { ticketCode } = await context.params;
  const code = validateTicketCode(ticketCode);
  if (!code) return fail("Das ist keine gültige Vorgangsnummer.", 400);

  const session = await requireStaff();
  if (!session.ok) {
    if (session.reason === "kein-backend") return noBackend();
    return fail(
      session.reason === "nicht-angemeldet"
        ? "Bitte zuerst anmelden."
        : "Dieses Konto ist nicht für die Werkstatt freigeschaltet.",
      session.reason === "nicht-angemeldet" ? 401 : 403,
    );
  }

  try {
    const ticket = await findTicketByCode(session.client, code);
    if (!ticket) return fail("Zu dieser Nummer finden wir keinen Vorgang.", 404);

    const history = await getHistory(session.client, ticket.id);
    return ok({ ticket, history });
  } catch (error) {
    return serverError(`Akte lesen (${code})`, error);
  }
}
