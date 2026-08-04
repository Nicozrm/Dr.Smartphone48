/*
  E-Mail über Resend – derselbe Anbieter und dieselben Variablen wie im
  Kontaktformular (`app/api/kontakt/route.ts`). Zwei Konten für zwei Zwecke
  wären zwei Rechnungen und zwei Stellen, an denen ein Schlüssel abläuft.
*/

import { site } from "@/lib/site";
import type {
  NotificationAdapter,
  NotificationMessage,
  NotificationResult,
} from "../types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Der Rumpf als schlichtes HTML.
 *
 * Kein Layout, keine Bilder, keine Zählpixel: Eine Statusmeldung ist eine
 * Nachricht, keine Kampagne. Der Text wird escaped – er enthält den Namen des
 * Kunden und den Vermerk der Werkstatt, beides Freitext.
 */
function toHtml(message: NotificationMessage): string {
  const paragraphs = message.text
    .split("\n\n")
    .map((block) => `<p style="margin:0 0 14px">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#141517">
${paragraphs}
<p style="margin:0 0 14px"><a href="${escapeHtml(message.statusUrl)}" style="color:#2456e6">Vorgang ${escapeHtml(message.ticketCode)} ansehen</a></p>
<hr style="border:none;border-top:1px solid #e5e5e2;margin:22px 0">
<p style="margin:0;font-size:13px;color:#5b5f64">${escapeHtml(site.name)} · ${escapeHtml(site.street)}, ${escapeHtml(site.zip)} ${escapeHtml(site.city)} · ${escapeHtml(site.phone)}</p>
</div>`;
}

export const emailAdapter: NotificationAdapter = {
  id: "email",
  name: "E-Mail (Resend)",
  requires: ["RESEND_API_KEY", "CONTACT_FROM"],

  isConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM);
  },

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM,
          to: [message.to],
          reply_to: site.email,
          subject: message.subject,
          text: `${message.text}\n\n${message.statusUrl}`,
          html: toHtml(message),
        }),
      });

      if (!response.ok) {
        return { ok: false, channel: "email", error: `Resend antwortete mit ${response.status}` };
      }
      return { ok: true, channel: "email" };
    } catch (error) {
      return {
        ok: false,
        channel: "email",
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    }
  },
};
