"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { brands, findModel } from "@/lib/data/devices";
import { formatEuro } from "@/lib/format";
import { site } from "@/lib/site";
import {
  batteryStates,
  conditions,
  evaluateResale,
  faultOptions,
  storages,
  type BatteryHealth,
  type Condition,
  type Storage,
} from "@/lib/resale";

/*
  Ankaufsrechner.

  Die Zahl ist hier nicht das Ergebnis, sondern die Rechnung. Links stellt
  man das Gerät ein, rechts entsteht Zeile für Zeile, wie sich der Wert
  zusammensetzt – mit Betrag und Begründung, auch bei den Abzügen.

  Der unbequeme Vergleich am Ende gehört dazu: Privat verkauft man fast
  immer teurer. Wer das verschweigt, verkauft einmal gut und nie wieder.
*/

const chip =
  "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[0.875rem] transition-colors duration-[var(--duration-fast)]";
const chipIdle = "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong";
const chipOn = "border-accent bg-accent-subtle font-medium text-accent";

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-[0.875rem] font-medium text-ink-strong">{label}</legend>
      {hint ? <p className="mt-1 text-[0.8125rem] text-ink-soft">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

export function ResaleCalculator() {
  const [brandId, setBrandId] = useState("apple");
  const [modelId, setModelId] = useState("iphone-14");
  const [condition, setCondition] = useState<Condition>("gut");
  const [storage, setStorage] = useState<Storage>("128");
  const [battery, setBattery] = useState<BatteryHealth>("gut");
  const [faults, setFaults] = useState<string[]>([]);
  const [boxed, setBoxed] = useState(false);
  const [locked, setLocked] = useState(false);

  const brand = brands.find((b) => b.id === brandId)!;
  const entry = findModel(brandId, modelId) ?? findModel(brandId, brand.models[0].id)!;

  const result = useMemo(
    () =>
      evaluateResale({
        model: entry.model,
        condition,
        storage,
        battery,
        faults,
        boxed,
        locked,
      }),
    [entry.model, condition, storage, battery, faults, boxed, locked],
  );

  const chooseBrand = (id: string) => {
    setBrandId(id);
    const next = brands.find((b) => b.id === id)!;
    setModelId(next.models[0].id);
    setFaults([]);
  };

  const toggleFault = (id: string) =>
    setFaults((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  // Verfügbare Defekte hängen vom Modell ab – Rückglas gibt es nicht überall.
  const availableFaults = faultOptions.filter(
    (f) => entry.model.prices[f.kind] !== undefined,
  );

  const mailBody = encodeURIComponent(
    [
      `Ankauf-Anfrage`,
      ``,
      `Gerät: ${entry.brand.name} ${entry.model.name} (${storage === "1024" ? "1 TB" : `${storage} GB`})`,
      `Zustand: ${conditions.find((c) => c.id === condition)!.label}`,
      `Akku: ${batteryStates.find((b) => b.id === battery)!.label}`,
      `Defekte: ${faults.length > 0 ? faults.map((f) => faultOptions.find((o) => o.id === f)?.label).join(", ") : "keine"}`,
      `Originalkarton: ${boxed ? "ja" : "nein"}`,
      ``,
      `Selbst errechnete Spanne: ${formatEuro(result.low)} – ${formatEuro(result.high)}`,
    ].join("\n"),
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      {/* Eingabe */}
      <div className="space-y-8">
        <Group label="Marke">
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => chooseBrand(b.id)}
                aria-pressed={brandId === b.id}
                className={`${chip} ${brandId === b.id ? chipOn : chipIdle}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </Group>

        <Group label="Modell">
          <div className="flex flex-wrap gap-2">
            {brand.models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setModelId(m.id);
                  setFaults([]);
                }}
                aria-pressed={entry.model.id === m.id}
                className={`${chip} ${entry.model.id === m.id ? chipOn : chipIdle}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </Group>

        <Group label="Speicher">
          <div className="flex flex-wrap gap-2">
            {storages.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStorage(s.id)}
                aria-pressed={storage === s.id}
                className={`${chip} ${storage === s.id ? chipOn : chipIdle}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Group>

        <Group label="Zustand" hint="Schätzen Sie ehrlich – vor Ort schauen wir ohnehin genau hin.">
          <div className="grid gap-2 sm:grid-cols-2">
            {conditions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCondition(c.id)}
                aria-pressed={condition === c.id}
                className={`rounded-[var(--radius-m)] border p-4 text-left transition-colors duration-[var(--duration-fast)] ${
                  condition === c.id
                    ? "border-accent bg-accent-subtle"
                    : "border-line bg-raised hover:border-ink-faint"
                }`}
              >
                <span className="block text-[0.9375rem] font-medium text-ink-strong">
                  {c.label}
                </span>
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-soft">
                  {c.detail}
                </span>
              </button>
            ))}
          </div>
        </Group>

        <Group
          label="Akkuzustand"
          hint="iPhone: Einstellungen › Batterie › Batteriezustand. Android: je nach Hersteller in der Geräte- oder Akku-Diagnose."
        >
          <div className="flex flex-wrap gap-2">
            {batteryStates.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBattery(b.id)}
                aria-pressed={battery === b.id}
                title={b.detail}
                className={`${chip} ${battery === b.id ? chipOn : chipIdle}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </Group>

        {availableFaults.length > 0 ? (
          <Group label="Bekannte Defekte" hint="Mehrfachauswahl möglich.">
            <div className="flex flex-wrap gap-2">
              {availableFaults.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFault(f.id)}
                  aria-pressed={faults.includes(f.id)}
                  className={`${chip} ${faults.includes(f.id) ? chipOn : chipIdle}`}
                >
                  {faults.includes(f.id) ? <Icon name="check" size={13} /> : null}
                  {f.label}
                </button>
              ))}
            </div>
          </Group>
        ) : null}

        <Group label="Sonstiges">
          <div className="space-y-2">
            <label className="flex cursor-pointer gap-3 rounded-[var(--radius-m)] border border-line bg-raised p-3.5 transition-colors hover:border-ink-faint">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
                checked={boxed}
                onChange={(e) => setBoxed(e.target.checked)}
              />
              <span>
                <span className="block text-[0.875rem] font-medium text-ink-strong">
                  Originalkarton und Zubehör vorhanden
                </span>
                <span className="mt-0.5 block text-[0.8125rem] text-ink-soft">
                  Erhöht den Wiederverkaufswert spürbar.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-[var(--radius-m)] border border-line bg-raised p-3.5 transition-colors hover:border-ink-faint">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
              />
              <span>
                <span className="block text-[0.875rem] font-medium text-ink-strong">
                  Ein Konto ist noch mit dem Gerät verknüpft
                </span>
                <span className="mt-0.5 block text-[0.8125rem] text-ink-soft">
                  iCloud-Aktivierungssperre oder Google-Konto noch aktiv.
                </span>
              </span>
            </label>
          </div>
        </Group>
      </div>

      {/* Ergebnis – die Rechnung, nicht nur die Zahl */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-raised">
          {result.blocked ? (
            <>
              <p className="text-eyebrow">Kein Ankauf möglich</p>
              <h3 className="text-title mt-3">
                Erst das Konto lösen, dann reden wir über Geld.
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                Ein Gerät mit aktiver Aktivierungssperre lässt sich nicht
                einrichten und damit auch nicht weiterverkaufen – unabhängig
                davon, wie gut es aussieht. Kein seriöser Händler kauft es an,
                und wer es doch tut, hat etwas anderes damit vor.
              </p>
              <div className="mt-5 rounded-[var(--radius-m)] border border-line bg-sunken p-4">
                <p className="text-[0.875rem] font-medium text-ink-strong">
                  So lösen Sie es
                </p>
                <ol className="mt-2 space-y-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
                  <li>
                    1. Am Gerät abmelden: Einstellungen › Ihr Name › Abmelden
                    (Apple) bzw. Konten › Google › Konto entfernen.
                  </li>
                  <li>
                    2. Auf Werkseinstellungen zurücksetzen – erst danach ist die
                    Sperre wirklich weg.
                  </li>
                  <li>
                    3. Gerät liegt nicht mehr vor? Über iCloud.com bzw. den
                    Google-Kontobereich aus der Geräteliste entfernen.
                  </li>
                </ol>
              </div>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
                Wir helfen Ihnen kostenlos dabei, solange Sie nachweisen können,
                dass es Ihr Gerät ist. Bringen Sie den Kaufbeleg mit.
              </p>
            </>
          ) : (
            <>
              <p className="text-eyebrow">Ihre Spanne</p>
              <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-ink-strong">
                {formatEuro(result.low)}
                <span className="text-ink-faint"> – </span>
                {formatEuro(result.high)}
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                Schätzung auf Grundlage Ihrer Angaben. Verbindlich wird sie erst
                nach der Prüfung vor Ort – die dauert etwa zehn Minuten und
                kostet nichts.
              </p>

              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[0.875rem] font-medium text-ink-strong">
                  So kommt die Zahl zustande
                </p>
                <ul className="mt-3 space-y-2.5">
                  {result.lines.map((line, i) => (
                    <li key={i}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span
                          className={`text-[0.875rem] ${
                            line.base ? "font-medium text-ink-strong" : "text-ink"
                          }`}
                        >
                          {line.label}
                        </span>
                        <span
                          className={`shrink-0 font-mono text-[0.875rem] ${
                            line.base
                              ? "text-ink-strong"
                              : line.amount < 0
                                ? "text-[var(--danger)]"
                                : "text-positive"
                          }`}
                        >
                          {line.amount > 0 && !line.base ? "+" : ""}
                          {formatEuro(line.amount)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-faint">
                        {line.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={`mailto:${site.email}?subject=${encodeURIComponent("Ankauf-Anfrage")}&body=${mailBody}`}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Angebot anfragen
                <Icon name="arrow-right" size={17} />
              </a>
              <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-ink-faint">
                Zum Termin bitte Ausweis und – wenn vorhanden – den Kaufbeleg
                mitbringen. Wir sind zur Dokumentation des Ankaufs
                verpflichtet.
              </p>
            </>
          )}
        </div>

        {/* Der Vergleich, den kein Ankäufer gern zeigt */}
        {!result.blocked && result.high > 0 ? (
          <div className="mt-5 rounded-[var(--radius-l)] border border-line bg-sunken p-5">
            <p className="text-[0.875rem] font-medium text-ink-strong">
              Privat verkaufen bringt mehr
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
              Ehrlich gesagt: Auf einem Marktplatz liegen die Preise nach
              unserer Erfahrung 25 bis 45 Prozent über dem, was ein Händler
              zahlen kann – für dieses Gerät also grob{" "}
              <span className="font-mono text-ink-strong">
                {formatEuro(Math.round((result.high * 1.25) / 5) * 5)}
              </span>{" "}
              bis{" "}
              <span className="font-mono text-ink-strong">
                {formatEuro(Math.round((result.high * 1.45) / 5) * 5)}
              </span>
              . Dafür schreiben Sie eine Anzeige, beantworten Anfragen,
              verhandeln, versenden oder treffen sich – und tragen das Risiko
              für Rückabwicklung und Zahlungsausfall selbst.
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
              Unser Preis ist der für zehn Minuten, Bargeld und keine
              Nachfragen. Wenn Ihnen die Differenz die Mühe wert ist,
              verkaufen Sie privat – das sagen wir Ihnen lieber jetzt als
              hinterher.
            </p>
            <Link
              href="/zwilling"
              className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-strong underline underline-offset-4"
            >
              Oder behalten und reparieren – hier durchrechnen
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
