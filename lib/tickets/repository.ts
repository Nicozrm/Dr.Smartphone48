/*
  Die einzige Stelle, an der dieses Projekt mit den Vorgangstabellen spricht.

  Alles darüber (API-Routen, Dashboard) kennt nur `RepairTicket`,
  `TicketListItem` und `TicketStats` – nie eine Spalte, nie eine Abfrage.
  Das ist kein Selbstzweck: Solange die Umsetzung hier eingeschlossen ist,
  kostet eine geänderte Spalte eine Änderung, und eine zusätzliche Prüfung
  wirkt überall.

  Welcher Client hereingereicht wird, entscheidet die Berechtigung:

  – Service-Role (`lib/supabase/admin.ts`) für die öffentliche Statusseite und
    das Anlegen. Sieht alles, wird deshalb nur mit redigierter Ausgabe benutzt.
  – Sitzungs-Client (`lib/supabase/server.ts`) für die Werkstatt. Sieht, was
    die Policies erlauben.

  Die Funktionen hier prüfen keine Rechte. Sie können es nicht besser als die
  Datenbank, und ein zweiter Ort für dieselbe Frage wäre der Ort, an dem
  irgendwann die falsche Antwort steht.
*/

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  RepairTicketInsert,
  RepairTicketRow,
  TicketHistoryRow,
} from "@/lib/supabase/database";
import { generateTicketCode } from "./code";
import { TICKET_STATUSES, type TicketStatus } from "./status";
import type {
  RepairTicket,
  TicketHistoryEntry,
  TicketListItem,
  TicketStats,
} from "./types";

export type TicketClient = SupabaseClient<Database>;

/** Postgres meldet einen Verstoß gegen eine Eindeutigkeit mit diesem Code. */
const UNIQUE_VIOLATION = "23505";

/* -------------------------------------------------------------------------
   Abbildung Zeile → Domäne
   ------------------------------------------------------------------------- */

export function mapTicket(row: RepairTicketRow): RepairTicket {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    estimateReference: row.estimate_reference,
    estimateQuery: row.estimate_query,
    customer: row.customer,
    phone: row.phone,
    email: row.email,
    device: row.device,
    deviceBrandId: row.device_brand_id,
    deviceModelId: row.device_model_id,
    imei: row.imei,
    repairItems: Array.isArray(row.repair_items) ? row.repair_items : [],
    totalPrice: row.total_price,
    estimatedMinutes: row.estimated_minutes,
    estimatedReadyAt: row.estimated_ready_at,
    status: row.status,
    internalNotes: row.internal_notes,
    customerNote: row.customer_note,
    contactChannel: row.contact_channel,
    consentAt: row.consent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusChangedAt: row.status_changed_at,
  };
}

export function mapHistory(row: TicketHistoryRow): TicketHistoryEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    note: row.note,
    createdAt: row.created_at,
    changedBy: row.changed_by,
  };
}

/** Spalten der Listenansicht – ohne Notizen, IMEI und Kontaktdaten. */
const LIST_COLUMNS =
  "id, ticket_code, customer, device, status, repair_items, total_price, estimated_ready_at, created_at, status_changed_at, internal_notes";

type ListRow = Pick<
  RepairTicketRow,
  | "id"
  | "ticket_code"
  | "customer"
  | "device"
  | "status"
  | "repair_items"
  | "total_price"
  | "estimated_ready_at"
  | "created_at"
  | "status_changed_at"
  | "internal_notes"
>;

function mapListItem(row: ListRow): TicketListItem {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    customer: row.customer,
    device: row.device,
    status: row.status,
    repairItems: Array.isArray(row.repair_items) ? row.repair_items : [],
    totalPrice: row.total_price,
    estimatedReadyAt: row.estimated_ready_at,
    createdAt: row.created_at,
    statusChangedAt: row.status_changed_at,
    // Nur die Tatsache, nicht der Inhalt: In der Liste steht, dass es einen
    // Vermerk gibt; lesen lässt er sich in der Akte.
    hasInternalNotes: Boolean(row.internal_notes && row.internal_notes.trim()),
  };
}

/* -------------------------------------------------------------------------
   Lesen
   ------------------------------------------------------------------------- */

export async function findTicketByCode(
  client: TicketClient,
  ticketCode: string,
): Promise<RepairTicket | null> {
  const { data, error } = await client
    .from("repair_tickets")
    .select("*")
    .eq("ticket_code", ticketCode)
    .maybeSingle();

  if (error) throw new RepositoryError("Vorgang konnte nicht gelesen werden.", error);
  return data ? mapTicket(data) : null;
}

export async function findTicketById(
  client: TicketClient,
  id: string,
): Promise<RepairTicket | null> {
  const { data, error } = await client
    .from("repair_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new RepositoryError("Vorgang konnte nicht gelesen werden.", error);
  return data ? mapTicket(data) : null;
}

export async function getHistory(
  client: TicketClient,
  ticketId: string,
): Promise<TicketHistoryEntry[]> {
  const { data, error } = await client
    .from("ticket_history")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw new RepositoryError("Historie konnte nicht gelesen werden.", error);
  return (data ?? []).map(mapHistory);
}

/* -------------------------------------------------------------------------
   Liste, Suche, Sortierung
   ------------------------------------------------------------------------- */

export type TicketSort = "neueste" | "aelteste" | "bewegung" | "status";

export interface ListOptions {
  /** Freitext über Code, Name, Gerät, Telefon, E-Mail. */
  search?: string;
  /** Leer = alle. */
  statuses?: TicketStatus[];
  sort?: TicketSort;
  limit?: number;
  offset?: number;
}

export interface ListResult {
  items: TicketListItem[];
  /** Gesamtzahl der Treffer, unabhängig von `limit`. */
  total: number;
}

/**
 * Suchbegriff entschärfen.
 *
 * Nicht wegen SQL-Injektion – die Abfrage ist parametrisiert. Sondern weil
 * PostgREST seine Filter in der Adresszeile überträgt: Ein Komma trennt dort
 * Bedingungen, ein Prozentzeichen ist der Platzhalter. Ein Suchfeld, in das
 * jemand `%,%` tippt, ergäbe sonst eine Abfrage, die niemand gemeint hat.
 */
function sanitizeSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@.+-]/gu, " ")
    .trim()
    .slice(0, 80);
}

export async function listTickets(
  client: TicketClient,
  options: ListOptions = {},
): Promise<ListResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  let query = client
    .from("repair_tickets")
    .select(LIST_COLUMNS, { count: "exact" });

  if (options.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const search = options.search ? sanitizeSearch(options.search) : "";
  if (search) {
    query = query.ilike("search_text", `%${search}%`);
  }

  switch (options.sort ?? "bewegung") {
    case "neueste":
      query = query.order("created_at", { ascending: false });
      break;
    case "aelteste":
      query = query.order("created_at", { ascending: true });
      break;
    case "status":
      // Innerhalb eines Zustands die längste Wartezeit zuerst – das ist die
      // Reihenfolge, in der eine Werkstatt tatsächlich arbeitet.
      query = query
        .order("status", { ascending: true })
        .order("status_changed_at", { ascending: true });
      break;
    default:
      query = query.order("status_changed_at", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw new RepositoryError("Liste konnte nicht geladen werden.", error);

  return {
    items: (data ?? []).map((row) => mapListItem(row as ListRow)),
    total: count ?? 0,
  };
}

/* -------------------------------------------------------------------------
   Kennzahlen
   ------------------------------------------------------------------------- */

/**
 * Die Übersicht in Zahlen.
 *
 * Bewusst aus dem Bestand gerechnet und nicht fortgeschrieben: Ein Zähler, den
 * man bei jedem Statuswechsel mitpflegt, liegt irgendwann daneben, und niemand
 * merkt es.
 *
 * Gezählt wird mit `count: "exact", head: true` – eine Abfrage, die keine
 * einzige Zeile überträgt. Die naheliegende Alternative (alle Zustände holen
 * und im Speicher zählen) wäre eine Falle mit Zeitzünder: PostgREST liefert
 * standardmäßig höchstens tausend Zeilen, und ab dem tausendundersten Vorgang
 * zeigte das Dashboard stillschweigend zu wenig an. Über `status` liegt ein
 * Index, die Zählungen laufen parallel.
 */
export async function getStats(client: TicketClient): Promise<TicketStats> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const [statusCounts, todayCount, turnaround] = await Promise.all([
    Promise.all(
      TICKET_STATUSES.map(async (status) => {
        const { count, error } = await client
          .from("repair_tickets")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        if (error) {
          throw new RepositoryError("Kennzahlen konnten nicht gelesen werden.", error);
        }
        return [status, count ?? 0] as const;
      }),
    ),
    client
      .from("repair_tickets")
      .select("id", { count: "exact", head: true })
      .gte("created_at", midnight.toISOString()),
    client
      .from("repair_tickets")
      .select("created_at, status_changed_at")
      .eq("status", "completed")
      .order("status_changed_at", { ascending: false })
      .limit(50),
  ]);

  const byStatus = Object.fromEntries(statusCounts) as Record<TicketStatus, number>;

  const total = statusCounts.reduce((sum, [, count]) => sum + count, 0);
  const completed = byStatus.completed;
  const readyForPickup = byStatus.ready_for_pickup;

  return {
    total,
    byStatus,
    active: total - completed - readyForPickup,
    readyForPickup,
    completed,
    today: todayCount.count ?? 0,
    medianTurnaroundHours: medianHours(turnaround.data ?? []),
  };
}

/** Median statt Mittelwert: Ein Wasserschaden über Ostern verzerrt sonst alles. */
function medianHours(
  rows: { created_at: string; status_changed_at: string }[],
): number | null {
  const hours = rows
    .map(
      (row) =>
        (new Date(row.status_changed_at).getTime() - new Date(row.created_at).getTime()) /
        3_600_000,
    )
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  if (hours.length === 0) return null;
  const middle = Math.floor(hours.length / 2);
  const median =
    hours.length % 2 === 0 ? (hours[middle - 1]! + hours[middle]!) / 2 : hours[middle]!;
  return Math.round(median * 10) / 10;
}

/* -------------------------------------------------------------------------
   Schreiben
   ------------------------------------------------------------------------- */

/**
 * Legt einen Vorgang an und zieht dabei einen freien Code.
 *
 * Bei 32^8 Möglichkeiten ist eine Kollision unwahrscheinlich genug, um sie
 * nicht zu erwarten – aber „unwahrscheinlich" ist kein Programm. Trifft es
 * doch zu, meldet Postgres den Verstoß gegen die Eindeutigkeit, und es wird
 * neu gezogen. Nach drei Versuchen liegt der Fehler woanders.
 */
export async function createTicket(
  client: TicketClient,
  values: Omit<RepairTicketInsert, "ticket_code">,
): Promise<RepairTicket> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client
      .from("repair_tickets")
      .insert({ ...values, ticket_code: generateTicketCode() })
      .select("*")
      .single();

    if (!error && data) return mapTicket(data);
    lastError = error;
    if (error?.code !== UNIQUE_VIOLATION) break;
  }

  throw new RepositoryError("Vorgang konnte nicht angelegt werden.", lastError);
}

/**
 * Statuswechsel. Läuft über die Datenbankfunktion, damit Vorgang und Historie
 * in derselben Transaktion geschrieben werden – siehe Migration.
 */
export async function applyStatus(
  client: TicketClient,
  ticketId: string,
  status: TicketStatus,
  note: string | null,
  changedBy: string | null,
): Promise<RepairTicket> {
  const { data, error } = await client.rpc("apply_ticket_status", {
    p_ticket_id: ticketId,
    p_new_status: status,
    p_note: note,
    p_changed_by: changedBy,
  });

  if (error || !data) {
    throw new RepositoryError("Statuswechsel fehlgeschlagen.", error);
  }
  return mapTicket(data as RepairTicketRow);
}

/** Felder ohne Statusbezug: interne Vermerke, zugesagte Fertigstellung. */
export async function updateTicketFields(
  client: TicketClient,
  ticketId: string,
  patch: { internalNotes?: string | null; estimatedReadyAt?: string | null },
): Promise<RepairTicket> {
  const values: { internal_notes?: string | null; estimated_ready_at?: string | null } = {};
  if (patch.internalNotes !== undefined) values.internal_notes = patch.internalNotes;
  if (patch.estimatedReadyAt !== undefined) values.estimated_ready_at = patch.estimatedReadyAt;

  const { data, error } = await client
    .from("repair_tickets")
    .update(values)
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error || !data) {
    throw new RepositoryError("Vorgang konnte nicht geändert werden.", error);
  }
  return mapTicket(data);
}

/* -------------------------------------------------------------------------
   Fehler
   ------------------------------------------------------------------------- */

/**
 * Ein Fehler mit zwei Gesichtern: `message` ist der Satz für den Menschen,
 * `cause` die Meldung der Datenbank für das Protokoll. Was Postgres schreibt,
 * gehört nie in eine Antwort – dort stehen Spaltennamen, manchmal Werte.
 */
export class RepositoryError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "RepositoryError";
    this.cause = cause;
  }
}
