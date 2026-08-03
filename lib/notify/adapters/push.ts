/*
  Push – vorbereitet, nicht behauptet.

  Web Push braucht zwei Dinge, die dieses Projekt bewusst noch nicht hat: die
  ausdrückliche Erlaubnis im Browser und eine gespeicherte Subscription je
  Gerät. Der Service Worker (`public/sw.js`) liegt bereits, der Rest ist eine
  Entscheidung des Betriebs – Push heißt, dass die Website etwas auf einem
  fremden Bildschirm auslösen darf.

  Der Adapter ist trotzdem da und vollständig: Er schickt dieselbe Nutzlast wie
  die anderen Wege an einen konfigurierten Dienst, der die VAPID-Signatur und
  die Subscriptions verwaltet. Damit ist die Zustellschicht vollständig, ohne
  dass irgendwo behauptet wird, es gäbe schon Push.

  `isConfigured()` bleibt so lange falsch, bis `NOTIFY_PUSH_WEBHOOK` gesetzt
  ist – und der Kunde kann Push in der Anmeldung gar nicht erst wählen (siehe
  `ContactChannel`). Beides zusammen heißt: Diese Zeilen versprechen nichts.
*/

import { createWebhookAdapter } from "./webhook";

export const pushAdapter = createWebhookAdapter({
  id: "push",
  name: "Push (eigener Endpunkt)",
  urlVar: "NOTIFY_PUSH_WEBHOOK",
  tokenVar: "NOTIFY_PUSH_TOKEN",
});
