"use client";

import { useMemo, useState } from "react";
import { grades, refurbishedDevices, type Grade } from "@/lib/data/refurbished";
import { RefurbishedCard } from "./RefurbishedCard";

const brandFilters = ["Alle", "Apple", "Samsung", "Google"] as const;

export function RefurbishedGrid() {
  const [brand, setBrand] = useState<(typeof brandFilters)[number]>("Alle");
  const [grade, setGrade] = useState<Grade | "alle">("alle");

  const devices = useMemo(
    () =>
      refurbishedDevices.filter(
        (d) =>
          (brand === "Alle" || d.brand === brand) &&
          (grade === "alle" || d.grade === grade),
      ),
    [brand, grade],
  );

  const chip = (active: boolean) =>
    `h-9 rounded-full border px-4 text-[0.875rem] font-medium transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
      active
        ? "border-ink-strong bg-ink-strong text-[var(--surface-page)]"
        : "border-line bg-raised text-ink hover:border-ink-faint"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Nach Marke filtern">
          {brandFilters.map((b) => (
            <button
              key={b}
              type="button"
              className={chip(brand === b)}
              aria-pressed={brand === b}
              onClick={() => setBrand(b)}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Nach Zustand filtern">
          <button
            type="button"
            className={chip(grade === "alle")}
            aria-pressed={grade === "alle"}
            onClick={() => setGrade("alle")}
          >
            Jeder Zustand
          </button>
          {grades.map((g) => (
            <button
              key={g.id}
              type="button"
              className={chip(grade === g.id)}
              aria-pressed={grade === g.id}
              onClick={() => setGrade(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 font-mono text-[0.8125rem] text-ink-faint" aria-live="polite">
        {devices.length} {devices.length === 1 ? "Gerät" : "Geräte"}
      </p>

      {devices.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <RefurbishedCard key={device.id} device={device} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[var(--radius-l)] border border-line bg-raised px-6 py-16 text-center">
          <p className="text-title">Gerade nicht auf Lager.</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-ink-soft">
            Unser Bestand wechselt täglich. Fragen Sie uns – wir reservieren
            Ihnen das nächste passende Gerät.
          </p>
        </div>
      )}
    </div>
  );
}
