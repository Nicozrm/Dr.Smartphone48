"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  REPLACE_THRESHOLD,
  bestSingleChange,
  chargeWindows,
  climates,
  fastChargingLevels,
  project,
  typicalHabits,
  type BatteryHabits,
  type ChargeWindow,
  type Climate,
  type FastCharging,
} from "@/lib/battery";

/*
  Akku-Coach.

  Die Frage „Wie lange hält mein Akku noch?" beantwortet die Branche
  entweder gar nicht oder mit einer Zahl aus der Luft. Hier wird sie
  gerechnet – aus dem, was der Nutzer selbst steuert, und mit einer Kurve,
  die zeigt, was sich dadurch verschiebt.

  Der Vergleich mit dem typischen Profil ist der eigentliche Punkt. Eine
  Kurve allein sagt niemandem etwas; zwei Kurven nebeneinander schon.
*/

const chip =
  "inline-flex h-10 items-center rounded-full border px-4 text-[0.875rem] transition-colors duration-[var(--duration-fast)]";
const chipIdle = "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong";
const chipOn = "border-accent bg-accent-subtle font-medium text-accent";

const chargeCounts = [
  { value: 0.5, label: "Jeden 2. Tag" },
  { value: 1, label: "1× am Tag" },
  { value: 2, label: "2× am Tag" },
];

/** Beschriftete Kurve über 36 Monate. */
function Chart({
  mine,
  typical,
  replaceMonth,
}: {
  mine: { month: number; health: number }[];
  typical: { month: number; health: number }[];
  replaceMonth: number | null;
}) {
  const gradientId = useId();
  const width = 640;
  const height = 260;
  const padLeft = 38;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 30;

  const lowest = Math.min(
    ...mine.map((p) => p.health),
    ...typical.map((p) => p.health),
  );
  // Die Achse endet auf einem glatten Zehner unter dem tiefsten Punkt.
  const yMin = Math.max(30, Math.min(70, Math.floor((lowest - 4) / 10) * 10));
  const yMax = 100;

  const x = (month: number) =>
    padLeft + (month / 36) * (width - padLeft - padRight);
  const y = (health: number) =>
    padTop +
    ((yMax - health) / (yMax - yMin)) * (height - padTop - padBottom);

  const toPath = (points: { month: number; health: number }[]) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.month).toFixed(1)} ${y(p.health).toFixed(1)}`)
      .join("");

  const areaPath = `${toPath(mine)}L${x(36).toFixed(1)} ${y(yMin).toFixed(1)}L${x(0).toFixed(1)} ${y(yMin).toFixed(1)}Z`;

  const gridValues: number[] = [];
  for (let v = yMax; v >= yMin; v -= 10) gridValues.push(v);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Prognose der Akkugesundheit über 36 Monate. Start 100 Prozent, nach drei Jahren etwa ${Math.round(mine[mine.length - 1].health)} Prozent.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Waagerechtes Raster */}
      {gridValues.map((v) => (
        <g key={v}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--line)"
            strokeWidth="1"
          />
          <text
            x={padLeft - 8}
            y={y(v) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="var(--ink-faint)"
            style={{ fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Tauschschwelle */}
      {REPLACE_THRESHOLD > yMin ? (
        <>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(REPLACE_THRESHOLD)}
            y2={y(REPLACE_THRESHOLD)}
            stroke="var(--warn)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Links beschriften: Rechts kreuzen die Kurven die Schwelle. */}
          <text
            x={padLeft + 6}
            y={y(REPLACE_THRESHOLD) - 6}
            textAnchor="start"
            fontSize="10"
            fill="var(--warn)"
            style={{ fontFamily: "var(--font-geist-mono), monospace" }}
          >
            Tauschempfehlung
          </text>
        </>
      ) : null}

      {/* Jahresmarken */}
      {[0, 12, 24, 36].map((month) => (
        <text
          key={month}
          x={x(month)}
          y={height - 10}
          textAnchor={month === 0 ? "start" : month === 36 ? "end" : "middle"}
          fontSize="10"
          fill="var(--ink-faint)"
          style={{ fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {month === 0 ? "heute" : `${month / 12} J.`}
        </text>
      ))}

      {/* Typisches Profil zum Vergleich */}
      <path
        d={toPath(typical)}
        fill="none"
        stroke="var(--ink-faint)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />

      {/* Ihre Kurve */}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={toPath(mine)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Punkt, an dem die Schwelle unterschritten wird */}
      {replaceMonth !== null && replaceMonth <= 36 ? (
        <circle
          cx={x(replaceMonth)}
          cy={y(REPLACE_THRESHOLD)}
          r="4"
          fill="var(--surface-raised)"
          stroke="var(--warn)"
          strokeWidth="2"
        />
      ) : null}
    </svg>
  );
}

export function BatteryCoach() {
  const [habits, setHabits] = useState<BatteryHabits>({
    window: "voll",
    overnight: true,
    climate: "normal",
    fast: "taeglich",
    chargesPerDay: 1,
  });

  const mine = useMemo(() => project(habits), [habits]);
  const typical = useMemo(() => project(typicalHabits), []);
  const advice = useMemo(() => bestSingleChange(habits), [habits]);

  const set = <K extends keyof BatteryHabits>(key: K, value: BatteryHabits[K]) =>
    setHabits((prev) => ({ ...prev, [key]: value }));

  const monthsGained =
    mine.replaceMonth === null
      ? null
      : typical.replaceMonth === null
        ? null
        : mine.replaceMonth - typical.replaceMonth;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
      {/* Gewohnheiten */}
      <div className="space-y-7">
        <fieldset>
          <legend className="text-[0.875rem] font-medium text-ink-strong">
            Wie laden Sie?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {chargeWindows.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => set("window", w.id as ChargeWindow)}
                aria-pressed={habits.window === w.id}
                title={w.detail}
                className={`${chip} ${habits.window === w.id ? chipOn : chipIdle}`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] text-ink-soft">
            {chargeWindows.find((w) => w.id === habits.window)!.detail}
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-[0.875rem] font-medium text-ink-strong">
            Wie oft am Tag?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {chargeCounts.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => set("chargesPerDay", c.value)}
                aria-pressed={habits.chargesPerDay === c.value}
                className={`${chip} ${habits.chargesPerDay === c.value ? chipOn : chipIdle}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[0.875rem] font-medium text-ink-strong">
            Über Nacht am Kabel?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { value: true, label: "Ja, jede Nacht" },
              { value: false, label: "Nein" },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => set("overnight", option.value)}
                aria-pressed={habits.overnight === option.value}
                className={`${chip} ${habits.overnight === option.value ? chipOn : chipIdle}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[0.875rem] font-medium text-ink-strong">
            Wie warm wird es?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {climates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set("climate", c.id as Climate)}
                aria-pressed={habits.climate === c.id}
                title={c.detail}
                className={`${chip} ${habits.climate === c.id ? chipOn : chipIdle}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] text-ink-soft">
            {climates.find((c) => c.id === habits.climate)!.detail}
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-[0.875rem] font-medium text-ink-strong">
            Schnellladen
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {fastChargingLevels.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => set("fast", f.id as FastCharging)}
                aria-pressed={habits.fast === f.id}
                title={f.detail}
                className={`${chip} ${habits.fast === f.id ? chipOn : chipIdle}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Prognose */}
      <div>
        <div className="rounded-[var(--radius-l)] border border-line bg-raised p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[0.875rem] font-medium text-ink-strong">
              Akkugesundheit über drei Jahre
            </p>
            <p className="flex items-center gap-4 font-mono text-[0.6875rem] text-ink-faint">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded-full bg-accent" />
                Sie
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-4 rounded-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to right, var(--ink-faint) 0 5px, transparent 5px 9px)",
                  }}
                />
                Typisch
              </span>
            </p>
          </div>

          <div className="mt-4">
            <Chart
              mine={mine.curve}
              typical={typical.curve}
              replaceMonth={mine.replaceMonth}
            />
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-5">
            {[
              ["Nach 1 Jahr", mine.healthAt12],
              ["Nach 2 Jahren", mine.healthAt24],
              ["Nach 3 Jahren", mine.healthAt36],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-[0.75rem] text-ink-soft">{label}</dt>
                <dd className="mt-1 font-mono text-xl font-semibold tracking-tight text-ink-strong">
                  {Math.round(value as number)}
                  <span className="ml-0.5 text-[0.8125rem] font-normal text-ink-soft">
                    %
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-[0.875rem] leading-relaxed text-ink-soft">
            Bei diesem Verhalten gehen etwa{" "}
            <span className="font-mono text-ink-strong">{mine.cyclesPerYear}</span>{" "}
            Vollzyklen pro Jahr durch die Zelle.{" "}
            {mine.replaceMonth === null ? (
              <>
                Die Tauschschwelle von {REPLACE_THRESHOLD} % wird in drei Jahren
                nicht erreicht.
              </>
            ) : (
              <>
                Die {REPLACE_THRESHOLD} % werden nach{" "}
                <span className="font-mono text-ink-strong">
                  {mine.replaceMonth}
                </span>{" "}
                Monaten unterschritten
                {monthsGained !== null && monthsGained !== 0 ? (
                  <>
                    {" – "}
                    {monthsGained > 0 ? (
                      <span className="text-positive">
                        {monthsGained} Monate später als typisch
                      </span>
                    ) : (
                      <span className="text-[var(--danger)]">
                        {Math.abs(monthsGained)} Monate früher als typisch
                      </span>
                    )}
                  </>
                ) : null}
                .
              </>
            )}
          </p>
        </div>

        {/* Der eine Rat, der am meisten bringt */}
        <div className="mt-5 rounded-[var(--radius-l)] border border-line bg-sunken p-5">
          {advice ? (
            <>
              <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                <Icon name="sparkle" size={14} />
                Die wirksamste einzelne Änderung
              </p>
              <p className="mt-2.5 text-[0.9375rem] font-medium text-ink-strong">
                {advice.label}
                <span className="ml-2 font-mono text-positive">
                  +{advice.gain.toFixed(1)} Punkte
                </span>
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
                {advice.reason}
              </p>
              <p className="mt-2 text-[0.8125rem] text-ink-faint">
                Gerechnet auf drei Jahre, bei sonst gleichem Verhalten. Wir
                nennen bewusst nur eine Änderung – fünf Ratschläge befolgt
                ohnehin niemand.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                <Icon name="check" size={14} />
                Nichts zu verbessern
              </p>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink">
                Bei diesem Verhalten bringt keine einzelne Änderung mehr als
                einen halben Prozentpunkt in drei Jahren. Der Akku altert
                trotzdem – nur eben so langsam, wie es die Chemie zulässt.
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/reparatur"
            className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-strong underline underline-offset-4"
          >
            Was ein Akkutausch kostet
            <Icon name="arrow-right" size={14} />
          </Link>
          <Link
            href="/check"
            className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-soft underline underline-offset-4 hover:text-ink-strong"
          >
            Echten Zustand messen
          </Link>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
          Das ist ein Modell, keine Messung. Es rechnet die beiden bekannten
          Alterungswege – kalendarisch über Temperatur und Ladestand,
          zyklisch über die durchgesetzte Ladungsmenge – mit offengelegten
          Konstanten durch, kalibriert auf das, was wir in der Werkstatt an
          Geräten messen. Ihr tatsächlicher Wert steht im Gerät; wir lesen
          ihn kostenlos aus.
        </p>
      </div>
    </div>
  );
}
