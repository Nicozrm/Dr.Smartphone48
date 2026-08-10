/**
 * Der Sprung von der Übersicht in die Werkstatt.
 *
 * `/intern` nennt die Vorgänge, die quer liegen – aber sie zu nennen ist
 * die halbe Arbeit. Wer dort liest „K7M2-B94X ist seit vier Tagen
 * überfällig" und den Code danach im Dashboard von Hand in die Suche
 * tippen muss, hat eine Liste bekommen und keine Handlung. Eine Übersicht,
 * die auf Sackgassen zeigt, ist eine Tapete mit Zahlen.
 *
 * Also trägt die Adresse den Sprung: `#vorgang=<Code>` öffnet die Akte,
 * `#status=<Zustand>` zeigt einen Zustand allein.
 *
 * ## Warum im Fragment und nicht als Parameter
 *
 * Dieselbe Regel wie beim Reparaturzertifikat: Ein Fragment schickt der
 * Browser **niemals** an einen Server. Ein Parameter dagegen steht in jedem
 * Zugriffsprotokoll – dem des Hosters, dem von Cloudflare, dem des
 * Proxys dazwischen.
 *
 * Beim Vorgangscode wiegt das, denn er ist kein Ausweis, sondern ein
 * Schlüssel: Wer ihn hat, sieht die Statusseite des Kunden. Ihn in eine
 * Adresszeile zu schreiben, die protokolliert wird, wäre genau der
 * Leichtsinn, den dieses Projekt beim Zertifikat ausdrücklich vermeidet.
 * Die erste Fassung dieses Moduls tat es trotzdem.
 *
 * ## Warum das geprüft wird, statt einfach gelesen
 *
 * Was in der Adresse steht, kommt von außen – auch wenn diese Adresse
 * heute nur von der eigenen Übersicht erzeugt wird. Ein unbekannter
 * Zustand aus der Adresse würde die Filterliste auf einen Wert setzen, den
 * die Datenbank nicht kennt; die Antwort wäre leer, und das Dashboard
 * sähe aus, als gäbe es keine Vorgänge mehr. Deshalb wird beides gegen die
 * eigenen Listen geprüft und im Zweifel verworfen.
 *
 * Nur Typ-Importe von außen, damit `verify:status` das Modul mit nacktem
 * Node laden kann – dieselbe Regel wie in `attention.ts`. Die beiden
 * Wächter stehen deshalb hier als eigene Prüfungen und nicht als Import.
 */
import type { TicketStatus } from "../tickets/status";

/** Dieselbe Form wie `TICKET_CODE_PATTERN` – siehe Kopfkommentar. */
const CODE = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

export interface WorkshopDeepLink {
  /** Vorgangscode, dessen Akte geöffnet werden soll. */
  vorgang?: string;
  /** Einzelner Zustand, auf den gefiltert werden soll. */
  status?: TicketStatus;
}

/**
 * Liest den Sprung aus einer Adresse.
 *
 * `known` ist die Liste der gültigen Zustände – sie wird übergeben statt
 * importiert, damit dieses Modul ohne Wert-Import auskommt und die Liste
 * nicht ein zweites Mal hier steht.
 */
export function parseDeepLink(
  fragment: string,
  known: readonly string[],
): WorkshopDeepLink {
  // Führendes „#" abstreifen – `window.location.hash` liefert es mit.
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const out: WorkshopDeepLink = {};

  const vorgang = params.get("vorgang");
  if (vorgang && CODE.test(vorgang)) out.vorgang = vorgang;

  const status = params.get("status");
  if (status && known.includes(status)) out.status = status as TicketStatus;

  return out;
}

/**
 * Baut die Adresse für einen Sprung.
 *
 * Beides zugleich ergibt keinen Sinn: Ein Vorgang liegt in genau einem
 * Zustand, ein zusätzlicher Filter könnte ihn nur ausblenden. Der Vorgang
 * gewinnt.
 */
export function workshopHref(link: WorkshopDeepLink): string {
  if (link.vorgang) return `/intern/werkstatt#vorgang=${encodeURIComponent(link.vorgang)}`;
  if (link.status) return `/intern/werkstatt#status=${encodeURIComponent(link.status)}`;
  return "/intern/werkstatt";
}
