"use client";

import { useMemo, useState } from "react";
import {
  BATTERY_CAPACITY,
  BATTERY_CYCLES,
  ECODESIGN_SOURCE,
  ECODESIGN_START,
  PARTS_YEARS,
  SECURITY_YEARS,
  applies,
  ecodesignDuties,
  generalRights,
  monthsToCycles,
} from "@/lib/data/repairlaw";
import { brands } from "@/lib/data/devices";
import { supportEntries } from "@/lib/data/support";

/**
 * Was der Hersteller liefern muss.
 *
 * Seit dem 20. Juni 2025 gilt die Ökodesign-Verordnung (EU) 2023/1670. Sie
 * verpflichtet Hersteller, Ersatzteile über Jahre bereitzuhalten – und zwar
 * ausdrücklich auch an Betriebe, die nicht zum Hersteller gehören. Das ist
 * die rechtliche Grundlage für unabhängige Werkstätten, und praktisch keine
 * schreibt es auf ihre Seite.
 *
 * ## Der ehrliche Teil steht zuerst
 *
 * Die Verordnung gilt nur für Geräte ab Juni 2025. Das ist der kleinere Teil
 * dessen, was heute repariert wird. Wer das verschweigt, verkauft einem
 * Kunden einen Anspruch, den er nicht hat – deshalb beginnt dieser Abschnitt
 * mit der Frage, ob sie für sein Gerät überhaupt greift, und zeigt bei „nein"
 * die Rechte, die ohnehin gelten.
 *
 * ## Keine ausgerechneten Enddaten
 *
 * Die Fristen laufen ab dem Verkaufsende, nicht ab dem Erscheinen. Aus dem
 * Erscheinungsjahr folgt deshalb nur eine Untergrenze, und sie heißt auf der
 * Seite auch so. Ein Datum, das nach Auskunft aussieht und geraten ist, wäre
 * genau die Sorte Genauigkeit, die dieses Projekt vermeidet.
 */

/** Ladeverhalten für die Zyklenrechnung. Ein voller Zyklus je Tag ist üblich. */
const HABITS = [
  { id: "sparsam", label: "alle zwei Tage", perDay: 0.5 },
  { id: "normal", label: "einmal am Tag", perDay: 1 },
  { id: "viel", label: "anderthalbmal am Tag", perDay: 1.5 },
];

const yearFormat = new Intl.NumberFormat("de-DE", { useGrouping: false });

/*
  Eine Nachkommastelle, nicht ganze Jahre.

  Gerundet ergaben 800 Zyklen bei anderthalb Ladungen am Tag „nach rund
  1 Jahren" – grammatisch falsch und sachlich zu grob, denn richtig sind
  1,5 Jahre. Die Nachkommastelle behebt beides auf einmal: Sie trifft den
  Wert, und nach einer Dezimalzahl steht im Deutschen immer der Plural.
*/
const spanFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function RepairLaw() {
  /*
    Gebraucht wird je Modell nur das Erscheinungsdatum. Die Auswahl rendert
    direkt aus `brands`, damit die Gruppierung nach Marke erhalten bleibt.

    Bevorzugt das monatsgenaue Datum aus dem Update-Horizont; wo es keines
    gibt, der Jahrgang aus dem Katalog. Beim Stichtag Juni macht der
    Unterschied den Ausschlag.
  */
  const released = useMemo(() => {
    const map = new Map<string, string>();
    for (const brand of brands) {
      for (const model of brand.models) {
        map.set(
          model.id,
          supportEntries.find((entry) => entry.model === model.id)?.released ??
            `${model.year}-01`,
        );
      }
    }
    return map;
  }, []);

  const [selected, setSelected] = useState(brands[0]?.models[0]?.id ?? "");
  const [habit, setHabit] = useState(1);

  const law = applies(released.get(selected) ?? "2000-01");
  const months = monthsToCycles(HABITS[habit].perDay);

  const startDate = new Date(`${ECODESIGN_START}T00:00:00Z`).toLocaleDateString(
    "de-DE",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <div className="law">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-strong">
              Ihr Gerät
            </span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="cert-field appearance-none"
            >
              {brands.map((brand) => (
                <optgroup key={brand.id} label={brand.name}>
                  {brand.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="law-verdict mt-6" data-covered={law.covered}>
            {law.covered ? (
              <>
                <p className="text-eyebrow text-accent">Die Verordnung greift</p>
                <p className="mt-3 leading-relaxed text-ink-strong">
                  Für dieses Gerät muss der Hersteller Ersatzteile bereithalten –
                  mindestens bis{" "}
                  <strong className="font-semibold">
                    {yearFormat.format(law.partsFloor!)}
                  </strong>
                  , Sicherheitsupdates mindestens bis{" "}
                  <strong className="font-semibold">
                    {yearFormat.format(law.securityFloor!)}
                  </strong>
                  .
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Beides sind Untergrenzen, keine Enddaten: Die Fristen laufen
                  ab dem Tag, an dem der Hersteller das Modell nicht mehr
                  verkauft – und der liegt später als das Erscheinen. In der
                  Praxis wird es also länger.
                </p>
              </>
            ) : (
              <>
                <p className="text-eyebrow">Die Verordnung greift nicht</p>
                <p className="mt-3 leading-relaxed text-ink-strong">
                  Dieses Gerät kam vor dem {startDate} auf den Markt. Die
                  Ökodesign-Verordnung gilt erst für spätere Geräte – ein
                  Anspruch auf Ersatzteile besteht hier nicht.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Das ändert nichts an den Rechten aus dem Kaufvertrag, die
                  rechts stehen. Und es ändert nichts daran, dass wir das Gerät
                  reparieren: Wir beziehen Teile ohnehin nicht nur beim
                  Hersteller.
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            Ob ein Gerät erfasst ist, hängt am Inverkehrbringen, nicht am
            Erscheinungsdatum. Hier wird das Erscheinen als Näherung benutzt –
            bei Modellen aus dem Jahr des Stichtags kann das im Einzelfall
            anders liegen.
          </p>
        </div>

        <div>
          <h3 className="text-title">
            {law.covered ? "Was der Hersteller schuldet" : "Was ohnehin gilt"}
          </h3>
          <ul className="law-list mt-5">
            {(law.covered ? ecodesignDuties : generalRights).map((duty) => (
              <li key={duty.id}>
                <p className="flex flex-wrap items-baseline gap-x-3 text-[0.9375rem] font-medium text-ink-strong">
                  {duty.title}
                  {duty.audience ? (
                    <span className="law-tag">
                      {duty.audience === "jeder" ? "an jeden" : "an Werkstätten"}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {duty.detail}
                </p>
              </li>
            ))}
          </ul>

          {law.covered ? (
            <div className="mt-8">
              <p className="text-sm font-medium text-ink-strong">
                {BATTERY_CYCLES} Zyklen – wann sind die erreicht?
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {HABITS.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={habit === index}
                    onClick={() => setHabit(index)}
                    className={`press h-9 rounded-full border px-3.5 text-[0.8125rem] transition-colors ${
                      habit === index
                        ? "border-accent bg-accent text-accent-contrast"
                        : "border-line-strong text-ink-strong hover:border-ink-strong"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Bei diesem Ladeverhalten sind {BATTERY_CYCLES} volle Zyklen nach
                rund{" "}
                <strong className="font-semibold text-ink-strong">
                  {spanFormat.format(months / 12)} Jahren
                </strong>{" "}
                erreicht. Bis dahin muss der Akku laut Verordnung noch{" "}
                {Math.round(BATTERY_CAPACITY * 100)} % seiner ursprünglichen
                Kapazität haben. Darunter ist er nicht kaputt – aber er
                unterschreitet, was zugesagt war.
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-sm leading-relaxed text-ink-faint">
            Zusammengefasst nach{" "}
            <a
              href={ECODESIGN_SOURCE.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              {ECODESIGN_SOURCE.label}
            </a>
            , in Kraft seit dem {startDate}: {PARTS_YEARS} Jahre Ersatzteile,{" "}
            {SECURITY_YEARS} Jahre Sicherheitsupdates, jeweils ab dem Ende des
            Inverkehrbringens. Das ist eine Zusammenfassung und keine
            Rechtsberatung – im Streitfall zählt der Text der Verordnung, nicht
            unsere Wiedergabe.
          </p>
        </div>
      </div>
    </div>
  );
}
