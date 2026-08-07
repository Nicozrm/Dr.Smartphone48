"use client";

/*
  Zuhören – einmal, sauber, und mit einem Aufräumen, das wirklich aufräumt.

  Der Haken an Realtime in React ist immer derselbe: Ein Effekt, der bei jedem
  Rendern neu abonniert, weil eine Rückruffunktion in seinen Abhängigkeiten
  steht. Das Ergebnis sind zwei, drei, fünf offene Kanäle, doppelte
  Aktualisierungen und ein WebSocket, der nach dem Verlassen der Seite weiter
  spricht.

  Drei Vorkehrungen dagegen:

  1. **Die Rückruffunktion steht in einem Ref**, nicht in den Abhängigkeiten.
     Der Effekt hängt nur am Thema. Wer aufhört zuzuhören, ist damit immer
     genau der, der angefangen hat.
  2. **Ein Kanal je Thema, aufgeräumt in `removeChannel`.** `unsubscribe`
     allein lässt den Kanal im Client stehen; beim nächsten `channel()` mit
     demselben Namen bekommt man dann den alten zurück.
  3. **Ein Abbruchvermerk.** `subscribe` ist asynchron. Wird die Komponente
     ausgehängt, während die Anmeldung läuft, würde ein später eintreffender
     Zustand sonst noch `setState` aufrufen.

  Die Kanäle sind öffentlich. Warum das hier sicher ist und was stattdessen
  schützt, steht ausführlich in
  `supabase/migrations/*_repair_tickets_realtime.sql`; kurz: Themennamen lassen
  sich nicht durchsuchen, der Kundenkanal heißt nach dem Vorgangscode, und der
  öffentlich benannte Werkstattkanal trägt nichts als einen Zeitstempel.

  `setAuth()` bleibt trotzdem stehen. Es kostet nichts, hält das Token frisch
  und ist die eine Zeile, die zusätzlich nötig wäre, falls die Kanäle je auf
  privat umgestellt werden.
*/

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";
import { STATUS_EVENT } from "./topics";

export type ChannelState = "aus" | "verbindet" | "verbunden" | "gestoert";

/**
 * Abonniert ein Thema und ruft `onStatus` bei jedem Rundruf.
 *
 * Die Nutzlast kommt als `unknown` heraus, und das ist Absicht: Auf den beiden
 * Themen liegen verschiedene Formen (der Kundenkanal trägt den Zustand, der
 * Werkstattkanal nur einen Zeitstempel), und beide kommen aus dem Netz. Wer
 * sie braucht, prüft sie – `isStatusBroadcast` in `topics.ts`. Wer sie
 * ignoriert, nimmt eine Rückruffunktion ohne Parameter.
 *
 * `topic === null` heißt: nicht abonnieren (kein Backend, kein Code, Seite
 * noch nicht bereit). Der Zustand bleibt dann `aus`.
 */
export function useStatusChannel(
  topic: string | null,
  onStatus: (payload: unknown) => void,
): ChannelState {
  const [state, setState] = useState<ChannelState>("aus");
  const handler = useRef(onStatus);

  // Immer die frische Rückruffunktion, ohne den Effekt anzufassen. Bewusst in
  // einem Effekt und nicht während des Renderns: React darf ein Rendern
  // verwerfen, und eine dabei gesetzte Referenz bliebe stehen.
  useEffect(() => {
    handler.current = onStatus;
  });

  useEffect(() => {
    if (!topic) {
      setState("aus");
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let client: Awaited<ReturnType<typeof getBrowserClient>> = null;

    setState("verbindet");

    const start = async () => {
      // Der Realtime-Client wird erst hier geholt (dynamischer Import, siehe
      // `lib/supabase/browser.ts`). Bis er da ist, steht die Seite bereits.
      client = await getBrowserClient();
      if (cancelled) return;
      if (!client) {
        setState("aus");
        return;
      }

      // `setAuth` ohne Argument nimmt das Token, das gerade gilt – beim Kunden
      // das des öffentlichen Schlüssels, in der Werkstatt das der Anmeldung.
      await client.realtime.setAuth();
      if (cancelled) return;

      channel = client
        .channel(topic)
        .on("broadcast", { event: STATUS_EVENT }, (message) => {
          if (cancelled) return;
          handler.current(message.payload);
        })
        .subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") setState("verbunden");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setState("gestoert");
          else if (status === "CLOSED") setState("aus");
        });
    };

    void start();

    return () => {
      cancelled = true;
      // Beides kann noch fehlen, wenn die Komponente aushängt, während das
      // Paket lädt – dann gibt es auch nichts abzuräumen.
      if (channel && client) void client.removeChannel(channel);
    };
  }, [topic]);

  return state;
}
