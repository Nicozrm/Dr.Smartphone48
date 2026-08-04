"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  formatDuration,
  formatMonth,
  monthsUntil,
  supportStatus,
  type SupportEntry,
  type SupportLevel,
} from "@/lib/data/support";

/*
  Der Update-Horizont.

  Warum das eine Client-Komponente ist, obwohl sie nichts anklickbar macht:
  Die Seite wird statisch exportiert. Ein serverseitig gerechnetes „noch
  14 Monate" wäre auf dem Datum des letzten Deploys eingefroren und würde
  Monat für Monat falscher. Die Daten selbst – Markteinführung, Ende der
  Betriebssystem-Updates, Ende der Sicherheitsupdates – ändern sich nie und
  stehen deshalb sofort im HTML. Nur die Rechnung „von heute aus gesehen"
  passiert nach dem Laden.

  Das heißt auch: Ohne JavaScript bleiben die Datumsangaben stehen. Sie sind
  die eigentliche Information; die Restlaufzeit ist die Bequemlichkeit.
*/

const levelStyles: Record<SupportLevel, { dot: string; text: string; bar: string }> = {
  lang: { dot: "bg-positive", text: "text-positive", bar: "bg-positive" },
  mittel: { dot: "bg-accent", text: "text-accent", bar: "bg-accent" },
  knapp: { dot: "bg-warn", text: "text-warn", bar: "bg-warn" },
  abgelaufen: { dot: "bg-danger", text: "text-danger", bar: "bg-danger" },
};

interface Props {
  entry: SupportEntry;
  /** Gerätename für die Überschrift. Ohne ihn bleibt die Kachel namenlos. */
  name?: string;
  /** Kompakt: eine Zeile statt Zeitachse (für den Sofortpreis-Rechner). */
  compact?: boolean;
  className?: string;
}

export function SupportHorizon({ entry, name, compact = false, className = "" }: Props) {
  // `null` bis nach dem ersten Bild – siehe Kommentar oben.
  const [jetzt, setJetzt] = useState<Date | null>(null);
  useEffect(() => setJetzt(new Date()), []);

  const status = jetzt ? supportStatus(entry, jetzt) : null;
  const style = levelStyles[status?.level ?? "mittel"];

  const spanne = monthsUntil(entry.securityUntil, new Date(`${entry.released}-01`));
  const osAnteil = Math.max(
    0,
    Math.min(1, monthsUntil(entry.osUntil, new Date(`${entry.released}-01`)) / spanne),
  );
  const heuteAnteil = jetzt
    ? Math.max(0, Math.min(1, 1 - monthsUntil(entry.securityUntil, jetzt) / spanne))
    : null;

  const quelle =
    entry.source === "hersteller"
      ? { label: "Herstellerzusage", icon: "shield" as const }
      : { label: "Schätzung", icon: "clock" as const };

  if (compact) {
    return (
      <div className={className}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
          <span className="text-[0.875rem] text-ink-strong">
            Sicherheitsupdates bis {formatMonth(entry.securityUntil)}
          </span>
          {status ? (
            <span className={`font-mono text-[0.8125rem] ${style.text}`}>
              {status.months > 0 ? `noch ${formatDuration(status.months)}` : "abgelaufen"}
            </span>
          ) : null}
        </p>
        {/* Die Quellenart in Kapitälchen sah aus wie eine Überschrift, sobald
            sie umbrach. Sie ist eine Fußnote und sieht jetzt auch so aus. */}
        <p className="mt-0.5 pl-5 text-[0.75rem] text-ink-faint">{quelle.label}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[var(--radius-l)] border border-line bg-raised p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
            Update-Horizont{name ? ` · ${name}` : ""}
          </p>
          {/* `mt-[0.5em]` statt `items-center`: Bricht die Überschrift auf zwei
              Zeilen, säße der Punkt sonst in der Mitte zwischen ihnen statt
              neben dem ersten Wort. */}
          <p className="mt-2 flex items-start gap-2 text-title">
            <span
              className={`mt-[0.5em] inline-block h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
              aria-hidden="true"
            />
            {status ? status.label : "Sicherheitsupdates"}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink-strong">
            {status ? (status.months > 0 ? formatDuration(status.months) : "—") : " "}
          </p>
          <p className="text-[0.75rem] text-ink-faint">
            {status && status.months > 0 ? "verbleiben" : status ? "Versorgung beendet" : " "}
          </p>
        </div>
      </div>

      {/* Zeitachse: Markteinführung → Ende OS-Updates → Ende Sicherheitsupdates */}
      <div className="mt-6">
        <div className="relative h-2 overflow-hidden rounded-full bg-sunken">
          {/* Zeitraum mit neuen Betriebssystem-Versionen */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${style.bar} opacity-100`}
            style={{ width: `${osAnteil * 100}%` }}
          />
          {/* Danach nur noch Sicherheitskorrekturen */}
          <div
            className={`absolute inset-y-0 rounded-full ${style.bar} opacity-35`}
            style={{ left: `${osAnteil * 100}%`, right: 0 }}
          />
        </div>

        {/* Der Zeiger für „heute" kommt erst nach dem Laden dazu. */}
        {heuteAnteil !== null ? (
          <div className="relative h-0">
            <div
              className="absolute -top-4 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${heuteAnteil * 100}%` }}
            >
              <span className="h-4 w-0.5 rounded-full bg-ink-strong" aria-hidden="true" />
              <span className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-strong">
                heute
              </span>
            </div>
          </div>
        ) : null}

        <dl className={`grid gap-4 sm:grid-cols-3 ${heuteAnteil !== null ? "mt-9" : "mt-4"}`}>
          <div>
            <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
              Markteinführung
            </dt>
            <dd className="mt-1 font-mono text-[0.875rem] text-ink-strong">
              {formatMonth(entry.released)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
              Neue iOS-/Android-Versionen bis
            </dt>
            <dd className="mt-1 font-mono text-[0.875rem] text-ink-strong">
              {formatMonth(entry.osUntil)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
              Sicherheitsupdates bis
            </dt>
            <dd className="mt-1 font-mono text-[0.875rem] text-ink-strong">
              {formatMonth(entry.securityUntil)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Der Beleg. Ohne ihn wäre die Zahl oben eine Behauptung. */}
      <p className="mt-5 flex gap-2.5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
        <Icon name={quelle.icon} size={16} className="mt-0.5 shrink-0 text-ink-faint" />
        <span>
          <strong className="font-medium text-ink-strong">{quelle.label}:</strong> {entry.basis}
        </span>
      </p>
    </div>
  );
}
