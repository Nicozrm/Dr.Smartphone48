"use client";

/*
  Die Liste der Vorgänge als Zustand – mit allem, was daran fehleranfällig ist,
  an einer Stelle.

  Vier Dinge gehen hier leicht kaputt, und gegen jedes steht eine Vorkehrung:

  – **Wettlauf beim Tippen.** Wer „Sam" tippt, löst drei Anfragen aus, und die
    zweite kann nach der dritten ankommen. Deshalb wird entprellt (300 ms)
    **und** jede vorherige Anfrage abgebrochen. Der Abbruch ist der wichtigere
    Teil: Entprellen allein verkleinert das Fenster nur.
  – **Doppelte Anfragen durch den Rundruf.** Setzt jemand drei Zustände
    hintereinander, kommen drei Rundrufe. Ein eigener Timer bündelt sie zu
    einer Nachladung.
  – **Zustand nach dem Aushängen.** Jede Antwort prüft, ob ihre Anfrage noch
    die aktuelle ist, bevor sie etwas setzt.
  – **Flackern.** Beim Nachladen bleibt die alte Liste stehen; nur beim ersten
    Laden gibt es ein Gerüst. Eine Werkstattliste, die bei jedem Tastendruck
    weiß wird, ist unbenutzbar.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchWorkshopTickets,
  type WorkshopListResponse,
  type WorkshopQuery,
} from "@/lib/api/client";
import { useStatusChannel } from "@/lib/realtime/useStatusChannel";
import { WORKSHOP_TOPIC } from "@/lib/realtime/topics";
import type { TicketStatus } from "@/lib/tickets/status";
import type { TicketListItem } from "@/lib/tickets/types";

const SEARCH_DEBOUNCE = 300;
const BROADCAST_DEBOUNCE = 500;

export type WorkshopPhase = "laedt" | "da" | "anmeldung" | "gesperrt" | "fehler";

export interface WorkshopState {
  phase: WorkshopPhase;
  error: string;
  data: WorkshopListResponse | null;
  /** Zustand des Rundrufkanals – für die Anzeige „aktualisiert sich". */
  channel: ReturnType<typeof useStatusChannel>;
}

export function useWorkshopTickets(query: WorkshopQuery) {
  const [state, setState] = useState<{
    phase: WorkshopPhase;
    error: string;
    data: WorkshopListResponse | null;
  }>({ phase: "laedt", error: "", data: null });

  const controller = useRef<AbortController | null>(null);
  const broadcastTimer = useRef<number | null>(null);

  const load = useCallback(async (current: WorkshopQuery) => {
    controller.current?.abort();
    const own = new AbortController();
    controller.current = own;

    const result = await fetchWorkshopTickets(current, own.signal);
    if (own.signal.aborted) return;

    if (result.ok) {
      setState({ phase: "da", error: "", data: result.data });
      return;
    }
    if (result.status === 401) {
      setState({ phase: "anmeldung", error: "", data: null });
      return;
    }
    if (result.status === 403) {
      setState({ phase: "gesperrt", error: result.error, data: null });
      return;
    }
    // Der Abbruch einer überholten Anfrage kommt hier nie an (siehe oben),
    // ein echter Netzfehler schon.
    setState((prev) => ({ ...prev, phase: "fehler", error: result.error }));
  }, []);

  /* Entprelltes Laden bei jeder Änderung der Abfrage. */
  const { search, sort, limit, offset } = query;
  const statusKey = (query.statuses ?? []).join(",");

  useEffect(() => {
    const statuses = statusKey
      ? (statusKey.split(",") as TicketStatus[])
      : undefined;
    const timer = window.setTimeout(() => {
      void load({ search, statuses, sort, limit, offset });
    }, SEARCH_DEBOUNCE);

    return () => window.clearTimeout(timer);
  }, [load, search, statusKey, sort, limit, offset]);

  useEffect(
    () => () => {
      controller.current?.abort();
      if (broadcastTimer.current !== null) {
        window.clearTimeout(broadcastTimer.current);
      }
    },
    [],
  );

  /* Rundruf → gebündelt nachladen. */
  const onBroadcast = useCallback(() => {
    if (broadcastTimer.current !== null) {
      window.clearTimeout(broadcastTimer.current);
    }
    broadcastTimer.current = window.setTimeout(() => {
      broadcastTimer.current = null;
      const statuses = statusKey
        ? (statusKey.split(",") as TicketStatus[])
        : undefined;
      void load({ search, statuses, sort, limit, offset });
    }, BROADCAST_DEBOUNCE);
  }, [load, search, statusKey, sort, limit, offset]);

  const channel = useStatusChannel(
    state.phase === "da" ? WORKSHOP_TOPIC : null,
    onBroadcast,
  );

  /**
   * Eine Zeile sofort ändern, ohne auf den Server zu warten.
   *
   * Der Statuswechsel ist zu diesem Zeitpunkt bereits bestätigt – die Antwort
   * der API liegt vor. Was hier gespart wird, ist das Nachladen der ganzen
   * Liste, bevor die Zeile umspringt.
   */
  const applyLocal = useCallback((ticketCode: string, patch: Partial<TicketListItem>) => {
    setState((prev) =>
      prev.data
        ? {
            ...prev,
            data: {
              ...prev.data,
              items: prev.data.items.map((item) =>
                item.ticketCode === ticketCode ? { ...item, ...patch } : item,
              ),
            },
          }
        : prev,
    );
  }, []);

  const reload = useCallback(() => {
    const statuses = statusKey ? (statusKey.split(",") as TicketStatus[]) : undefined;
    void load({ search, statuses, sort, limit, offset });
  }, [load, search, statusKey, sort, limit, offset]);

  return { ...state, channel, applyLocal, reload };
}
