"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { brands } from "@/lib/data/devices";
import {
  formatDuration,
  formatMonth,
  supportFor,
  supportStatus,
  type SupportLevel,
} from "@/lib/data/support";

/*
  Alle Modelle in einer Liste, sortiert nach dem, was übrig ist.

  Die Sortierung ist der eigentliche Inhalt: Oben steht, was am wenigsten
  Zeit hat. Wer hier sein Gerät sucht und weit oben findet, hat die Antwort
  schon, bevor er die Spalten gelesen hat.

  Wie bei SupportHorizon wird die Restlaufzeit erst nach dem Laden gerechnet
  – sonst friert sie auf dem Datum des letzten Deploys ein. Ohne JavaScript
  bleibt die Liste nach Marke sortiert und zeigt die Datumsangaben; die sind
  die Information, die Sortierung ist die Bequemlichkeit.
*/

const levelDot: Record<SupportLevel, string> = {
  lang: "bg-positive",
  mittel: "bg-accent",
  knapp: "bg-warn",
  abgelaufen: "bg-danger",
};

const levelText: Record<SupportLevel, string> = {
  lang: "text-positive",
  mittel: "text-accent",
  knapp: "text-warn",
  abgelaufen: "text-danger",
};

type Filter = "alle" | "apple" | "samsung" | "google";

const filter: { id: Filter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "apple", label: "Apple" },
  { id: "samsung", label: "Samsung" },
  { id: "google", label: "Google" },
];

export function SupportTable() {
  const [jetzt, setJetzt] = useState<Date | null>(null);
  const [marke, setMarke] = useState<Filter>("alle");
  useEffect(() => setJetzt(new Date()), []);

  const zeilen = useMemo(() => {
    const alle = brands.flatMap((brand) =>
      brand.models.map((model) => {
        const entry = supportFor(model.id);
        return entry ? { brand, model, entry } : null;
      }),
    );

    const gefiltert = alle
      .filter((z) => z !== null)
      .filter((z) => marke === "alle" || z.brand.id === marke);

    // Erst nach dem Laden nach Restlaufzeit sortieren – vorher gibt es kein
    // „heute", gegen das sich sortieren ließe.
    if (!jetzt) return gefiltert;
    return [...gefiltert].sort(
      (a, b) =>
        supportStatus(a.entry, jetzt).months - supportStatus(b.entry, jetzt).months,
    );
  }, [marke, jetzt]);

  const chip = (aktiv: boolean) =>
    `h-9 rounded-full border px-4 text-[0.875rem] font-medium transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
      aktiv
        ? "border-ink-strong bg-ink-strong text-[var(--surface-page)]"
        : "border-line bg-page text-ink hover:border-ink-faint"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Nach Marke filtern">
        {filter.map((f) => (
          <button
            key={f.id}
            type="button"
            className={chip(marke === f.id)}
            aria-pressed={marke === f.id}
            onClick={() => setMarke(f.id)}
          >
            {f.label}
          </button>
        ))}
        <p className="ml-2 font-mono text-[0.8125rem] text-ink-faint" aria-live="polite">
          {zeilen.length} Modelle{jetzt ? ", knappste zuerst" : ""}
        </p>
      </div>

      {/* Auf schmalen Schirmen scrollt die Tabelle in ihrem eigenen Kasten,
          statt die Seite quer zu ziehen. */}
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-l)] border border-line bg-page">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3.5 text-[0.75rem] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Modell
              </th>
              <th scope="col" className="px-5 py-3.5 text-[0.75rem] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Neue Versionen bis
              </th>
              <th scope="col" className="px-5 py-3.5 text-[0.75rem] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Sicherheitsupdates bis
              </th>
              <th scope="col" className="px-5 py-3.5 text-right text-[0.75rem] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Verbleibend
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map(({ brand, model, entry }) => {
              const status = jetzt ? supportStatus(entry, jetzt) : null;
              return (
                <tr key={model.id} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-5 py-4 font-normal">
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          status ? levelDot[status.level] : "bg-line-strong"
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-[0.9375rem] text-ink-strong">
                          {model.name}
                        </span>
                        <span className="block font-mono text-[0.75rem] text-ink-faint">
                          {brand.name} · {model.year}
                        </span>
                      </span>
                    </span>
                  </th>
                  <td className="px-5 py-4 font-mono text-[0.875rem] text-ink-soft">
                    {formatMonth(entry.osUntil)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="block font-mono text-[0.875rem] text-ink-strong">
                      {formatMonth(entry.securityUntil)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-ink-faint">
                      <Icon
                        name={entry.source === "hersteller" ? "shield" : "clock"}
                        size={11}
                      />
                      {entry.source === "hersteller" ? "Herstellerzusage" : "Schätzung"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {status ? (
                      <span
                        className={`font-mono text-[0.875rem] tabular-nums ${levelText[status.level]}`}
                      >
                        {status.months > 0 ? formatDuration(status.months) : "abgelaufen"}
                      </span>
                    ) : (
                      <span className="font-mono text-[0.875rem] text-ink-faint">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
        Ihr Modell fehlt? Wir reparieren mehr Geräte, als der
        Sofortpreis-Rechner führt –{" "}
        <Link href="/kontakt" className="text-accent underline underline-offset-4">
          fragen Sie uns
        </Link>
        , dann sagen wir Ihnen den Zeitraum für Ihr Gerät.
      </p>
    </div>
  );
}
