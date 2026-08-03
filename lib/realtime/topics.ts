/*
  Die Namen der Kanäle – hier und im Trigger, sonst nirgends.

  Ein Tippfehler in einem Themennamen erzeugt keinen Fehler: Der Client
  abonniert brav ein Thema, auf dem nie jemand spricht, und die Seite bleibt
  einfach still. Solche Fehler findet man erst in der Werkstatt. Deshalb steht
  der Name an einer Stelle, und `supabase/migrations/*_realtime.sql` baut ihn
  nach demselben Muster.
*/

/** Der Kanal eines einzelnen Vorgangs. Wer den Code hat, darf zuhören. */
export function ticketTopic(ticketCode: string): string {
  return `vorgang:${ticketCode}`;
}

/** Der Kanal aller Arbeitsplätze. Verlangt eine Anmeldung. */
export const WORKSHOP_TOPIC = "werkstatt:vorgaenge";

/** Das Ereignis, das der Trigger sendet. */
export const STATUS_EVENT = "status";

/**
 * Die Nutzlast des Rundrufs.
 *
 * Vier Felder, keines personenbezogen. Der Rundruf ist ein Signal, keine
 * Datenquelle: Wer mehr braucht, holt es über die API, wo redigiert wird.
 */
export interface StatusBroadcast {
  ticketCode: string;
  status: string;
  statusChangedAt: string;
  updatedAt: string;
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
