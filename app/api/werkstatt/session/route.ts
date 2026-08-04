/**
 * Die Anmeldung der Werkstatt.
 *
 * Kein eigenes Konten-System: Die Konten liegen in Supabase Auth, die
 * Freischaltung in `workshop_staff`. Beides zusammen heißt, dass ein Zugang
 * zwei Dinge braucht – ein Passwort und einen Eintrag, den nur jemand mit
 * Datenbankzugriff setzen kann. Ein Dashboard, an dem man sich selbst
 * freischalten kann, ist keins.
 *
 * Das Passwort wandert einmal durch diese Route und nirgendwo sonst hin: Es
 * wird nicht protokolliert, nicht zwischengespeichert und nicht an den Client
 * zurückgegeben. Zurück kommt eine Sitzung in Cookies, die `@supabase/ssr`
 * setzt.
 */

import { createSessionClient, requireStaff } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";
import { fail, noBackend, ok, readJson, serverError } from "@/lib/api/respond";
import { cleanLine, LIMITS } from "@/lib/tickets/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zehn Versuche in zehn Minuten.
 *
 * Supabase bremst selbst, aber erst weiter oben und pro Projekt. Diese Grenze
 * sitzt vor dem Auth-Server und macht das Durchprobieren eines Passworts von
 * einer Adresse aus unbrauchbar langsam.
 */
const LOGIN_LIMIT = { scope: "werkstatt-anmeldung", limit: 10, windowMs: 10 * 60 * 1000 };

/** Wer ist angemeldet? Vom Dashboard beim Start gefragt. */
export async function GET() {
  const session = await requireStaff();
  if (!session.ok) {
    if (session.reason === "kein-backend") return noBackend();
    return fail(
      session.reason === "nicht-angemeldet"
        ? "Nicht angemeldet."
        : "Dieses Konto ist nicht für die Werkstatt freigeschaltet.",
      session.reason === "nicht-angemeldet" ? 401 : 403,
    );
  }
  return ok({ staff: { email: session.staff.email, displayName: session.staff.displayName } });
}

export async function POST(request: Request) {
  const verdict = rateLimit(clientKey(request), LOGIN_LIMIT);
  if (verdict.limited) {
    return fail("Zu viele Anmeldeversuche. Bitte später erneut versuchen.", 429);
  }

  const client = await createSessionClient();
  if (!client) return noBackend();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  const email = cleanLine(body?.email, LIMITS.email).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return fail("Bitte E-Mail und Passwort angeben.", 422);
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    // Bewusst dieselbe Meldung für „Konto unbekannt" und „Passwort falsch".
    // Alles andere verrät, welche Adressen existieren.
    if (error || !data.user) {
      return fail("E-Mail oder Passwort stimmt nicht.", 401);
    }

    const { data: staff } = await client
      .from("workshop_staff")
      .select("user_id, display_name")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!staff) {
      // Echtes Konto, aber nicht freigeschaltet: Die Sitzung wird sofort
      // wieder beendet, damit im Browser kein Token liegen bleibt, das
      // irgendwann doch etwas darf.
      await client.auth.signOut();
      return fail("Dieses Konto ist nicht für die Werkstatt freigeschaltet.", 403);
    }

    return ok({
      staff: { email: data.user.email ?? email, displayName: staff.display_name },
    });
  } catch (error) {
    return serverError("Anmeldung", error);
  }
}

export async function DELETE() {
  const client = await createSessionClient();
  if (!client) return noBackend();
  await client.auth.signOut();
  return ok({ abgemeldet: true });
}
