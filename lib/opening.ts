"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

/*
  Öffnungsstatus – eine Rechnung, zwei Anzeigen.

  Die Frage „kann ich jetzt hin?" beantwortet die Seite an zwei Stellen: in
  der Verfügbarkeitskarte auf /kontakt und in der Aktionsleiste am unteren
  Bildschirmrand. Beide brauchen dieselbe Auskunft, und zwei Fassungen
  derselben Öffnungszeiten wären genau die Sorte Drift, gegen die in diesem
  Projekt sonst Prüfskripte stehen: Ein geänderter Feierabend, der nur an
  einer der beiden Stellen ankommt, ergibt eine Seite, die sich selbst
  widerspricht.

  Gerechnet wird ausschließlich aus den hinterlegten Zeiten. Es werden keine
  Auslastungen, Wartezeiten oder „nur noch 2 Plätze frei" erfunden – dieselbe
  Redaktionsregel wie überall sonst.

  Der Zeitpunkt kommt vom Gerät des Besuchers, nicht vom Server: Eine
  statisch exportierte Seite hätte sonst den Feierabend des letzten Deploys
  eingefroren.
*/

/** Öffnungszeiten laut Stammdaten: Mo–Fr 11–19 Uhr. */
export const OPEN_DAYS = [1, 2, 3, 4, 5];
export const OPEN_FROM = 11;
export const OPEN_TO = 19;
/** Letzte Annahme vor Feierabend, damit die Reparatur noch heute startet. */
export const LAST_INTAKE_MIN = 45;

const DAY_NAMES = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export type OpeningTone = "open" | "soon" | "closed";

export type OpeningState = {
  open: boolean;
  /** Überschrift für die Karte: „Jetzt geöffnet". */
  headline: string;
  /** Ein Satz mit der Begründung – nur für die Karte. */
  detail: string;
  /**
   * Dieselbe Auskunft in einer Zeile, für die Aktionsleiste. Dort ist Platz
   * für etwa vierzig Zeichen; ein abgeschnittener Satz wäre schlimmer als
   * eine kürzere Auskunft.
   */
  compact: string;
  tone: OpeningTone;
};

export function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function openingState(now: Date): OpeningState {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const from = OPEN_FROM * 60;
  const to = OPEN_TO * 60;
  const isOpenDay = OPEN_DAYS.includes(day);

  if (isOpenDay && minutes >= from && minutes < to) {
    const left = to - minutes;
    const intakeLeft = left - LAST_INTAKE_MIN;
    const h = Math.floor(left / 60);
    const m = left % 60;
    const leftText = h > 0 ? `noch ${h} Std. ${m} Min.` : `noch ${m} Min.`;
    return {
      open: true,
      tone: intakeLeft > 0 ? "open" : "soon",
      headline: "Jetzt geöffnet",
      detail:
        intakeLeft > 0
          ? `${leftText} – wer bis ${formatTime(to - LAST_INTAKE_MIN)} Uhr da ist, bekommt die meisten Reparaturen heute noch.`
          : `${leftText} – für heute nehmen wir nur noch Kurzreparaturen an.`,
      compact:
        intakeLeft > 0
          ? `Jetzt geöffnet – bis ${OPEN_TO} Uhr`
          : `Geöffnet – heute nur noch Kurzreparaturen`,
    };
  }

  // Nächsten Öffnungstag suchen (maximal eine Woche voraus).
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7;
    if (!OPEN_DAYS.includes(d)) continue;
    if (i === 0 && minutes >= from) continue;
    const label = i === 0 ? "heute" : i === 1 ? "morgen" : `am ${DAY_NAMES[d]}`;
    return {
      open: false,
      tone: "closed",
      headline: "Gerade geschlossen",
      detail: `Wir öffnen wieder ${label} um ${OPEN_FROM}:00 Uhr. Schreiben Sie uns – wir antworten dann als Erstes.`,
      compact: `Geschlossen – öffnet ${label} ${OPEN_FROM} Uhr`,
    };
  }

  return {
    open: false,
    tone: "closed",
    headline: "Gerade geschlossen",
    detail: `Öffnungszeiten: ${site.openingHoursShort}.`,
    compact: site.openingHoursShort,
  };
}

/**
 * Der Status als Hook. Gibt `null` zurück, bis der Browser übernommen hat –
 * vor der Hydration kennt niemand die Uhrzeit des Besuchers, und eine
 * geratene Auskunft wäre auf dem Server für alle dieselbe.
 *
 * Der erste Takt wird auf den Minutenwechsel gelegt, danach läuft er im
 * Minutentakt. Ohne diese Synchronisierung stünde „noch 12 Min." bis zu
 * neunundfünfzig Sekunden lang falsch da.
 */
export function useOpeningState(): OpeningState | null {
  const [state, setState] = useState<OpeningState | null>(null);

  useEffect(() => {
    const update = () => setState(openingState(new Date()));
    update();
    const now = new Date();
    const toNextMinute = (60 - now.getSeconds()) * 1000;
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      update();
      interval = window.setInterval(update, 60_000);
    }, toNextMinute);
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return state;
}

/** Farbe des Statuspunkts. Eine Stelle, damit Karte und Leiste nie abweichen. */
export function openingColor(tone: OpeningTone): string {
  return tone === "open"
    ? "var(--positive)"
    : tone === "soon"
      ? "var(--warn)"
      : "var(--ink-faint)";
}
