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

  Private Kanäle brauchen ein Token; `setAuth()` reicht das aktuelle nach –
  für Kunden das des öffentlichen Schlüssels, für die Werkstatt das der
  Anmeldung.
*/

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";
import { STATUS_EVENT, isStatusBroadcast, type StatusBroadcast } from "./topics";

export type ChannelState = "aus" | "verbindet" | "verbunden" | "gestoert";

/**
 * Abonniert ein Thema und ruft `onStatus` bei jedem Rundruf.
 *
 * `topic === null` heißt: nicht abonnieren (kein Backend, kein Code, Seite
 * noch nicht bereit). Der Zustand bleibt dann `aus`.
 */
export function useStatusChannel(
  topic: string | null,
  onStatus: (payload: StatusBroadcast) => void,
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

    const client = getBrowserClient();
    if (!client) {
      setState("aus");
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    setState("verbindet");

    const start = async () => {
      // Ohne aktuelles Token weist der Server private Kanäle ab. Bei Kunden
      // ist es das des öffentlichen Schlüssels, in der Werkstatt das der
      // Anmeldung – `setAuth` ohne Argument nimmt, was gerade gilt.
      await client.realtime.setAuth();
      if (cancelled) return;

      channel = client
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: STATUS_EVENT }, (message) => {
          if (cancelled) return;
          if (isStatusBroadcast(message.payload)) handler.current(message.payload);
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
      if (channel) void client.removeChannel(channel);
    };
  }, [topic]);

  return state;
}
