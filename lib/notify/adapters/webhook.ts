/*
  Der anbieterfreie Weg: ein HTTP-Aufruf an eine konfigurierte Adresse.

  Warum kein fertiger WhatsApp- oder SMS-Anbieter fest eingebaut ist: Diese
  Dienste unterscheiden sich in Preis, Vertragslage und Verfügbarkeit von Land
  zu Land, und ein Betrieb wechselt sie. Wäre einer davon hier verdrahtet,
  hinge der Wechsel an einem Deployment.

  Stattdessen schickt dieser Adapter eine schlichte JSON-Nachricht an eine
  Adresse aus der Umgebung. Dahinter kann alles stehen: eine Twilio-Funktion,
  ein n8n-Ablauf, die WhatsApp Cloud API mit einer Zeile Umschreibung, ein
  eigener Dienst. Was dieses Projekt liefert, ist der Auslöser und die Nutzlast
  – nicht die Wahl des Anbieters.

  Die Nutzlast ist absichtlich flach und stabil:

    { "kanal": "whatsapp", "an": "+49…", "betreff": "…", "text": "…",
      "vorgang": "K7M2-B94X", "status": "ready_for_pickup", "url": "https://…" }
*/

import type {
  NotificationAdapter,
  NotificationChannelId,
  NotificationMessage,
  NotificationResult,
} from "../types";

/** Wie lange auf den Dienst gewartet wird, bevor abgebrochen wird. */
const TIMEOUT_MS = 5_000;

export function createWebhookAdapter(options: {
  id: NotificationChannelId;
  name: string;
  /** Name der Umgebungsvariable mit der Zieladresse. */
  urlVar: string;
  /** Name der Umgebungsvariable mit dem optionalen Token (Bearer). */
  tokenVar: string;
}): NotificationAdapter {
  const { id, name, urlVar, tokenVar } = options;

  return {
    id,
    name,
    requires: [urlVar],

    isConfigured() {
      const url = process.env[urlVar];
      return Boolean(url && /^https:\/\//.test(url));
    },

    async send(message: NotificationMessage): Promise<NotificationResult> {
      const url = process.env[urlVar];
      if (!url) return { ok: false, channel: id, error: `${urlVar} fehlt` };

      const token = process.env[tokenVar];
      // Ohne Zeitgrenze hinge ein Statuswechsel im Dashboard so lange, wie der
      // fremde Dienst braucht. Fünf Sekunden sind großzügig; danach gilt die
      // Nachricht als nicht zugestellt und steht so im Protokoll.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            kanal: id,
            an: message.to,
            betreff: message.subject,
            text: message.text,
            vorgang: message.ticketCode,
            status: message.status,
            url: message.statusUrl,
          }),
        });

        if (!response.ok) {
          return { ok: false, channel: id, error: `Dienst antwortete mit ${response.status}` };
        }
        return { ok: true, channel: id };
      } catch (error) {
        const reason =
          error instanceof Error && error.name === "AbortError"
            ? `Zeitüberschreitung nach ${TIMEOUT_MS} ms`
            : error instanceof Error
              ? error.message
              : "Unbekannter Fehler";
        return { ok: false, channel: id, error: reason };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const whatsappAdapter = createWebhookAdapter({
  id: "whatsapp",
  name: "WhatsApp (eigener Endpunkt)",
  urlVar: "NOTIFY_WHATSAPP_WEBHOOK",
  tokenVar: "NOTIFY_WHATSAPP_TOKEN",
});

export const smsAdapter = createWebhookAdapter({
  id: "sms",
  name: "SMS (eigener Endpunkt)",
  urlVar: "NOTIFY_SMS_WEBHOOK",
  tokenVar: "NOTIFY_SMS_TOKEN",
});
