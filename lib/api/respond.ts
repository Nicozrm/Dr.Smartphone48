/*
  Antworten – eine Form für alle Endpunkte.

  Der Client muss nie raten, was er bekommt: `ok: true` und Nutzlast, oder
  `ok: false` mit einem Satz, den man einem Menschen zeigen kann. Dieselbe
  Form wie beim Kontaktformular (`app/api/kontakt/route.ts`), damit die
  Fehlerbehandlung im Browser überall gleich aussieht.

  Der zweite Zweck steht in `serverError`: **Interne Meldungen verlassen den
  Server nicht.** Was Postgres schreibt, enthält Spaltennamen, Bedingungen und
  gelegentlich Werte – nichts davon gehört in eine Antwort. Nach draußen geht
  ein Satz, ins Protokoll die Ursache.
*/

import { NextResponse } from "next/server";
import type { FieldIssue } from "@/lib/tickets/validate";

export interface ApiError {
  ok: false;
  error: string;
  /** Feldbezogene Befunde, falls die Prüfung sie geliefert hat. */
  issues?: FieldIssue[];
}

export function ok<T extends object>(payload: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...payload }, { status });
}

export function fail(
  error: string,
  status: number,
  issues?: FieldIssue[],
): NextResponse {
  const body: ApiError = { ok: false, error };
  if (issues && issues.length > 0) body.issues = issues;
  return NextResponse.json(body, { status });
}

/** 503 – die Website läuft, das Backend ist nicht eingerichtet. */
export function noBackend(): NextResponse {
  return fail(
    "Die Vorgangsverwaltung ist auf dieser Installation nicht eingerichtet.",
    503,
  );
}

/**
 * 500 – etwas ist schiefgegangen, und der Grund bleibt hier.
 *
 * `console.error` ist auf allen drei Zielen dieses Projekts die Stelle, an der
 * die Meldung landet: Vercel-Logs, Cloudflare-`wrangler tail`, lokale Konsole.
 */
export function serverError(context: string, cause: unknown): NextResponse {
  console.error(`[api] ${context}`, cause);
  return fail("Das hat gerade nicht geklappt. Bitte später erneut versuchen.", 500);
}

/** Liest den JSON-Rumpf, ohne bei kaputter Nutzlast zu werfen. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Der Origin der Anfrage – für Adressen in Nachrichten und QR-Codes.
 *
 * Bewusst aus `x-forwarded-*` bzw. der Anfrage-URL und nicht aus einer
 * Umgebungsvariablen: Dieselbe Instanz beantwortet Vorschau-Deployments und
 * die Wunschdomain, und eine Nachricht, die auf die falsche Domain zeigt, ist
 * eine Nachricht ohne Link.
 */
export function originOf(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost.split(",")[0]!.trim()}`;
  }
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}
