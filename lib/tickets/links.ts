/*
  Die Adresse der Statusseite – an einer Stelle, weil sie im QR-Code steht.

  Ein QR-Code auf einem gedruckten Übergabeprotokoll ist das einzige Stück
  dieser Website, das man nicht nachträglich korrigieren kann. Er liegt beim
  Kunden in der Tasche. Deshalb entsteht die Adresse hier und nirgends sonst.
*/

import { site } from "@/lib/site";

/** Pfad ohne Domain – für `next/link`. */
export function statusPath(ticketCode: string): string {
  return `/status/${encodeURIComponent(ticketCode)}`;
}

/**
 * Vollständige Adresse für QR-Code, Nachricht und Ausdruck.
 *
 * `origin` kommt aus dem Browser, wo es bekannt ist. Ohne Angabe gilt die
 * kanonische Adresse aus den Stammdaten (Server-Rendering, statischer
 * Export).
 *
 * Der Unterpfad der GitHub-Projektseite muss dabei ausdrücklich davor:
 * `window.location.origin` ist dort `https://nicozrm.github.io` – ohne
 * `/Koko` zeigte der gedruckte QR-Code ins Leere. `site.url` trägt den
 * Unterpfad bereits, deshalb kommt er nur zum Browser-Origin hinzu.
 */
export function statusUrl(ticketCode: string, origin?: string): string {
  const trimmed = origin?.replace(/\/+$/, "");
  const base = trimmed
    ? `${trimmed}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`
    : site.url;
  return `${base}${statusPath(ticketCode)}`;
}
