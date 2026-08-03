"use client";

/*
  Der Zugang im Browser – für genau eine Aufgabe: zuhören.

  Gelesen und geschrieben wird über die API. Was der Browser direkt mit
  Supabase spricht, ist der Realtime-Kanal, und darüber laufen vier Felder:
  Vorgangscode, Zustand und zwei Zeitstempel. Nichts Personenbezogenes –
  siehe den Trigger in `supabase/migrations/*_realtime.sql`.

  Der Schlüssel hier ist der öffentliche. Er verleiht die Rechte der Rolle
  `anon`, und die hat auf den Vorgangstabellen keine einzige Policy. Wer ihn
  aus dem Quelltext liest, kann damit nichts abfragen.

  Ein Client pro Seite (Modul-Singleton): Jeder Aufruf von `createBrowserClient`
  öffnet eine eigene Realtime-Verbindung. Zwei Komponenten, die beide zuhören,
  ergäben sonst zwei WebSockets, zwei Anmeldungen und am Ende zwei Aufräum-
  Pflichten, von denen eine vergessen wird.
*/

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasPublicBackend } from "./env";

export type BrowserClient = SupabaseClient<Database>;

let cached: BrowserClient | null = null;

/** `null`, solange kein Projekt hinterlegt ist – dann bleibt die Seite still. */
export function getBrowserClient(): BrowserClient | null {
  if (!hasPublicBackend()) return null;
  cached ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
