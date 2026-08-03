/*
  Die Namen der Kanäle – hier und im Trigger, sonst nirgends.

  Ein Tippfehler in einem Themennamen erzeugt keinen Fehler: Der Client
  abonniert brav ein Thema, auf dem nie jemand spricht, und die Seite bleibt
  einfach still. Solche Fehler findet man erst in der Werkstatt. Deshalb steht
  der Name an einer Stelle, und `supabase/migrations/*_realtime.sql` baut ihn
  nach demselben Muster.
*/

/**
 * Der Kanal eines einzelnen Vorgangs.
 *
 * Der Themenname enthält den Code, und Realtime kennt keine Muster-
 * Abonnements: Zuhören kann nur, wer den Code hat. Das ist dasselbe Modell wie
 * bei der Statusseite selbst – und der Grund, warum in der Nutzlast nichts
 * steht, was über den Zustand hinausgeht.
 */
export function ticketTopic(ticketCode: string): string {
  return `vorgang:${ticketCode}`;
}

/**
 * Der Kanal aller Arbeitsplätze.
 *
 * Sein Name steht im JavaScript und ist damit öffentlich. Deshalb trägt er
 * kein Geheimnis: Über ihn geht ein Zeitstempel, sonst nichts – siehe
 * `WorkshopPing`. Wer die Vorgänge sehen will, muss angemeldet sein und über
 * die API lesen.
 */
export const WORKSHOP_TOPIC = "werkstatt:vorgaenge";

/** Das Ereignis, das der Trigger sendet. */
export const STATUS_EVENT = "status";

/**
 * Die Nutzlast auf dem Kundenkanal.
 *
 * Vier Felder, keines personenbezogen; der Code darunter ist dem Zuhörer
 * ohnehin bekannt, er steht im Themennamen. Der Rundruf ist ein Signal, keine
 * Datenquelle: Wer mehr braucht, holt es über die API, wo redigiert wird.
 */
export interface StatusBroadcast {
  ticketCode: string;
  status: string;
  statusChangedAt: string;
  updatedAt: string;
}

/**
 * Die Nutzlast auf dem Werkstattkanal: ein Zeitstempel.
 *
 * Absichtlich nutzlos für jeden, der nicht angemeldet ist. Das Dashboard
 * braucht auch nicht mehr – es lädt bei jedem Anstoß über die API nach.
 */
export interface WorkshopPing {
  changedAt: string;
}

/** Nutzlasten kommen aus dem Netz – also geprüft, nicht geglaubt. */
export function isStatusBroadcast(value: unknown): value is StatusBroadcast {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.ticketCode === "string" &&
    typeof payload.status === "string" &&
    typeof payload.statusChangedAt === "string"
  );
}
