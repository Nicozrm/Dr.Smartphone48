/**
 * Die Liste für das Dashboard – mit Suche, Filter, Sortierung und Kennzahlen.
 *
 * Alles läuft über den Zugang der angemeldeten Person, nicht über die
 * Service-Role. Die Policies entscheiden, ob überhaupt eine Zeile kommt; diese
 * Route entscheidet nur, welche davon interessant sind.
 *
 * Die Kennzahlen kommen im selben Aufruf mit. Zwei Anfragen für eine Ansicht,
 * die immer beides zeigt, wären zwei Rundreisen und zwei Ladezustände – und
 * die Zahlen stünden für einen Moment neben einer Liste, die sie nicht meint.
 */

import { requireStaff } from "@/lib/supabase/server";
import { getStats, listTickets, type TicketSort } from "@/lib/tickets/repository";
import { isTicketStatus, type TicketStatus } from "@/lib/tickets/status";
import { missingConfiguration } from "@/lib/notify/registry";
import { fail, noBackend, ok, serverError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS: readonly TicketSort[] = ["neueste", "aelteste", "bewegung", "status"];

function parseSort(value: string | null): TicketSort {
  return SORTS.find((sort) => sort === value) ?? "bewegung";
}

/** `?status=open,repairing` – unbekannte Werte werden verworfen, nicht gemeldet. */
function parseStatuses(value: string | null): TicketStatus[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(isTicketStatus);
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "", 10);

  try {
    const [list, stats] = await Promise.all([
      listTickets(session.client, {
        search: url.searchParams.get("q") ?? undefined,
        statuses: parseStatuses(url.searchParams.get("status")),
        sort: parseSort(url.searchParams.get("sort")),
        limit: Number.isFinite(limit) ? limit : undefined,
        offset: Number.isFinite(offset) ? offset : undefined,
      }),
      getStats(session.client),
    ]);

    return ok({
      items: list.items,
      total: list.total,
      stats,
      staff: { email: session.staff.email, displayName: session.staff.displayName },
      // Damit im Dashboard steht, warum ein Kunde keine Nachricht bekommt,
      // statt dass es jemand im Quelltext sucht.
      notifications: { missing: missingConfiguration() },
    });
  } catch (error) {
    return serverError("Werkstattliste", error);
  }
}
