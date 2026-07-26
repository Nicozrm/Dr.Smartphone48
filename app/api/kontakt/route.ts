import { NextResponse } from "next/server";
import { site } from "@/lib/site";

/**
 * Serverseitiger Empfang des Kontaktformulars.
 *
 * Der Besucher sieht nie interne Technik: Bei Erfolg kommt eine schlichte
 * Bestätigung, bei fehlender Konfiguration ein Hinweis mit Fallback-Kennung,
 * auf die der Client mit einem E-Mail-Entwurf reagiert. Es geht nie eine
 * Nachricht verloren.
 *
 * Versand über Resend, sobald RESEND_API_KEY gesetzt ist:
 *   RESEND_API_KEY   API-Key
 *   CONTACT_TO       Zieladresse (Standard: site.email)
 *   CONTACT_FROM     verifizierter Absender der Domain
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE = 5000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Einfache In-Memory-Bremse gegen Massenversand pro Instanz. */
const hits = new Map<string, { n: number; until: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now > cur.until) {
    hits.set(ip, { n: 1, until: now + WINDOW_MS });
    return false;
  }
  cur.n += 1;
  return cur.n > LIMIT;
}

function clean(v: FormDataEntryValue | null, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: ein für Menschen unsichtbares Feld. Bots füllen es aus.
  // Wir antworten bewusst mit Erfolg, damit der Bot nichts lernt.
  if (clean(form.get("website"))) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(form.get("name"), 120);
  const email = clean(form.get("email"), 160);
  const phone = clean(form.get("phone"), 60);
  const device = clean(form.get("device"), 120);
  const topic = clean(form.get("topic"), 60);
  const message = clean(form.get("message"), MAX_MESSAGE);
  const consent = clean(form.get("consent"), 10);

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Bitte Namen angeben.";
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) errors.email = "Bitte gültige E-Mail angeben.";
  if (message.length < 10) errors.message = "Bitte beschreiben Sie Ihr Anliegen kurz.";
  if (consent !== "on" && consent !== "true") errors.consent = "Bitte der Verarbeitung zustimmen.";

  const image = form.get("image");
  let attachment: { filename: string; content: string } | null = null;
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      errors.image = "Nur Bilddateien erlaubt.";
    } else if (image.size > MAX_IMAGE_BYTES) {
      errors.image = "Bild ist größer als 5 MB.";
    } else {
      const buf = Buffer.from(await image.arrayBuffer());
      attachment = {
        filename: image.name.replace(/[^\w.\-]/g, "_").slice(0, 80) || "foto.jpg",
        content: buf.toString("base64"),
      };
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const to = process.env.CONTACT_TO || site.email;
  const from = process.env.CONTACT_FROM;
  const key = process.env.RESEND_API_KEY;

  const subject = `Anfrage über die Website${device ? ` – ${device}` : ""}`;
  const html = `
    <h2>Neue Anfrage über ${escapeHtml(site.name)}</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif">
      <tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><b>E-Mail</b></td><td>${escapeHtml(email)}</td></tr>
      ${phone ? `<tr><td><b>Telefon</b></td><td>${escapeHtml(phone)}</td></tr>` : ""}
      ${device ? `<tr><td><b>Gerät</b></td><td>${escapeHtml(device)}</td></tr>` : ""}
      ${topic ? `<tr><td><b>Anliegen</b></td><td>${escapeHtml(topic)}</td></tr>` : ""}
    </table>
    <p style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(message)}</p>
  `;

  if (!key || !from) {
    // Noch kein Versandkonto hinterlegt: ehrlich melden, damit der Client
    // einen fertigen E-Mail-Entwurf öffnen kann.
    return NextResponse.json(
      { ok: false, fallback: true, error: "E-Mail-Versand ist noch nicht eingerichtet." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        html,
        ...(attachment ? { attachments: [attachment] } : {}),
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, fallback: true, error: "Versand fehlgeschlagen." },
      { status: 502 },
    );
  }
}
