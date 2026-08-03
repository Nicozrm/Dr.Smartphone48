"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { brands, findModel } from "@/lib/data/devices";
import { site } from "@/lib/site";

/*
  Digitaler Zwilling – ein Modell des Geräts, das rechnet statt zu dekorieren.

  Aus Modelljahr, Nutzungsintensität und dem, was der Besitzer beobachtet,
  leitet der Zwilling ab: Akkuzustand, Bauteil-Risiken, empfohlene Wartung und
  die realistisch verbleibende Nutzungsdauer.

  Ehrlichkeit ist Teil des Designs: Es sind Schätzungen aus Alter und
  Nutzungsprofil, keine Messwerte vom Gerät. Das steht sichtbar dran – die
  exakte Messung passiert in der Werkstatt.
*/

type Usage = "leicht" | "normal" | "intensiv";

const usageProfiles: Record<Usage, { label: string; desc: string; cyclesPerYear: number }> = {
  leicht: { label: "Leicht", desc: "Telefonie, Nachrichten, gelegentlich Web", cyclesPerYear: 180 },
  normal: { label: "Normal", desc: "Social, Navigation, Fotos, täglich laden", cyclesPerYear: 300 },
  intensiv: { label: "Intensiv", desc: "Dauerbetrieb, Spiele, mehrmals täglich laden", cyclesPerYear: 480 },
};

const symptoms: { id: string; label: string; icon: IconName; part: string; weight: number }[] = [
  { id: "akku", label: "Hält nicht mehr durch", icon: "battery", part: "Akku", weight: 30 },
  { id: "display", label: "Riss oder Fleck im Bild", icon: "sparkle", part: "Display", weight: 25 },
  { id: "laden", label: "Lädt nur in bestimmter Position", icon: "cpu", part: "Ladebuchse", weight: 20 },
  { id: "warm", label: "Wird ungewöhnlich warm", icon: "waveform", part: "Akku / Board", weight: 15 },
  { id: "kamera", label: "Fotos werden unscharf", icon: "camera", part: "Kamera", weight: 15 },
  { id: "langsam", label: "Reagiert spürbar langsamer", icon: "clock", part: "Software / Akku", weight: 10 },
];

const CURRENT_YEAR = 2026;

function Gauge({ value, label, tone }: { value: number; label: string; tone: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 120 120" width={132} height={132} className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray var(--duration-area) var(--ease-out)" }}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold text-ink-strong">{Math.round(value)}%</span>
        </span>
      </div>
      <span className="mt-2 text-[0.8125rem] text-ink-soft">{label}</span>
    </div>
  );
}

export function DigitalTwin() {
  const [brandId, setBrandId] = useState<string>("apple");
  const [modelId, setModelId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage>("normal");
  const [picked, setPicked] = useState<string[]>([]);

  const brand = brands.find((b) => b.id === brandId) ?? brands[0];
  const entry = modelId ? findModel(brandId, modelId) : undefined;

  const twin = useMemo(() => {
    if (!entry) return null;
    const age = Math.max(0, CURRENT_YEAR - entry.model.year);
    const cycles = age * usageProfiles[usage].cyclesPerYear;

    // Kapazitätsmodell: Li-Ion verliert grob 20 % über 500 Zyklen, danach
    // flacher. Bewusst konservativ – lieber ehrlich als schmeichelhaft.
    const capacity = Math.max(52, 100 - (cycles / 500) * 20);

    const symptomLoad = picked.reduce(
      (sum, id) => sum + (symptoms.find((s) => s.id === id)?.weight ?? 0),
      0,
    );

    // Gesamtzustand: Alter + Nutzung + gemeldete Symptome.
    const health = Math.max(15, Math.min(100, Math.round(100 - age * 6 - symptomLoad * 0.9)));

    // Verbleibende Nutzungsdauer, gedeckelt auf realistische Werte.
    const years = Math.max(0.5, Math.round((health / 100) * 5 * 2) / 2);

    const risks = symptoms
      .filter((s) => picked.includes(s.id))
      .map((s) => ({ part: s.part, label: s.label }));

    const maintenance: string[] = [];
    if (capacity < 82) maintenance.push("Akkutausch – stellt Laufzeit und Spitzenleistung wieder her");
    if (picked.includes("display")) maintenance.push("Displaytausch – schützt vor Folgeschäden durch offene Kanten");
    if (picked.includes("laden")) maintenance.push("Ladebuchse reinigen oder tauschen");
    if (picked.includes("kamera")) maintenance.push("Kameramodul prüfen");
    if (picked.includes("warm")) maintenance.push("Board-Messung – Wärme deutet auf Strompfad oder Zelle hin");
    if (maintenance.length === 0) maintenance.push("Keine Wartung nötig – Zustand unauffällig");

    return { age, cycles, capacity, health, years, risks, maintenance };
  }, [entry, usage, picked]);

  const tone = (v: number) =>
    v >= 75 ? "var(--positive)" : v >= 45 ? "var(--warn)" : "var(--danger)";

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-[background-color,border-color,color] duration-[var(--duration-fast)] ${
      active
        ? "border-accent bg-accent-subtle text-accent"
        : "border-line bg-raised text-ink hover:border-ink-faint"
    }`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      {/* Eingabe */}
      <div className="space-y-10 min-w-0">
        <section>
          <h2 className="text-title">Gerät wählen</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBrandId(b.id);
                  setModelId(null);
                }}
                aria-pressed={brandId === b.id}
                className={chip(brandId === b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {brand.models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelId(m.id)}
                aria-pressed={modelId === m.id}
                className={chip(modelId === m.id)}
              >
                {m.name}
                <span className="ml-2 font-mono text-[0.6875rem] text-ink-faint">{m.year}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-title">Wie nutzen Sie es?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(usageProfiles) as Usage[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUsage(u)}
                aria-pressed={usage === u}
                className={`rounded-[var(--radius-m)] border px-4 py-3.5 text-left transition-[border-color,background-color] duration-[var(--duration-fast)] ${
                  usage === u
                    ? "border-accent bg-accent-subtle"
                    : "border-line bg-raised hover:border-ink-faint"
                }`}
              >
                <span className="block font-medium text-ink-strong">{usageProfiles[u].label}</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-soft">
                  {usageProfiles[u].desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-title">Was fällt Ihnen auf?</h2>
          <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
            Mehrfachauswahl – je genauer, desto belastbarer die Prognose.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {symptoms.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                  }
                  aria-pressed={on}
                  className={`flex items-center gap-3 rounded-[var(--radius-m)] border px-4 py-3 text-left transition-[border-color,background-color] duration-[var(--duration-fast)] ${
                    on ? "border-accent bg-accent-subtle" : "border-line bg-raised hover:border-ink-faint"
                  }`}
                >
                  <Icon name={s.icon} size={18} className={on ? "text-accent" : "text-ink-soft"} />
                  <span className="text-[0.9375rem] text-ink-strong">{s.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Zwilling */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass rounded-[var(--radius-l)] p-6 shadow-raised">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Digitaler Zwilling
          </p>
          <p className="text-title mt-1.5">
            {entry ? `${entry.brand.name} ${entry.model.name}` : "Kein Gerät gewählt"}
          </p>

          {twin ? (
            <>
              <div className="mt-6 flex justify-around">
                <Gauge value={twin.health} label="Gesamtzustand" tone={tone(twin.health)} />
                <Gauge value={twin.capacity} label="Akkukapazität" tone={tone(twin.capacity)} />
              </div>

              <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-[0.875rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Alter</dt>
                  <dd className="font-mono text-ink-strong">
                    {twin.age === 0 ? "Neu" : `${twin.age} Jahre`}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Ladezyklen (geschätzt)</dt>
                  <dd className="font-mono text-ink-strong">≈ {twin.cycles}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Verbleibende Nutzung</dt>
                  <dd className="font-mono text-ink-strong">
                    noch ca. {twin.years.toLocaleString("de-DE")} Jahre
                  </dd>
                </div>
              </dl>

              {twin.risks.length > 0 ? (
                <div className="mt-5 border-t border-line pt-5">
                  <p className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
                    Betroffene Bauteile
                  </p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {twin.risks.map((r) => (
                      <li
                        key={r.part + r.label}
                        className="rounded-full bg-warn-subtle px-2.5 py-1 text-[0.75rem] font-medium"
                        style={{ color: "var(--warn)" }}
                      >
                        {r.part}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5 border-t border-line pt-5">
                <p className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
                  Empfohlene Wartung
                </p>
                <ul className="mt-2.5 space-y-2">
                  {twin.maintenance.map((m) => (
                    <li key={m} className="flex gap-2.5 text-[0.875rem] leading-snug text-ink">
                      <Icon
                        name="check"
                        size={15}
                        className="mt-0.5 shrink-0"
                        style={{ color: "var(--positive)" }}
                      />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/reparatur"
                data-magnetic=""
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-medium text-accent-contrast shadow-button transition-colors hover:bg-accent-hover"
                style={{ transitionProperty: "background-color" }}
              >
                Festpreis für dieses Gerät
                <Icon name="arrow-right" size={16} />
              </Link>
            </>
          ) : (
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              Wählen Sie links ein Modell – der Zwilling berechnet Zustand,
              Akkukapazität und verbleibende Nutzungsdauer sofort.
            </p>
          )}
        </div>

        <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-ink-faint">
          Prognose aus Modelljahr, Nutzungsprofil und Ihren Angaben – keine
          Messung am Gerät. Den exakten Wert misst {site.name} in der Werkstatt
          in unter zwei Minuten.
        </p>
      </aside>
    </div>
  );
}
