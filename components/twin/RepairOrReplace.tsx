"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatEuro } from "@/lib/format";
import { brands } from "@/lib/data/devices";
import { formatDuration, formatMonth, monthsUntil, supportFor } from "@/lib/data/support";

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
  /** Optional: das eigene Modell, für den Update-Horizont. */
  const [modelId, setModelId] = useState("");

  /*
    Die Nutzungsdauer oben ist ein Wunsch. Der Update-Horizont ist eine
    Tatsache. Wer 48 Monate plant und ein Gerät hat, dessen
    Sicherheitsupdates in sechs Monaten enden, rechnet mit einer Zahl, die
    es nicht gibt – und das ist ausgerechnet die Zahl, die aus einer teuren
    Reparatur eine gute macht.

    Gerechnet wird erst nach der Auswahl, also nach der Hydration. Vor dem
    ersten Klick steht hier nichts, deshalb kann `new Date()` an dieser
    Stelle nichts auseinanderlaufen lassen.
  */
  const horizont = useMemo(() => {
    if (!modelId) return null;
    const entry = supportFor(modelId);
    if (!entry) return null;
    const rest = monthsUntil(entry.securityUntil);
    return { entry, rest, zuKnapp: months > rest };
  }, [modelId, months]);

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

        {/* Der Wirklichkeitsabgleich: freiwillig, aber wer ihn ausfüllt,
            bekommt die unbequeme Hälfte der Antwort dazu. */}
        <div className="mt-6">
          <label
            htmlFor="ror-model"
            className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong"
          >
            Welches Gerät?{" "}
            <span className="font-normal text-ink-faint">(freiwillig)</span>
          </label>
          <select
            id="ror-model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className={field}
          >
            <option value="">Ohne Angabe</option>
            {brands.map((brand) => (
              <optgroup key={brand.id} label={brand.name}>
                {brand.models
                  .filter((m) => supportFor(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {horizont ? (
            <div
              className={`mt-3 rounded-[var(--radius-s)] border p-4 ${
                horizont.zuKnapp ? "border-warn/40 bg-warn-subtle" : "border-line bg-sunken"
              }`}
            >
              <p className="text-[0.875rem] leading-relaxed text-ink-strong">
                {horizont.rest <= 0 ? (
                  <>
                    Für dieses Modell sind die Sicherheitsupdates seit{" "}
                    {formatMonth(horizont.entry.securityUntil)} beendet.
                  </>
                ) : horizont.zuKnapp ? (
                  /* Umgestellt statt dekliniert: „in {formatDuration(…)}"
                     ergäbe „in 6 Monate" – die Dauer steht hier im Nominativ
                     und lässt sich nicht in einen Dativ zwingen, ohne die
                     Funktion an zwei Stellen zu doppeln. */
                  <>
                    Sie planen {months} Monate. Die Sicherheitsupdates enden
                    aber schon im {formatMonth(horizont.entry.securityUntil)} –
                    das sind noch {formatDuration(horizont.rest)}.
                  </>
                ) : (
                  <>
                    Passt: Sicherheitsupdates gibt es noch{" "}
                    {formatDuration(horizont.rest)}, bis{" "}
                    {formatMonth(horizont.entry.securityUntil)}.
                  </>
                )}
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                {horizont.entry.source === "hersteller"
                  ? "Zugesagt vom Hersteller."
                  : "Schätzung – der Hersteller nennt keinen Zeitraum."}{" "}
                <Link href="/versorgung" className="text-accent underline underline-offset-4">
                  Alle Modelle
                </Link>
              </p>
            </div>
          ) : null}
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

        {/*
          Die Rechnung oben ist reine Arithmetik mit den Zahlen des Besuchers.
          Sie kann aufgehen und die Entscheidung trotzdem falsch sein, wenn
          die geplante Nutzungsdauer nach dem Ende der Sicherheitsupdates
          liegt. Das steht deshalb als eigener Absatz da und nicht als
          Fußnote – und es korrigiert das Urteil oben ausdrücklich.
        */}
        {horizont && horizont.zuKnapp ? (
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-start gap-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-warn-subtle text-warn">
                <Icon name="shield" size={20} />
              </span>
              <div>
                <p className="font-medium text-ink-strong">
                  Die Zeit rechnet dagegen.
                </p>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
                  {horizont.rest <= 0
                    ? `Dieses Modell bekommt seit ${formatMonth(horizont.entry.securityUntil)} keine Sicherheitsupdates mehr. Die Reparatur können wir trotzdem machen – für Bankgeschäfte würden wir das Gerät nicht mehr benutzen.`
                    : `Die Rechnung oben geht über ${months} Monate. Sicherheitsupdates gibt es aber nur noch ${formatDuration(horizont.rest)}. Rechnen Sie mit ${horizont.rest} Monaten, dann sehen Sie den ehrlichen Wert.`}
                </p>
                {horizont.rest >= 6 ? (
                  <button
                    type="button"
                    onClick={() => setMonths(Math.max(6, Math.min(60, horizont.rest)))}
                    className="mt-2.5 inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-[0.8125rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
                  >
                    Mit {horizont.rest} Monaten rechnen
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

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
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-medium text-accent-contrast shadow-button transition-colors hover:bg-accent-hover"
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
