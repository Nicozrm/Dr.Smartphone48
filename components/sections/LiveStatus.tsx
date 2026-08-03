"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/site";

/*
  Live-Verfügbarkeit – beantwortet die Frage, die jeder Besucher zuerst hat:
  „Kann ich jetzt hin?"

  Alles wird aus den echten Öffnungszeiten berechnet: geöffnet oder
  geschlossen, wie lange noch, und wann realistisch der nächste Zeitpunkt zum
  Vorbeikommen ist. Es werden bewusst keine Auslastungs- oder Wartezeitdaten
  erfunden – nur das, was aus den hinterlegten Zeiten tatsächlich folgt.

  Läuft rein clientseitig in der Zeitzone des Besuchers und aktualisiert sich
  jede Minute.
*/

/** Öffnungszeiten laut Stammdaten: Mo–Fr 11–19 Uhr. */
const OPEN_DAYS = [1, 2, 3, 4, 5];
const OPEN_FROM = 11;
const OPEN_TO = 19;
/** Letzte Annahme vor Feierabend, damit die Reparatur noch heute startet. */
const LAST_INTAKE_MIN = 45;

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

type State = {
  open: boolean;
  headline: string;
  detail: string;
  tone: "open" | "soon" | "closed";
};

function compute(now: Date): State {
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
    };
  }

  // Nächsten Öffnungstag suchen (maximal eine Woche voraus).
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7;
    if (!OPEN_DAYS.includes(d)) continue;
    if (i === 0 && minutes >= from) continue;
    const label =
      i === 0 ? "heute" : i === 1 ? "morgen" : `am ${DAY_NAMES[d]}`;
    return {
      open: false,
      tone: "closed",
      headline: "Gerade geschlossen",
      detail: `Wir öffnen wieder ${label} um ${OPEN_FROM}:00 Uhr. Schreiben Sie uns – wir antworten dann als Erstes.`,
    };
  }

  return {
    open: false,
    tone: "closed",
    headline: "Gerade geschlossen",
    detail: `Öffnungszeiten: ${site.openingHoursShort}.`,
  };
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function LiveStatus({ className = "" }: { className?: string }) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const update = () => setState(compute(new Date()));
    update();
    // Zum Minutenwechsel synchronisieren, danach im Minutentakt.
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

  // Vor der Hydration nichts behaupten – die Uhrzeit kennt nur der Client.
  if (!state) {
    return (
      <div className={`glass rounded-[var(--radius-l)] p-5 ${className}`}>
        <p className="font-mono text-[0.8125rem] text-ink-faint">
          {site.openingHoursShort}
        </p>
      </div>
    );
  }

  const color =
    state.tone === "open"
      ? "var(--positive)"
      : state.tone === "soon"
        ? "var(--warn)"
        : "var(--ink-faint)";

  return (
    <div className={`glass rounded-[var(--radius-l)] p-5 md:p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
          {state.open ? (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{
                background: color,
                animation: "op-pulse 2.4s var(--ease-inout) infinite",
              }}
            />
          ) : null}
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-title" style={{ color: state.open ? undefined : "var(--ink-soft)" }}>
            {state.headline}
          </p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{state.detail}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={site.phoneHref}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[0.8125rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
            >
              <Icon name="phone" size={14} />
              {site.phone}
            </a>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[0.8125rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
