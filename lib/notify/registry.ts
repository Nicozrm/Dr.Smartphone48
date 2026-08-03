/*
  Das Verzeichnis der Wege.

  Eine Zeile je Kanal, mehr nicht. Ein neuer Weg heißt: Adapter schreiben,
  hier eintragen, fertig – weder `dispatch.ts` noch die API-Route noch die
  Oberfläche müssen davon erfahren.
*/

import { emailAdapter } from "./adapters/email";
import { pushAdapter } from "./adapters/push";
import { smsAdapter, whatsappAdapter } from "./adapters/webhook";
import type { NotificationAdapter, NotificationChannelId } from "./types";

const adapters: Record<NotificationChannelId, NotificationAdapter> = {
  email: emailAdapter,
  whatsapp: whatsappAdapter,
  sms: smsAdapter,
  push: pushAdapter,
};

export function getAdapter(channel: NotificationChannelId): NotificationAdapter {
  return adapters[channel];
}

/** Alle Wege, die gerade tatsächlich zustellen könnten. */
export function configuredChannels(): NotificationChannelId[] {
  return (Object.keys(adapters) as NotificationChannelId[]).filter((id) =>
    adapters[id].isConfigured(),
  );
}

/**
 * Für die Einrichtung: was jedem noch nicht nutzbaren Weg fehlt.
 * Wird im Dashboard angezeigt, damit niemand raten muss, warum ein Kunde
 * keine Nachricht bekommen hat.
 */
export function missingConfiguration(): { channel: NotificationChannelId; requires: readonly string[] }[] {
  return (Object.keys(adapters) as NotificationChannelId[])
    .filter((id) => !adapters[id].isConfigured())
    .map((id) => ({ channel: id, requires: adapters[id].requires }));
}
