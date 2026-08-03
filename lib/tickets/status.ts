/*
  Der Werkstattablauf als Zustandsfolge – an genau einer Stelle.

  Acht Zustände, eine Reihenfolge. Weil sie sowohl in der Datenbank (als
  Postgres-Enum) als auch hier stehen müssen, prüft `npm run verify:status`
  nach jedem Eingriff, dass beide Listen zeichengleich sind. Läuft eine der
  beiden davon, meldet die Website einen Zustand, den die Datenbank nicht
  kennt – und der Kunde sieht eine leere Seite statt seines Vorgangs.

  Nirgends im Code steht eine Statuszeichenkette direkt. Wer einen Zustand
  braucht, nimmt ihn hier her.
*/

/** Die Zustände in ihrer natürlichen Reihenfolge. Reihenfolge = Fortschritt. */
export const TICKET_STATUSES = [
  "open",
  "device_received",
  "diagnosis",
  "waiting_for_parts",
  "repairing",
  "quality_check",
  "ready_for_pickup",
  "completed",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Erster Zustand eines neu angemeldeten Vorgangs. */
export const INITIAL_STATUS: TicketStatus = "open";

/** Endzustand – danach passiert nichts mehr. */
export const FINAL_STATUS: TicketStatus = "completed";

export interface TicketStatusMeta {
  status: TicketStatus;
  /** Kurzform für Listen und Abzeichen. */
  label: string;
  /** Was in diesem Zustand tatsächlich passiert – aus Kundensicht formuliert. */
  customerHint: string;
  /** Vermerk in der Werkstattansicht, wenn nichts eigenes notiert wurde. */
  workshopHint: string;
  /**
   * Farbrolle aus den Design-Tokens. Keine Ad-hoc-Farben – die Namen
   * entsprechen den Variablen in `app/globals.css`.
   */
  tone: "neutral" | "accent" | "warn" | "positive";
  /** Icon aus dem eigenen Set (`components/ui/Icon.tsx`). */
  icon: "clock" | "truck" | "search" | "tool" | "cpu" | "shield" | "check" | "sparkle";
}

export const ticketStatusMeta: Record<TicketStatus, TicketStatusMeta> = {
  open: {
    status: "open",
    label: "Angemeldet",
    customerHint:
      "Ihr Vorgang liegt uns vor. Sobald das Gerät bei uns ist, geht es weiter.",
    workshopHint: "Angemeldet, Gerät noch nicht da.",
    tone: "neutral",
    icon: "clock",
  },
  device_received: {
    status: "device_received",
    label: "Gerät angenommen",
    customerHint:
      "Das Gerät ist bei uns, aufgenommen und für die Diagnose eingeplant.",
    workshopHint: "Gerät angenommen, wartet auf Diagnose.",
    tone: "accent",
    icon: "truck",
  },
  diagnosis: {
    status: "diagnosis",
    label: "Diagnose",
    customerHint:
      "Wir prüfen das Gerät. Zeigt sich etwas anderes als erwartet, melden wir uns, bevor wir weiterarbeiten.",
    workshopHint: "In der Diagnose.",
    tone: "accent",
    icon: "search",
  },
  waiting_for_parts: {
    status: "waiting_for_parts",
    label: "Wartet auf Teile",
    customerHint:
      "Das benötigte Ersatzteil ist bestellt. Sobald es da ist, geht es sofort weiter.",
    workshopHint: "Teil bestellt – Vorgang liegt.",
    tone: "warn",
    icon: "clock",
  },
  repairing: {
    status: "repairing",
    label: "In Reparatur",
    customerHint: "Ihr Gerät liegt auf dem Tisch und wird gerade repariert.",
    workshopHint: "In Arbeit.",
    tone: "accent",
    icon: "tool",
  },
  quality_check: {
    status: "quality_check",
    label: "Endkontrolle",
    customerHint:
      "Die Reparatur ist fertig. Jetzt läuft die Funktionsprüfung, bevor das Gerät zurückgeht.",
    workshopHint: "Funktionsprüfung läuft.",
    tone: "accent",
    icon: "shield",
  },
  ready_for_pickup: {
    status: "ready_for_pickup",
    label: "Abholbereit",
    customerHint:
      "Fertig. Ihr Gerät liegt zur Abholung bereit – Zahlung erst bei der Übergabe.",
    workshopHint: "Fertig, wartet auf Abholung.",
    tone: "positive",
    icon: "sparkle",
  },
  completed: {
    status: "completed",
    label: "Abgeschlossen",
    customerHint:
      "Abgeholt und abgeschlossen. Die Garantie auf Teil und Arbeit läuft ab dem Abholtag.",
    workshopHint: "Abgeholt.",
    tone: "positive",
    icon: "check",
  },
};

/** Position in der Kette, 0-basiert. */
export function statusIndex(status: TicketStatus): number {
  return TICKET_STATUSES.indexOf(status);
}

/**
 * Fortschritt als Anteil zwischen 0 und 1.
 *
 * Bewusst linear über die Zustände und nicht über geschätzte Zeit: Eine
 * Prozentzahl, die aus einer Vermutung entsteht, wäre genau die Sorte
 * erfundene Zahl, die auf dieser Website nichts zu suchen hat. Hier zählt
 * sie ab, wie viele der acht Schritte erledigt sind – nicht mehr.
 */
export function statusProgress(status: TicketStatus): number {
  return statusIndex(status) / (TICKET_STATUSES.length - 1);
}

/** Ist der Vorgang aus Kundensicht erledigt? */
export function isClosed(status: TicketStatus): boolean {
  return status === FINAL_STATUS;
}

/** Zustände, die in der Werkstatt noch Arbeit bedeuten. */
export function isActive(status: TicketStatus): boolean {
  return status !== FINAL_STATUS && status !== "ready_for_pickup";
}

/** Typwächter für alles, was von außen kommt. */
export function isTicketStatus(value: unknown): value is TicketStatus {
  return (
    typeof value === "string" &&
    (TICKET_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Erlaubte Übergänge.
 *
 * Die Kette darf vorwärts übersprungen werden – ein Gerät, das am Tresen
 * abgegeben und sofort repariert wird, durchläuft nicht künstlich drei
 * Zwischenzustände. Rückwärts ist genau ein Schritt erlaubt: die Korrektur
 * eines Fehlgriffs. Ein Sprung von „Abgeschlossen" zurück in die Diagnose
 * wäre kein Statuswechsel, sondern ein neuer Vorgang.
 */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  const delta = statusIndex(to) - statusIndex(from);
  if (delta > 0) return true;
  return delta === -1;
}

/** Klartext, warum ein Übergang abgelehnt wurde – für die API-Antwort. */
export function transitionError(
  from: TicketStatus,
  to: TicketStatus,
): string | null {
  if (canTransition(from, to)) return null;
  if (from === to) {
    return `Der Vorgang steht bereits auf „${ticketStatusMeta[to].label}".`;
  }
  return `Von „${ticketStatusMeta[from].label}" zurück auf „${ticketStatusMeta[to].label}" ist kein Statuswechsel, sondern ein neuer Vorgang. Erlaubt ist nur ein Schritt zurück.`;
}

/** Der nächste Schritt in der Kette, falls es einen gibt. */
export function nextStatus(status: TicketStatus): TicketStatus | null {
  return TICKET_STATUSES[statusIndex(status) + 1] ?? null;
}

/**
 * Zustände, bei deren Erreichen eine Benachrichtigung sinnvoll ist.
 *
 * Nicht jeder Schritt ist eine Nachricht wert. Wer für jeden Handgriff eine
 * SMS bekommt, schaltet nach dem zweiten Vorgang alles ab – und verpasst
 * dann die eine Nachricht, auf die es ankommt.
 */
export const NOTIFYING_STATUSES: readonly TicketStatus[] = [
  "device_received",
  "waiting_for_parts",
  "ready_for_pickup",
];
