/**
 * Der Vorgang – lesend für den Kunden, ändernd für die Werkstatt.
 *
 * Zwei Verben, zwei völlig verschiedene Berechtigungen, und deshalb der
 * wichtigste Satz dieser Datei:
 *
 * **GET liest mit der Service-Role und gibt niemals die Zeile zurück.**
 * Was rausgeht, hat `toPublicTicket` vorher redigiert – kein Name, keine
 * Telefonnummer, keine IMEI, keine internen Vermerke. Wer diese Route ändert,
 * ändert sie dort, nicht hier.
 *
 * **PATCH verlangt eine angemeldete Person aus `workshop_staff`** und
 * arbeitet mit deren eigenem Zugang. Ein Fehler in einer Abfrage kann hier
 * nichts preisgeben, was die Policies nicht ohnehin erlauben.
 */

import { getAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/supabase/server";
import {
  applyStatus,
  findTicketByCode,
  getHistory,
  updateTicketFields,
  type TicketClient,
} from "@/lib/tickets/repository";
import { toPublicTicket } from "@/lib/tickets/public-view";
import { canTransition, transitionError } from "@/lib/tickets/status";
import { validatePatch, validateTicketCode } from "@/lib/tickets/validate";
import { dispatchStatusChange } from "@/lib/notify/dispatch";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { fail, noBackend, ok, originOf, readJson, serverError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dreißig Abfragen in fünf Minuten.
 *
 * Großzügig für einen Menschen, der seine Seite offen hat (sie fragt nach dem
 * ersten Laden ohnehin nur noch auf Zuruf des Rundrufs nach), eng genug, dass
 * das Durchprobieren von Codes keine Strategie ist.
 */
const READ_LIMIT = { scope: "status-lesen", limit: 30, windowMs: 5 * 60 * 1000 };

type Context = { params: Promise<{ ticketCode: string }> };

export async function GET(request: Request, context: Context) {
  const verdict = rateLimit(clientKey(request), READ_LIMIT);
  if (verdict.limited) {
    return fail("Zu viele Abfragen. Bitte einen Moment warten.", 429);
  }

  const { ticketCode } = await context.params;
  const code = validateTicketCode(ticketCode);
  if (!code) return fail("Das ist keine gültige Vorgangsnummer.", 400);

  const admin = getAdminClient();
  if (!admin) return noBackend();

  try {
    const ticket = await findTicketByCode(admin, code);
    // Bewusst dieselbe Antwort wie bei einem ungültigen Code: Ein
    // unterscheidbares „gibt es nicht" gegenüber „gibt es, aber" wäre ein
    // Orakel, mit dem sich gültige Codes finden lassen.
    if (!ticket) return fail("Zu dieser Nummer finden wir keinen Vorgang.", 404);

    const history = await getHistory(admin, ticket.id);
    return ok({ ticket: toPublicTicket(ticket, history) });
  } catch (error) {
    return serverError(`Status lesen (${code})`, error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const { ticketCode } = await context.params;
  const code = validateTicketCode(ticketCode);
  if (!code) return fail("Das ist keine gültige Vorgangsnummer.", 400);

  const session = await requireStaff();
  if (!session.ok) {
    if (session.reason === "kein-backend") return noBackend();
    if (session.reason === "nicht-angemeldet") {
      return fail("Bitte zuerst anmelden.", 401);
    }
    return fail("Dieses Konto ist nicht für die Werkstatt freigeschaltet.", 403);
  }

  const validation = validatePatch(await readJson(request));
  if (!validation.ok) {
    return fail("Die Änderung ist unvollständig.", 422, validation.issues);
  }
  const patch = validation.value;

  const client: TicketClient = session.client;

  try {
    const current = await findTicketByCode(client, code);
    if (!current) return fail("Zu dieser Nummer finden wir keinen Vorgang.", 404);

    let ticket = current;

    // Erst die Felder, dann der Status: Der Statuswechsel schreibt die
    // Historie und löst die Benachrichtigung aus. Ein Vermerk, der danach
    // käme, stünde nicht in der Nachricht, die er begründet.
    if (patch.internalNotes !== undefined || patch.estimatedReadyAt !== undefined) {
      ticket = await updateTicketFields(client, ticket.id, {
        internalNotes:
          patch.internalNotes === undefined ? undefined : patch.internalNotes || null,
        estimatedReadyAt: patch.estimatedReadyAt,
      });
    }

    let notified: string | null = null;

    if (patch.status) {
      if (!canTransition(ticket.status, patch.status)) {
        return fail(
          transitionError(ticket.status, patch.status) ?? "Dieser Wechsel ist nicht möglich.",
          409,
        );
      }

      ticket = await applyStatus(
        client,
        ticket.id,
        patch.status,
        patch.note ?? null,
        session.staff.email,
      );

      // Die Nachricht ist eine Freundlichkeit obendrauf. Sie darf den
      // Statuswechsel weder aufhalten noch scheitern lassen – der steht zu
      // diesem Zeitpunkt bereits in der Datenbank.
      const outcome = await dispatchStatusChange({
        ticket,
        status: patch.status,
        note: patch.note ?? null,
        origin: originOf(request),
      }).catch(() => null);

      if (outcome?.sent) {
        notified = outcome.result.ok
          ? outcome.result.channel
          : `fehlgeschlagen: ${outcome.result.error}`;
      } else if (outcome) {
        notified = null;
      }
    }

    const history = await getHistory(client, ticket.id);
    return ok({ ticket, history, notified });
  } catch (error) {
    return serverError(`Vorgang ändern (${code})`, error);
  }
}
