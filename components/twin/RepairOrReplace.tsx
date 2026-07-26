"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatEuro } from "@/lib/format";

/*
  Reparieren oder neu kaufen – die Frage, die keine Reparaturwerkstatt gern
  laut stellt. Genau deshalb steht sie hier.

  Gerechnet wird mit dem, was der Besucher selbst eingibt: Reparaturpreis und
  der Preis des Geräts, das er stattdessen kaufen würde. Es werden keine
  Neupreise erfunden und keine Empfehlung schöngerechnet – kommt Neukauf
  günstiger heraus, sagt die Seite das auch.

  CO₂: Bei einem Smartphone entfällt der weit überwiegende Teil der
  Lebenszyklus-Emissionen auf die Herstellung, nicht auf die Nutzung. Die hier
  verwendeten Größenordnungen (Herstellung ~60 kg CO₂e, Reparatur ~2 kg)
  stammen aus den Umweltberichten der Hersteller und sind als Näherung
  gekennzeichnet – nicht als Messwert für ein konkretes Modell.
*/

const CO2_NEW_KG = 60;
const CO2_REPAIR_KG = 2;

export function RepairOrReplace() {
  const [repair, setRepair] = useState(129);
  const [newPrice, setNewPrice] = useState(899);
  /** Wie lange das reparierte Gerät voraussichtlich noch genutzt wird. */
  const [months, setMonths] = useState(24);

  const calc = useMemo(() => {
    const saved = newPrice - repair;
    const perMonthRepair = repair / Math.max(1, months);
    // Neukauf über eine typische Nutzungsdauer von 4 Jahren gerechnet.
    const newLifeMonths = 48;
    const perMonthNew = newPrice / newLifeMonths;
    const co2Saved = CO2_NEW_KG - CO2_REPAIR_KG;
    // Ab wie vielen Monaten Restnutzung ist die Reparatur pro Monat günstiger?
    const breakEven = Math.ceil(repair / Math.max(0.01, perMonthNew));
    const worthIt = perMonthRepair <= perMonthNew;
    return { saved, perMonthRepair, perMonthNew, co2Saved, breakEven, worthIt };
  }, [repair, newPrice, months]);

  const field =
    "h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 font-mono text-[0.9375rem] text-ink-strong transition-colors focus:border-accent";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
      {/* Eingaben */}
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
              Reparatur kostet
            </span>
            <input
              type="number"
              min={0}
              max={2000}
              value={repair}
              onChange={(e) => setRepair(Math.max(0, Number(e.target.value)))}
              className={field}
              aria-label="Reparaturpreis in Euro"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
              Neues Gerät kostet
            </span>
            <input
              type="number"
              min={0}
              max={3000}
              value={newPrice}
              onChange={(e) => setNewPrice(Math.max(0, Number(e.target.value)))}
              className={field}
              aria-label="Preis des Neugeräts in Euro"
            />
          </label>
        </div>

        <div className="mt-6">
          <label
            htmlFor="ror-months"
            className="flex items-baseline justify-between text-[0.875rem] font-medium text-ink-strong"
          >
            Wie lange wollen Sie das Gerät noch nutzen?
            <span className="font-mono text-[0.8125rem] text-ink-soft">
              {months} Monate
            </span>
          </label>
          <input
            id="ror-months"
            type="range"
            min={6}
            max={60}
            step={6}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[0.6875rem] text-ink-faint">
            <span>6</span>
            <span>60</span>
          </div>
        </div>

        <p className="mt-6 text-[0.875rem] leading-relaxed text-ink-soft">
          Der Neupreis kommt von Ihnen – wir setzen keinen ein. So sehen Sie
          Ihre Rechnung, nicht unsere.
        </p>
      </div>

      {/* Ergebnis */}
      <div className="glass rounded-[var(--radius-l)] p-6 shadow-raised md:p-7">
        <p
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em]"
          style={{
            background: calc.worthIt ? "var(--positive-subtle)" : "var(--warn-subtle)",
            color: calc.worthIt ? "var(--positive)" : "var(--warn)",
          }}
        >
          <Icon name={calc.worthIt ? "check" : "clock"} size={13} />
          {calc.worthIt ? "Reparatur lohnt sich" : "Knappe Rechnung"}
        </p>

        <p className="text-headline mt-4">
          {calc.worthIt
            ? `${formatEuro(Math.max(0, calc.saved))} bleiben bei Ihnen.`
            : "Rechnen Sie genau nach."}
        </p>

        <p className="mt-3 leading-relaxed text-ink-soft">
          {calc.worthIt
            ? `Auf ${months} Monate gerechnet kostet die Reparatur ${formatEuro(
                Math.round(calc.perMonthRepair),
              )} pro Monat – ein Neugerät über vier Jahre ${formatEuro(
                Math.round(calc.perMonthNew),
              )}.`
            : `Bei ${months} Monaten Restnutzung liegt die Reparatur bei ${formatEuro(
                Math.round(calc.perMonthRepair),
              )} pro Monat, der Neukauf bei ${formatEuro(
                Math.round(calc.perMonthNew),
              )}. Ab etwa ${calc.breakEven} Monaten Nutzung dreht sich das zu Ihren Gunsten.`}
        </p>

        <dl className="mt-6 space-y-3 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[0.9375rem] text-ink-soft">Reparatur pro Monat</dt>
            <dd className="font-mono text-[0.9375rem] font-medium text-ink-strong">
              {formatEuro(Math.round(calc.perMonthRepair))}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[0.9375rem] text-ink-soft">Neugerät pro Monat</dt>
            <dd className="font-mono text-[0.9375rem] font-medium text-ink-strong">
              {formatEuro(Math.round(calc.perMonthNew))}
            </dd>
          </div>
        </dl>

        {/* CO2 */}
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-start gap-3.5">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-s)]"
              style={{ background: "var(--positive-subtle)", color: "var(--positive)" }}
            >
              <Icon name="leaf" size={20} />
            </span>
            <div>
              <p className="font-mono text-2xl font-semibold tracking-tight text-ink-strong">
                ≈ {calc.co2Saved} kg CO₂
              </p>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
                spart eine Reparatur gegenüber einem Neugerät. Beim Smartphone
                entsteht der Großteil der Emissionen in der Herstellung, nicht
                im Betrieb.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/reparatur"
          data-magnetic=""
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-medium text-white shadow-button transition-colors hover:bg-accent-hover"
          style={{ transitionProperty: "background-color" }}
        >
          Festpreis für meine Reparatur
          <Icon name="arrow-right" size={16} />
        </Link>

        <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
          CO₂-Werte sind Größenordnungen aus Hersteller-Umweltberichten
          (Herstellung ≈ {CO2_NEW_KG} kg, Reparatur ≈ {CO2_REPAIR_KG} kg), keine
          Messwerte für Ihr Modell.
        </p>
      </div>
    </div>
  );
}
