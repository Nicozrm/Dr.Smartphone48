/**
 * Was quer liegt – die Vorgänge, die von selbst nicht weitergehen.
 *
 * ## Warum das nicht ins Dashboard gehört
 *
 * Das Werkstatt-Dashboard beantwortet die Frage des Arbeitstages: Was liegt
 * an, was kann heute raus. Es zeigt dafür Zahlen je Zustand – und genau
 * deshalb sieht man dort **nicht**, was liegen geblieben ist. Ein Vorgang,
 * der seit elf Tagen auf ein Ersatzteil wartet, steht in derselben Zahl wie
 * einer von gestern. Er fällt niemandem auf, bis der Kunde anruft.
 *
 * Diese Auswertung ist deshalb die Gegenfrage: nicht „wie viele", sondern
 * „welche gehen nicht von selbst weiter". Sie zählt nicht, sie nennt Namen.
 *
 * ## Drei Gründe, und alle drei sind Tatsachen
 *
 * Keiner der drei ist eine Schätzung oder eine Bewertung der Arbeit. Jeder
 * lässt sich am Datensatz ablesen und dem Kunden gegenüber begründen:
 *
 * – **Überfällig**: Der zugesagte Termin ist vorbei, das Gerät ist weder
 *   abholbereit noch abgeschlossen. Das ist ein gebrochenes Versprechen,
 *   und es ist das einzige der drei, das der Kunde selbst bemerkt.
 * – **Wartet auf Abholung**: fertig, aber seit Tagen nicht geholt. Das
 *   belegt Regalplatz und bindet Kapital; irgendwann ist es ein Anruf wert.
 * – **Ohne Bewegung**: Der Zustand hat sich lange nicht geändert. Das ist
 *   kein Vorwurf – manche Reparatur wartet zu Recht –, sondern die Frage,
 *   ob noch jemand daran denkt.
 *
 * ## Die Schwellen sind gesetzt, nicht gemessen
 *
 * Drei und sieben Tage sind Erfahrungswerte einer Werkstatt, keine
 * Erkenntnis aus Daten. Sie stehen deshalb hier als benannte Konstanten und
 * nicht verstreut in der Oberfläche – wer sie ändert, ändert sie einmal.
 * Auf der Seite steht die Zahl der Tage jeweils dabei, damit niemand eine
 * Genauigkeit vermutet, die es nicht gibt.
 */
/*
  Nur Typ-Importe, und das ist kein Zufall. Dieses Modul wird von
  `verify:status` mit nacktem Node geladen; ein Wert-Import müsste dort die
  Dateiendung tragen, die der Bundler wiederum nicht mag. Typen verschwinden
  beim Strippen, also gibt es das Problem gar nicht erst.

  Der eigentliche Grund ist aber inhaltlich: Diese Datei entscheidet, **was**
  auffällt und **warum**. Wie der Satz dazu lautet, entscheidet die
  Oberfläche – dort steht ohnehin schon die Beschriftung der Zustände.
*/
import type { TicketStatus } from "../tickets/status";
import type { TicketListItem } from "../tickets/types";

/** Ab wann ein fertiges Gerät auf Abholung „wartet". */
export const PICKUP_DAYS = 3;
/** Ab wann ein Vorgang „ohne Bewegung" ist. */
export const STALE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type AttentionReason = "ueberfaellig" | "abholung" | "still";

export interface AttentionItem {
  ticket: TicketListItem;
  reason: AttentionReason;
  /** Wie lange der Zustand schon besteht, in vollen Tagen. */
  days: number;
}

/** Volle Tage zwischen einem Zeitpunkt und jetzt. Nie negativ. */
function daysSince(iso: string, now: number): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / DAY_MS));
}

/**
 * Die Vorgänge, die Aufmerksamkeit brauchen – dringlichster zuerst.
 *
 * Ein Vorgang erscheint **höchstens einmal**. Ein überfälliges Gerät, das
 * zugleich seit Tagen unbewegt ist, wäre sonst zweimal in derselben Liste
 * und die Liste damit länger als das Problem. Die Reihenfolge der Prüfung
 * ist die Rangfolge: Ein gebrochener Termin wiegt schwerer als ein stiller
 * Vorgang.
 */
export function attentionItems(
  tickets: TicketListItem[],
  now: number,
): AttentionItem[] {
  const out: AttentionItem[] = [];

  for (const ticket of tickets) {
    if (ticket.status === "completed") continue;

    // 1. Zugesagter Termin vorbei, Gerät noch nicht fertig.
    if (
      ticket.estimatedReadyAt &&
      ticket.status !== "ready_for_pickup" &&
      Date.parse(ticket.estimatedReadyAt) < now
    ) {
      const days = daysSince(ticket.estimatedReadyAt, now);
      out.push({ ticket, reason: "ueberfaellig", days });
      continue;
    }

    // 2. Fertig, aber nicht geholt.
    if (ticket.status === "ready_for_pickup") {
      const days = daysSince(ticket.statusChangedAt, now);
      if (days >= PICKUP_DAYS) {
        out.push({ ticket, reason: "abholung", days });
      }
      continue;
    }

    // 3. Seit langem derselbe Zustand.
    const days = daysSince(ticket.statusChangedAt, now);
    if (days >= STALE_DAYS) {
      out.push({ ticket, reason: "still", days });
    }
  }

  const rang: Record<AttentionReason, number> = {
    ueberfaellig: 0,
    abholung: 1,
    still: 2,
  };

  return out.sort((a, b) => rang[a.reason] - rang[b.reason] || b.days - a.days);
}

/**
 * Der Wert, der gerade in der Werkstatt liegt.
 *
 * Summe der Vorgänge, die noch Arbeit sind – abgeschlossene zählen nicht
 * mehr mit. Es ist ausdrücklich **kein Umsatz**: Nichts davon ist bezahlt,
 * manches wird nach der Diagnose abgelehnt. Auf der Seite heißt es deshalb
 * „in Arbeit" und nicht „offene Forderungen".
 */
export function valueInProgress(tickets: TicketListItem[]): number {
  return tickets
    .filter((t) => t.status !== "completed")
    .reduce((sum, t) => sum + (Number.isFinite(t.totalPrice) ? t.totalPrice : 0), 0);
}

/** Zählung je Zustand – vollständig, auch die leeren Einträge fehlen hier. */
export function countByStatus(
  tickets: TicketListItem[],
): Map<TicketStatus, number> {
  const out = new Map<TicketStatus, number>();
  for (const ticket of tickets) {
    out.set(ticket.status, (out.get(ticket.status) ?? 0) + 1);
  }
  return out;
}
