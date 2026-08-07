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

  ---------------------------------------------------------------------------
  Warum der Import unten dynamisch ist

  `@supabase/ssr` samt Realtime wiegt rund 60 kB – auf der Statusseite mehr
  als die halbe Startlast. Statisch importiert läge das Paket im kritischen
  Pfad **der einen Seite, die ein Kunde am Tresen per QR-Code öffnet**, oft im
  überlasteten Innenstadtnetz.

  Gebraucht wird es dort aber erst als Zweites. Der erste Blick auf den
  Vorgang kommt über einen einzigen Abruf der API; zuhören muss die Seite erst,
  wenn sie schon steht. Genau diese Reihenfolge stellt der dynamische Import
  her: Erst rendern, dann verbinden.

  Ein Client pro Seite (Modul-Singleton): Jeder Aufruf von `createBrowserClient`
  öffnet eine eigene Realtime-Verbindung. Zwei Komponenten, die beide zuhören,
  ergäben sonst zwei WebSockets, zwei Anmeldungen und am Ende zwei Aufräum-
  Pflichten, von denen eine vergessen wird. Das gilt auch nebenläufig: Fragen
  zwei Komponenten gleichzeitig, bekommen beide **dasselbe** Versprechen und
  damit denselben Client – deshalb wird das Versprechen zwischengespeichert,
  nicht erst sein Ergebnis.
*/

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasPublicBackend } from "./env";

export type BrowserClient = SupabaseClient<Database>;

let pending: Promise<BrowserClient> | null = null;

/**
 * Der Client, sobald er geladen ist. `null`, solange kein Projekt hinterlegt
 * ist – dann bleibt die Seite still, und das Paket wird nie geholt.
 */
export async function getBrowserClient(): Promise<BrowserClient | null> {
  if (!hasPublicBackend()) return null;

  pending ??= import("@supabase/ssr").then(({ createBrowserClient }) =>
    createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY),
  );

  try {
    return await pending;
  } catch {
    // Netzabbruch beim Nachladen: Die Seite bleibt bedienbar, nur ohne
    // Selbstaktualisierung. Beim nächsten Versuch wird neu geladen.
    pending = null;
    return null;
  }
}
