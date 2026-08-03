"use client";

/*
  Die API aus Sicht des Browsers.

  Eine Datei, in der jede Adresse genau einmal vorkommt und jede Antwort einmal
  in einen Typ übersetzt wird. Ohne sie stünde in jeder Komponente ein `fetch`
  mit einer Zeichenkette, und beim nächsten Umbenennen einer Route fände man
  vier von fünf.

  Fehler werden hier nicht geworfen, sondern zurückgegeben. Eine Oberfläche,
  die auf eine 404 mit einem Absturz reagiert, hilft niemandem; sie soll den
  Satz zeigen, den der Server geschickt hat.
*/

import type { FieldIssue } from "@/lib/tickets/validate";
import type {
  PublicTicket,
  RepairTicket,
  TicketHistoryEntry,
  TicketListItem,
  TicketStats,
} from "@/lib/tickets/types";
import type { TicketStatus } from "@/lib/tickets/status";
import type { NotificationChannelId } from "@/lib/notify/types";

/** Der Unterpfad der GitHub-Projektseite; überall sonst leer. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; issues?: FieldIssue[] };

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      // Nie aus dem Zwischenspeicher: Der Zustand eines Vorgangs ist der
      // einzige Grund, warum jemand diese Seite offen hat.
      cache: "no-store",
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | (Record<string, unknown> & { ok?: boolean; error?: string; issues?: FieldIssue[] })
      | null;

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          typeof payload?.error === "string"
            ? payload.error
            : "Die Anfrage hat nicht geklappt.",
        issues: payload?.issues,
      };
    }

    return { ok: true, data: payload as T };
  } catch {
    // Kein Netz, abgebrochene Anfrage, kein Server (statischer Export).
    return {
      ok: false,
      status: 0,
      error: "Keine Verbindung. Bitte Netz prüfen und erneut versuchen.",
    };
  }
}

/* -------------------------------------------------------------------------
   Kundensicht
   ------------------------------------------------------------------------- */

export function fetchPublicTicket(
  ticketCode: string,
  signal?: AbortSignal,
): Promise<ApiResult<{ ticket: PublicTicket }>> {
  return request(`/api/status/${encodeURIComponent(ticketCode)}`, { signal });
}

export interface RegistrationPayload {
  query: string;
  customer: string;
  phone: string;
  email: string;
  imei: string;
  customerNote: string;
  contactChannel: string;
  consent: true;
}

export function registerTicket(
  payload: RegistrationPayload,
): Promise<ApiResult<{ ticketCode: string; statusPath: string }>> {
  return request("/api/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* -------------------------------------------------------------------------
   Werkstatt
   ------------------------------------------------------------------------- */

export interface StaffInfo {
  email: string;
  displayName: string | null;
}

export interface WorkshopListResponse {
  items: TicketListItem[];
  total: number;
  stats: TicketStats;
  staff: StaffInfo;
  notifications: { missing: { channel: NotificationChannelId; requires: readonly string[] }[] };
}

export interface WorkshopQuery {
  search?: string;
  statuses?: TicketStatus[];
  sort?: string;
  limit?: number;
  offset?: number;
}

export function fetchWorkshopTickets(
  query: WorkshopQuery,
  signal?: AbortSignal,
): Promise<ApiResult<WorkshopListResponse>> {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.statuses && query.statuses.length > 0) {
    params.set("status", query.statuses.join(","));
  }
  if (query.sort) params.set("sort", query.sort);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));

  const suffix = params.toString();
  return request(`/api/werkstatt/tickets${suffix ? `?${suffix}` : ""}`, { signal });
}

export function fetchWorkshopTicket(
  ticketCode: string,
  signal?: AbortSignal,
): Promise<ApiResult<{ ticket: RepairTicket; history: TicketHistoryEntry[] }>> {
  return request(`/api/werkstatt/tickets/${encodeURIComponent(ticketCode)}`, { signal });
}

export interface TicketPatch {
  status?: TicketStatus;
  note?: string;
  internalNotes?: string;
  estimatedReadyAt?: string | null;
}

export function patchTicket(
  ticketCode: string,
  patch: TicketPatch,
): Promise<
  ApiResult<{
    ticket: RepairTicket;
    history: TicketHistoryEntry[];
    notified: string | null;
  }>
> {
  return request(`/api/status/${encodeURIComponent(ticketCode)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function login(
  email: string,
  password: string,
): Promise<ApiResult<{ staff: StaffInfo }>> {
  return request("/api/werkstatt/session", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<ApiResult<Record<string, never>>> {
  return request("/api/werkstatt/session", { method: "DELETE" });
}
