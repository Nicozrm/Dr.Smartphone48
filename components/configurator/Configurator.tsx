"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  brands,
  findModel,
  repairsForModel,
  type DiagramPart,
  type RepairKind,
} from "@/lib/data/devices";
import { formatEuro, formatMinutes } from "@/lib/format";
import { site } from "@/lib/site";
import { detectDevice, type DetectResult } from "@/lib/detect";
import { ticketQuery } from "@/lib/ticket";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import { DeviceDiagram } from "./DeviceDiagram";

function StepLabel({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-[0.8125rem] text-ink-faint">{number}</span>
      <h2 className="text-title">{children}</h2>
    </div>
  );
}

export function Configurator() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [selected, setSelected] = useState<RepairKind[]>([]);
  const [highlight, setHighlight] = useState<DiagramPart | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [detected, setDetected] = useState<DetectResult | null>(null);
  const [detectDismissed, setDetectDismissed] = useState(false);

  // Erkennung einmal nach dem Mount – rein lesend, ohne Netzwerk.
  useEffect(() => {
    try {
      setDetected(detectDevice());
    } catch {
      // Erkennung ist Komfort, kein Kernweg.
    }
  }, []);

  const modelRef = useRef<HTMLDivElement>(null);
  const damageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const brand = brands.find((b) => b.id === brandId) ?? null;
  const entry = brandId && modelId ? findModel(brandId, modelId) : undefined;
  const repairs = entry ? repairsForModel(entry.model) : [];

  const chosen = repairs.filter((r) => selected.includes(r.kind));
  const total = chosen.reduce((sum, r) => sum + r.price, 0);
  const minutes = chosen.reduce((sum, r) => sum + r.minutes, 0);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const chooseBrand = (id: string) => {
    setBrandId(id);
    setModelId(null);
    setSelected([]);
    setHighlight(null);
    setSubmitted(false);
    scrollTo(modelRef);
  };

  const chooseModel = (id: string) => {
    setModelId(id);
    setSelected([]);
    setHighlight(null);
    setSubmitted(false);
    scrollTo(damageRef);
  };

  const toggleRepair = (kind: RepairKind, part: DiagramPart) => {
    setSelected((prev) => {
      const active = prev.includes(kind);
      const next = active ? prev.filter((k) => k !== kind) : [...prev, kind];
      setHighlight(active ? null : part);
      return next;
    });
    setSubmitted(false);
  };

  const summaryText = useMemo(() => {
    if (!entry || chosen.length === 0) return "";
    const lines = chosen.map((r) => `– ${r.label}: ${formatEuro(r.price)}`);
    return [
      `Terminanfrage über den Sofortpreis-Rechner`,
      ``,
      `Gerät: ${entry.brand.name} ${entry.model.name}`,
      `Reparaturen:`,
      ...lines,
      `Gesamtpreis: ${formatEuro(total)}`,
      `Voraussichtliche Dauer: ${formatMinutes(minutes)}`,
    ].join("\n");
  }, [entry, chosen, total, minutes]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const phone = String(data.get("phone") ?? "");
    const wish = String(data.get("wish") ?? "");
    const body = [
      summaryText,
      ``,
      `Name: ${name}`,
      phone ? `Telefon: ${phone}` : "",
      wish ? `Wunschtermin: ${wish}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const subject = `Terminanfrage – ${entry?.brand.name} ${entry?.model.name}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  const optionBase =
    "cursor-pointer rounded-[var(--radius-m)] border text-left transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]";
  const optionIdle = "border-line bg-raised hover:border-ink-faint";
  const optionActive = "border-accent bg-accent-subtle shadow-[inset_0_0_0_1px_var(--accent)]";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
      {/* Linke Spalte: Schritte */}
      <div className="space-y-14 min-w-0">
        {/* Geräte-Erkennung – schlägt vor, behauptet nichts. */}
        {detected && detected.candidates.length > 0 && !detectDismissed && !modelId ? (
          <div className="glass rounded-[var(--radius-l)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                  <Icon name="cpu" size={14} />
                  Gerät erkannt
                </p>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">
                  {detected.candidates.length === 1
                    ? "Ihr Bildschirm passt genau zu diesem Gerät:"
                    : "Ihr Bildschirm passt zu diesen Geräten – mehrere Generationen sind baugleich groß:"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetectDismissed(true)}
                aria-label="Vorschlag ausblenden"
                className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink-strong"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              {detected.candidates.map((c) => (
                <button
                  key={c.model.id}
                  type="button"
                  onClick={() => {
                    setBrandId(c.brand.id);
                    setModelId(c.model.id);
                    setSelected([]);
                    setHighlight(null);
                    setSubmitted(false);
                    scrollTo(damageRef);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-accent bg-accent-subtle px-4 text-[0.875rem] font-medium text-accent transition-opacity hover:opacity-80"
                >
                  {c.brand.name} {c.model.name}
                  <Icon name="arrow-right" size={14} />
                </button>
              ))}
            </div>

            <p className="mt-3 font-mono text-[0.6875rem] text-ink-faint">
              {detected.screen.w} × {detected.screen.h} px · {detected.screen.dpr.toFixed(2)}×
              {detected.ambiguous ? " · nicht eindeutig, bitte bestätigen" : ""}
            </p>
          </div>
        ) : null}

        {/* Schritt 1: Marke */}
        <section className="scroll-mt-24">
          <StepLabel number="01">Welche Marke?</StepLabel>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => chooseBrand(b.id)}
                aria-pressed={brandId === b.id}
                className={`${optionBase} ${
                  brandId === b.id ? optionActive : optionIdle
                } px-4 py-5 text-center`}
              >
                <span className="block font-medium text-ink-strong">{b.name}</span>
                <span className="mt-1 block text-[0.8125rem] text-ink-soft">
                  {b.models.length} Modelle
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Schritt 2: Modell */}
        <section
          ref={modelRef}
          className={`scroll-mt-24 transition-opacity duration-[var(--duration-base)] ${
            brand ? "opacity-100" : "pointer-events-none opacity-30"
          }`}
          aria-hidden={!brand}
        >
          <StepLabel number="02">Welches Modell?</StepLabel>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(brand?.models ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => chooseModel(m.id)}
                aria-pressed={modelId === m.id}
                className={`${optionBase} ${
                  modelId === m.id ? optionActive : optionIdle
                } px-4 py-4`}
              >
                <span className="block text-[0.9375rem] font-medium text-ink-strong">
                  {m.name}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-ink-faint">
                  {m.year}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Schritt 3: Schaden */}
        <section
          ref={damageRef}
          className={`scroll-mt-24 transition-opacity duration-[var(--duration-base)] ${
            entry ? "opacity-100" : "pointer-events-none opacity-30"
          }`}
          aria-hidden={!entry}
        >
          <StepLabel number="03">Was ist defekt?</StepLabel>
          <p className="mt-2 pl-10 text-[0.9375rem] text-ink-soft">
            Mehrfachauswahl möglich – der Preis aktualisiert sich sofort.
          </p>
          <ul className="mt-5 space-y-3">
            {repairs.map((r) => {
              const active = selected.includes(r.kind);
              return (
                <li key={r.kind}>
                  <button
                    type="button"
                    onClick={() => toggleRepair(r.kind, r.part)}
                    onMouseEnter={() => setHighlight(r.part)}
                    onMouseLeave={() =>
                      setHighlight(
                        chosen.length > 0 ? repairMetaPart(chosen.at(-1)!.kind, repairs) : null,
                      )
                    }
                    aria-pressed={active}
                    className={`${optionBase} ${
                      active ? optionActive : optionIdle
                    } flex w-full items-center justify-between gap-4 px-5 py-4`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-ink-strong">{r.label}</span>
                      <span className="mt-0.5 block text-[0.875rem] text-ink-soft">
                        {r.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[0.9375rem] font-medium text-ink-strong">
                        {r.price === 0 ? "Kostenlos" : `ab ${formatEuro(r.price)}`}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-ink-faint">
                        {formatMinutes(r.minutes)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Schritt 4: Termin */}
        <section
          ref={formRef}
          className={`scroll-mt-24 transition-opacity duration-[var(--duration-base)] ${
            chosen.length > 0 ? "opacity-100" : "pointer-events-none opacity-30"
          }`}
          aria-hidden={chosen.length === 0}
        >
          <StepLabel number="04">Termin anfragen</StepLabel>
          <p className="mt-2 pl-10 text-[0.9375rem] text-ink-soft">
            Unverbindlich. Wir melden uns innerhalb von 30 Minuten während der
            Öffnungszeiten.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
                  Name
                </span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  className="h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint focus:border-accent"
                  placeholder="Vor- und Nachname"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
                  Telefon <span className="font-normal text-ink-faint">(optional)</span>
                </span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint focus:border-accent"
                  placeholder="Für schnelle Rückfragen"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
                Wunschtermin <span className="font-normal text-ink-faint">(optional)</span>
              </span>
              <input
                name="wish"
                className="h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint focus:border-accent"
                placeholder="z. B. morgen ab 16 Uhr"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-accent-hover sm:w-auto"
            >
              Anfrage per E-Mail senden
              <Icon name="arrow-right" size={18} />
            </button>
            {submitted ? (
              <p className="flex items-center gap-2 text-[0.9375rem] text-positive">
                <Icon name="check" size={18} />
                Ihr E-Mail-Programm öffnet sich mit der fertigen Anfrage.
              </p>
            ) : null}
          </form>
        </section>
      </div>

      {/* Rechte Spalte: Diagramm + Preis */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-raised">
          <DeviceDiagram highlight={highlight} className="mx-auto w-full max-w-[300px]" />

          <div className="mt-2 border-t border-line pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
              {entry ? `${entry.brand.name} ${entry.model.name}` : "Ihr Gerät"}
            </p>

            {chosen.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {chosen.map((r) => (
                  <li
                    key={r.kind}
                    className="flex items-baseline justify-between text-[0.9375rem]"
                  >
                    <span className="text-ink">{r.label}</span>
                    <span className="font-mono text-ink-strong">
                      {r.price === 0 ? "0 €" : formatEuro(r.price)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[0.9375rem] text-ink-soft">
                Wählen Sie Gerät und Schaden – Ihr Festpreis erscheint sofort.
              </p>
            )}

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[0.9375rem] font-medium text-ink-strong">Festpreis</span>
              <span
                key={total}
                className="price-swap font-mono text-3xl font-semibold tracking-tight text-ink-strong"
              >
                {formatEuro(total)}
              </span>
            </div>

            <dl className="mt-4 space-y-2 text-[0.875rem]">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <Icon name="clock" size={16} />
                <dt className="sr-only">Dauer</dt>
                <dd>
                  {chosen.length > 0
                    ? `Fertig in ${formatMinutes(minutes)}`
                    : "Die meisten Reparaturen in unter 1 Stunde"}
                </dd>
              </div>
              <div className="flex items-center gap-2.5 text-ink-soft">
                <Icon name="shield" size={16} />
                <dt className="sr-only">Garantie</dt>
                <dd>{site.warrantyMonths} Monate Garantie auf Teil und Arbeit</dd>
              </div>
            </dl>

            {/* Aus dem Preis wird ein Vorgang: eigene Nummer, QR-Code zum
                Vorzeigen, druckbares Übergabeprotokoll. */}
            {entry && chosen.length > 0 ? (
              <Link
                href={`/ticket?${ticketQuery(
                  entry.brand.id,
                  entry.model.id,
                  chosen.map((r) => r.kind),
                )}`}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line-strong text-[0.9375rem] font-medium text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong"
              >
                Ticket erstellen
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-center text-[0.8125rem] text-ink-faint">
          Festpreis. Keine versteckten Kosten. Zahlung erst nach der Reparatur.
        </p>
      </aside>
    </div>
  );
}

function repairMetaPart(
  kind: RepairKind,
  repairs: { kind: RepairKind; part: DiagramPart }[],
): DiagramPart | null {
  return repairs.find((r) => r.kind === kind)?.part ?? null;
}
