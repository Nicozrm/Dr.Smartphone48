/*
  Die Typen des Vorgangs – eine Sprache für Datenbank, API und Oberfläche.

  Drei Sichten auf dieselbe Zeile, und die Unterschiede sind Absicht:

  – `RepairTicket`      alles, was gespeichert ist. Nur serverseitig und in
                        der Werkstattansicht (angemeldetes Personal).
  – `PublicTicket`      was die Statusseite zeigt. Wer den Code hat, sieht
                        das – deshalb steht hier nichts drin, was in fremden
                        Händen schaden könnte.
  – `TicketListItem`    die Zeile in der Werkstattliste. Schmal, damit eine
                        Liste mit tausend Vorgängen nicht tausend Notizen
                        mitschleppt.

  Die Redaktion passiert in `public-view.ts`, an genau einer Stelle.
*/

import type { RepairKind } from "@/lib/data/devices";
import type { TicketStatus } from "./status";

/**
 * Eine Position des Auftrags. Preis und Dauer sind Kopien aus dem Katalog
 * zum Zeitpunkt der Anmeldung – ändert sich später eine Preisliste, bleibt
 * der zugesagte Festpreis stehen.
 */
export interface TicketRepairItem {
  kind: RepairKind;
  label: string;
  /** Festpreis in Euro, wie zugesagt. */
  price: number;
  /** Veranschlagte Arbeitszeit in Minuten. */
  minutes: number;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  /** `null` beim ersten Eintrag – davor gab es keinen Zustand. */
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  note: string | null;
  createdAt: string;
  /** Wer den Wechsel ausgelöst hat. `null` = System. */
  changedBy: string | null;
}

/** Wie der Kunde über den Fortschritt informiert werden möchte. */
export const CONTACT_CHANNELS = ["none", "email", "whatsapp", "sms"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export function isContactChannel(value: unknown): value is ContactChannel {
  return (
    typeof value === "string" &&
    (CONTACT_CHANNELS as readonly string[]).includes(value)
  );
}

/** Der vollständige Datensatz. Verlässt den Server nur Richtung Werkstatt. */
export interface RepairTicket {
  id: string;
  ticketCode: string;
  /** Deterministische Vorgangsnummer des Voranschlags (`lib/ticket.ts`). */
  estimateReference: string | null;
  /** Kanonische Parameter des Voranschlags – der Link lässt sich daraus bauen. */
  estimateQuery: string | null;
  customer: string;
  phone: string | null;
  email: string | null;
  device: string;
  deviceBrandId: string | null;
  deviceModelId: string | null;
  imei: string | null;
  repairItems: TicketRepairItem[];
  /** Summe der Festpreise in Euro. */
  totalPrice: number;
  /** Summe der veranschlagten Arbeitszeit in Minuten. */
  estimatedMinutes: number;
  /** Von der Werkstatt gesetzt. `null` heißt: noch keine Zusage. */
  estimatedReadyAt: string | null;
  status: TicketStatus;
  internalNotes: string | null;
  /** Was der Kunde bei der Anmeldung geschrieben hat. */
  customerNote: string | null;
  contactChannel: ContactChannel;
  /** Nachweis der Einwilligung – ohne sie entsteht kein Datensatz. */
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

/** Die schmale Zeile für Listen. */
export interface TicketListItem {
  id: string;
  ticketCode: string;
  customer: string;
  device: string;
  status: TicketStatus;
  repairItems: TicketRepairItem[];
  totalPrice: number;
  estimatedReadyAt: string | null;
  createdAt: string;
  statusChangedAt: string;
  /** Vorhanden, damit die Liste ohne Zusatzabfrage anzeigen kann, dass es Vermerke gibt. */
  hasInternalNotes: boolean;
}

/**
 * Was die Statusseite zeigt.
 *
 * Kein Name, keine Telefonnummer, keine E-Mail-Adresse, keine vollständige
 * IMEI, keine internen Vermerke. Der Code ist ein Schlüssel, kein Ausweis –
 * er belegt, dass jemand den Link hat, nicht wer er ist.
 */
export interface PublicTicket {
  ticketCode: string;
  device: string;
  /**
   * Modell-Kennung aus dem Katalog. Kein zusätzliches Wissen über die Person –
   * `device` nennt dasselbe Gerät bereits im Klartext. Sie steht hier, damit
   * die Statusseite den Update-Horizont nachschlagen kann, ohne ihn zu raten.
   */
  deviceModelId: string | null;
  repairItems: TicketRepairItem[];
  totalPrice: number;
  estimatedMinutes: number;
  estimatedReadyAt: string | null;
  status: TicketStatus;
  /** 0 bis 1, abgeleitet aus der Position in der Kette. */
  progress: number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  /** Nur Zeitpunkt, Zustand und – falls für den Kunden gedacht – der Vermerk. */
  history: PublicHistoryEntry[];
}

export interface PublicHistoryEntry {
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus;
  note: string | null;
  createdAt: string;
}

/** Zahlen für die Werkstattübersicht. Alle aus dem Bestand gerechnet. */
export interface TicketStats {
  total: number;
  /** Anzahl je Zustand – vollständig, auch die leeren. */
  byStatus: Record<TicketStatus, number>;
  /** Vorgänge, die noch Arbeit bedeuten. */
  active: number;
  readyForPickup: number;
  completed: number;
  /** Heute angemeldet. */
  today: number;
  /**
   * Durchlaufzeit von der Anmeldung bis „Abgeschlossen" in Stunden, als
   * Median über die letzten abgeschlossenen Vorgänge. `null`, solange es
   * keinen einzigen gibt – eine Kennzahl aus null Werten wäre erfunden.
   */
  medianTurnaroundHours: number | null;
}
