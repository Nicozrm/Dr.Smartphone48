import { NextResponse } from "next/server";
import { site } from "@/lib/site";
import { getAdminClient } from "@/lib/supabase/admin";
import { werkstattbrief01 } from "@/lib/newsletter/werkstattbrief-01";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECIPIENT_PAGE_SIZE = 200;

type AuthUser = {
  id: string;
  email?: string;
  last_sign_in_at?: string | null;
};

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function isWednesdayAtSixInBerlin(date = new Date()): boolean {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return parts.weekday === "Wed" && parts.hour === "18";
}

async function listLoggedInStaffRecipients(): Promise<string[]> {
  const client = getAdminClient();
  if (!client) throw new Error("Supabase Admin Client ist nicht konfiguriert.");

  const { data: staffRows, error: staffError } = await client
    .from("workshop_staff")
    .select("user_id");

  if (staffError) throw staffError;

  const staffIds = new Set((staffRows ?? []).map((row) => row.user_id));
  const recipients = new Set<string>();

  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: RECIPIENT_PAGE_SIZE,
    });
    if (error) throw error;

    const users = (data.users ?? []) as AuthUser[];
    for (const user of users) {
      if (staffIds.has(user.id) && user.email && user.last_sign_in_at) {
        recipients.add(user.email.toLowerCase());
      }
    }

    if (users.length < RECIPIENT_PAGE_SIZE) break;
  }

  return [...recipients].sort();
}

async function sendNewsletter(to: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  if (!key || !from) return { ok: false, error: "Resend ist nicht konfiguriert." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: site.email,
        subject: werkstattbrief01.subject,
        text: werkstattbrief01.text,
        html: werkstattbrief01.html,
      }),
    });

    if (!response.ok) return { ok: false, error: `Resend antwortete mit ${response.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" };
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  }

  if (!isWednesdayAtSixInBerlin()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Außerhalb Mittwoch 18 Uhr Europe/Berlin." });
  }

  try {
    const recipients = await listLoggedInStaffRecipients();
    let failed = 0;
    const errors = new Set<string>();

    for (const to of recipients) {
      const result = await sendNewsletter(to);
      if (!result.ok) {
        failed += 1;
        errors.add(result.error);
      }
    }

    const status = failed > 0 ? 207 : 200;
    return NextResponse.json(
      { ok: failed === 0, sent: recipients.length - failed, failed, errors: [...errors] },
      { status },
    );
  } catch (error) {
    console.error("[cron] Werkstattbrief", error);
    return NextResponse.json(
      { ok: false, error: "Werkstattbrief konnte nicht versendet werden." },
      { status: 500 },
    );
  }
}
