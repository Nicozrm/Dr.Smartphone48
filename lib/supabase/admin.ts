/*
  Der Zugang mit vollen Rechten – ausschließlich serverseitig.

  Die Service-Role umgeht Row Level Security. Ihr Schlüssel ist damit das
  Generalschlüssel-Äquivalent des Projekts, und für ihn gilt genau eine Regel:
  Er darf den Server nie verlassen. Deshalb heißt die Variable
  `SUPABASE_SERVICE_ROLE_KEY` und nicht `NEXT_PUBLIC_…` – Next.js liefert nur
  Letzteres an den Browser aus.

  Damit das keine Frage der Disziplin bleibt, steht unten eine Sperre: Wird
  dieses Modul versehentlich in eine Client-Komponente gezogen, bricht es beim
  ersten Aufruf ab, statt still den Schlüssel mitzuliefern.

  Wofür der Zugang gebraucht wird, ist eine kurze Liste:

  – Die Statusseite lesen. Für Kunden gibt es keine Policy (in den Zeilen
    stehen Namen und Telefonnummern), also liest der Server und redigiert
    vorher.
  – Einen Vorgang anlegen. Ein Insert-Recht für `anon` wäre eine Einladung,
    die Datenbank mit Müll zu füllen; stattdessen prüft und begrenzt die API.

  Alles andere – das ganze Dashboard – läuft über die Anmeldung des Personals
  und die Policies.
*/

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import { SUPABASE_URL } from "./env";

export type AdminClient = SupabaseClient<Database>;

let cached: AdminClient | null = null;

/** Ist der serverseitige Zugang vollständig konfiguriert? */
export function hasAdminClient(): boolean {
  return SUPABASE_URL.length > 0 && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}

/**
 * Gibt den Zugang zurück – oder `null`, wenn kein Projekt hinterlegt ist.
 *
 * Bewusst kein Werfen: „Kein Backend" ist auf dieser Website ein zulässiger
 * Zustand, kein Fehler. Die aufrufende Route antwortet dann mit 503 und einem
 * Satz, der erklärt, was fehlt.
 */
export function getAdminClient(): AdminClient | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/supabase/admin darf nur auf dem Server laufen – der Service-Role-Schlüssel gehört nicht in den Browser.",
    );
  }
  if (cached) return cached;
  if (!hasAdminClient()) return null;

  cached = createClient<Database>(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        // Kein Sitzungszustand: Dieser Zugang gehört keinem Menschen.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-anwendung": "drsmartphone48-werkstatt" },
      },
    },
  );
  return cached;
}
