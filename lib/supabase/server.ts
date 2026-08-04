/*
  Der angemeldete Zugang – die Sitzung des Werkstattpersonals.

  Anders als `admin.ts` hat dieser Client keine Sonderrechte. Er trägt das
  Token der angemeldeten Person, und was sie sehen darf, entscheiden die
  Policies in der Datenbank. Das ist die Trennung, auf der die ganze
  Werkstattansicht steht: Ein Fehler in einer Abfrage kann hier keine fremden
  Daten preisgeben, weil die Abfrage sie gar nicht erst bekommt.

  Die Sitzung liegt in Cookies, die `@supabase/ssr` setzt und liest. Sie sind
  bewusst nicht `httpOnly`: Der Browser-Client braucht dasselbe Token, um den
  Realtime-Kanal der Werkstatt zu öffnen. Der Schutz liegt nicht in der
  Unlesbarkeit des Tokens, sondern darin, dass es nur so viel kann wie die
  Person, der es gehört – und dass es nach einer Stunde abläuft.

  Ohne Middleware (die verträgt sich nicht mit `output: "export"`) erneuert
  der Browser-Client das Token selbst und schreibt es in dieselben Cookies
  zurück. Die Route-Handler lesen es beim nächsten Aufruf.
*/

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasPublicBackend } from "./env";

export type SessionClient = SupabaseClient<Database>;

/**
 * Client mit der Sitzung aus den Cookies. `null`, wenn kein Projekt
 * hinterlegt ist.
 *
 * `setAll` steht in einem try/catch: In einer Server-Komponente sind die
 * Cookies schreibgeschützt. Der Aufruf ist dort trotzdem sinnvoll (das Lesen
 * funktioniert), nur das Zurückschreiben eines erneuerten Tokens muss warten,
 * bis wieder ein Route-Handler dran ist.
 */
export async function createSessionClient(): Promise<SessionClient | null> {
  if (!hasPublicBackend()) return null;
  const store = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Schreibgeschützter Kontext – siehe oben.
        }
      },
    },
  });
}

export interface StaffSession {
  userId: string;
  /** Für die Historie: Wer den Wechsel ausgelöst hat. */
  email: string;
  displayName: string | null;
}

export type StaffResult =
  | { ok: true; client: SessionClient; staff: StaffSession }
  | { ok: false; reason: "kein-backend" | "nicht-angemeldet" | "nicht-freigeschaltet" };

/**
 * Die einzige Stelle, an der „ist das die Werkstatt?" beantwortet wird.
 *
 * Zwei Prüfungen, beide nötig: `getUser()` fragt den Auth-Server, ob das
 * Token echt ist – im Gegensatz zu `getSession()`, das nur den Cookie-Inhalt
 * wiedergibt und damit alles glaubt, was im Browser steht. Danach entscheidet
 * der Eintrag in `workshop_staff`, ob dieses echte Konto auch hierher gehört.
 */
export async function requireStaff(): Promise<StaffResult> {
  const client = await createSessionClient();
  if (!client) return { ok: false, reason: "kein-backend" };

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { ok: false, reason: "nicht-angemeldet" };

  const { data: staff } = await client
    .from("workshop_staff")
    .select("user_id, display_name")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!staff) return { ok: false, reason: "nicht-freigeschaltet" };

  return {
    ok: true,
    client,
    staff: {
      userId: data.user.id,
      email: data.user.email ?? data.user.id,
      displayName: staff.display_name,
    },
  };
}
