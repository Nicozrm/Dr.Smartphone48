"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  brands,
  findModel,
  repairsForModel,
  type Brand,
  type DiagramPart,
  type RepairKind,
} from "@/lib/data/devices";
import { formatEuro, formatMinutes } from "@/lib/format";
import { site } from "@/lib/site";
import { detectDevice, type DetectResult } from "@/lib/detect";
import { ticketQuery } from "@/lib/ticket";
import { useCountUp } from "@/lib/useCountUp";
import { Icon } from "@/components/ui/Icon";
import { ConsentGate, useConsentGate } from "@/components/ui/ConsentGate";
import Link from "next/link";
import { DeviceDiagram } from "./DeviceDiagram";
import { BrandMark } from "./BrandMark";

/**
 * Günstigster Displaypreis einer Marke – die Zahl auf der Markenkachel.
 * Kommt aus denselben Stammdaten wie der Rechner selbst, damit „ab" auch
 * dann noch stimmt, wenn jemand einen Preis in devices.ts ändert.
 */
function cheapestDisplay(brand: Brand): number {
  return Math.min(
    ...brand.models.map((m) => m.prices.display ?? Number.POSITIVE_INFINITY),
  );
}

/*
  Der Geräte-Vorschlag entsteht erst im Browser – der Server kennt die
  Bildschirmgröße nicht. Käme er per useEffect, würde er nach dem ersten Bild
  eingefügt und schöbe alles darunter nach unten: ein sichtbarer Ruck und ein
  messbarer Layout-Shift.

  useLayoutEffect läuft vor dem Zeichnen. Der Vorschlag ist damit von der
  ersten Darstellung an da oder gar nicht – nichts springt. Auf dem Server
  gibt es kein Layout, dort bleibt es bei useEffect.
*/
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  const consent = useConsentGate();

  // Erkennung einmal vor dem ersten Bild – rein lesend, ohne Netzwerk.
  useBeforePaint(() => {
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
  /* Der angezeigte Betrag läuft auf den gerechneten zu. `total` bleibt die
     Wahrheit – in die E-Mail, ins Ticket und in die Zusammenfassung geht nie
     der laufende Wert, sondern immer der endgültige. */
  const shownTotal = useCountUp(total);

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
    // Ohne Einwilligung wird kein E-Mail-Entwurf geöffnet – der Entwurf
    // trägt Name, Telefonnummer und Gerät, und die gehören nicht ungefragt
    // in ein fremdes Programm.
    if (!consent.allow()) return;

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

  /*
    Der Ruhezustand trägt bewusst keinen Schatten und der Hover einen weichen:
    Wenn schon die unberührte Kachel schwebt, bleibt für die Reaktion nichts
    übrig. Bewegung gibt es keine – bei einem Raster aus zehn Kacheln würde
    jede angehobene Kachel die Reihe darunter optisch verziehen.
  */
  const optionBase =
    "cursor-pointer rounded-[var(--radius-m)] border text-left transition-[border-color,background-color,box-shadow,scale] duration-[var(--duration-base)] ease-[var(--ease-out)]";
  const optionIdle =
    "border-line bg-raised hover:border-ink-faint hover:shadow-raised";
  const optionActive =
    "border-accent bg-accent-subtle shadow-[inset_0_0_0_1px_var(--accent)]";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
      {/* Linke Spalte: Schritte */}
      <div className="space-y-14 min-w-0">
        {/* Schritt 1: Marke */}
        <section className="scroll-mt-24">
          <StepLabel number="01">Welche Marke?</StepLabel>
          {/*
            Große Kacheln statt einer Reihe von Textknöpfen. Die Marke ist der
            erste Schritt von vieren – wenn schon der erste wie ein Formular
            aussieht, sind es die anderen drei auch.

            Auf jeder Kachel steht der niedrigste Displaypreis der Baureihe.
            Das ist die Zahl, wegen der die meisten hier sind, und sie steht
            damit eine Interaktion früher als bisher. „Ab" ist wörtlich
            gemeint: Sie kommt aus lib/data/devices.ts und ist der tatsächlich
            günstigste Wert der Marke, keine Lockzahl.
          */}
          <div className="mt-5 grid grid-cols-3 gap-3 md:gap-4">
            {brands.map((b) => {
              // Die Erkennung markiert die passende Marke, statt einen Kasten
              // einzuschieben: absolut positioniert, damit die Schaltfläche
              // ihre Maße behält und nichts springt, wenn der Hinweis
              // nachträglich erscheint.
              const suggested =
                !modelId &&
                !detectDismissed &&
                detected?.candidates.some((c) => c.brand.id === b.id) === true;
              const activeBrand = brandId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => chooseBrand(b.id)}
                  aria-pressed={activeBrand}
                  data-ripple="ink"
                  className={`${optionBase} press ${
                    activeBrand ? optionActive : optionIdle
                  } group relative flex flex-col items-center px-3 py-5 text-center md:px-4 md:py-6`}
                >
                  {suggested ? (
                    <span className="absolute inset-x-0 -top-2.5 flex justify-center">
                      <span className="inline-flex h-5 items-center rounded-full bg-accent px-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-accent-contrast">
                        erkannt
                      </span>
                    </span>
                  ) : null}
                  <BrandMark
                    brand={b.id}
                    className={`h-14 w-auto transition-[color,translate] duration-[var(--duration-base)] ease-[var(--ease-out)] md:h-16 ${
                      activeBrand
                        ? "text-accent"
                        : "text-ink-faint group-hover:-translate-y-0.5 group-hover:text-ink-soft"
                    }`}
                  />
                  <span className="mt-3.5 block font-medium text-ink-strong">
                    {b.name}
                  </span>
                  <span className="mt-1 block text-[0.75rem] leading-snug text-ink-soft">
                    {b.models.length} Modelle
                  </span>
                  <span className="mt-2 block font-mono text-[0.75rem] text-ink-faint">
                    Display ab {formatEuro(cheapestDisplay(b))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Schritt 2: Modell.
            `inert` statt `aria-hidden` + `pointer-events-none`: Ein
            aria-hidden-Bereich, dessen Schaltflächen weiter fokussierbar
            bleiben, ist laut WCAG unzulässig. Die Tabulatortaste landete in
            einem Feld, das die Vorlesehilfe nicht ankündigt und die Maus nicht
            bedienen kann. `inert` nimmt den Teilbaum aus Fokusreihenfolge,
            Zeigerereignissen und Barrierefreiheitsbaum zugleich. */}
        <section
          ref={modelRef}
          className={`scroll-mt-24 transition-opacity duration-[var(--duration-base)] ${
            brand ? "opacity-100" : "opacity-30"
          }`}
          inert={!brand}
        >
          <StepLabel number="02">Welches Modell?</StepLabel>
          <div
            key={brand?.id ?? "keine"}
            className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {(brand?.models ?? []).map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => chooseModel(m.id)}
                aria-pressed={modelId === m.id}
                data-ripple="ink"
                className={`${optionBase} press ${
                  modelId === m.id ? optionActive : optionIdle
                } model-card flex flex-col px-4 py-3.5`}
                /* Gestaffelter Einlauf: Die Liste wechselt beim Markenwechsel
                   komplett, und 8 bis 10 Kacheln, die gleichzeitig erscheinen,
                   liest niemand – sie blinken nur. Der Versatz von 24 ms je
                   Kachel führt den Blick von links oben nach rechts unten.
                   `key` am Markenwechsel sorgt dafür, dass die Animation bei
                   jedem Wechsel neu startet. */
                style={{ animationDelay: `${Math.min(i, 11) * 24}ms` }}
              >
                <span className="block text-[0.9375rem] font-medium text-ink-strong">
                  {m.name}
                </span>
                <span className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-xs text-ink-faint">{m.year}</span>
                  {m.prices.display ? (
                    <span className="font-mono text-xs text-ink-soft">
                      ab {formatEuro(m.prices.display)}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Schritt 3: Schaden */}
        <section
          ref={damageRef}
          className={`scroll-mt-24 transition-opacity duration-[var(--duration-base)] ${
            entry ? "opacity-100" : "opacity-30"
          }`}
          inert={!entry}
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
                    data-ripple="ink"
                    className={`${optionBase} press ${
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
            chosen.length > 0 ? "opacity-100" : "opacity-30"
          }`}
          inert={chosen.length === 0}
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
            <ConsentGate {...consent.gate} channel="mail" />
            <button
              type="submit"
              data-magnetic=""
              data-ripple=""
              {...consent.sendProps()}
              className="press inline-flex h-13 w-full items-center justify-center rounded-full bg-accent px-7 text-base font-medium text-accent-contrast shadow-button transition-[background-color,box-shadow,scale] duration-[var(--duration-base)] hover:bg-accent-hover hover:shadow-[var(--shadow-button-hover)] sm:w-auto"
            >
              <span className="relative z-[1] inline-flex items-center gap-2">
                Anfrage per E-Mail senden
                <Icon name="arrow-right" size={18} />
              </span>
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
        {/* Glas statt Vollweiß und ein Lichtabfall von oben: Die Vorschau ist
            das Schaufenster des Rechners, sie darf sich vom Formular daneben
            unterscheiden. */}
        <div className="glass-micro lightfall overflow-hidden rounded-[var(--radius-xl)] p-6 shadow-floating">
          <DeviceDiagram highlight={highlight} className="mx-auto w-full max-w-[300px]" />

          <div className="mt-2 border-t border-line pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
              {entry ? `${entry.brand.name} ${entry.model.name}` : "Ihr Gerät"}
            </p>

            {/*
              Geräte-Erkennung – schlägt vor, behauptet nichts.

              Sie steht hier und nicht über den Schritten, obwohl sie dort
              auffälliger wäre. Grund: Der Vorschlag entsteht erst im Browser,
              denn nur der kennt die Bildschirmgröße. Über den Schritten
              eingefügt, schöbe er beim Nachladen die ganze Seite nach unten –
              messbar als Layout-Shift, spürbar als Ruck unter dem Finger.
              In dieser Spalte steht darunter nichts, was springen könnte.
            */}
            {detected && detected.candidates.length > 0 && !detectDismissed && !modelId ? (
              <div className="mt-4 rounded-[var(--radius-m)] border border-accent/35 bg-accent-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-accent">
                    <Icon name="cpu" size={13} />
                    Gerät erkannt
                  </p>
                  <button
                    type="button"
                    onClick={() => setDetectDismissed(true)}
                    aria-label="Vorschlag ausblenden"
                    className="-mr-1.5 -mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink-strong"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>

                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink">
                  {detected.candidates.length === 1
                    ? "Ihr Bildschirm passt genau hierzu:"
                    : "Ihr Bildschirm passt zu mehreren baugleich großen Geräten:"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
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
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[0.8125rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                    >
                      {c.brand.name} {c.model.name}
                      <Icon name="arrow-right" size={13} />
                    </button>
                  ))}
                </div>

                <p className="mt-2.5 font-mono text-[0.6875rem] text-ink-faint">
                  {detected.screen.w} × {detected.screen.h} px · {detected.screen.dpr.toFixed(2)}×
                  {detected.ambiguous ? " · nicht eindeutig, bitte bestätigen" : ""}
                </p>
              </div>
            ) : null}

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
              {/*
                tabular-nums ist hier kein Detail, sondern die Bedingung dafür,
                dass das Hochzählen erträglich ist: Mit proportionalen Ziffern
                ändert sich bei jedem Zwischenwert die Breite, und der Betrag
                zappelt während des Laufs seitlich hin und her.

                aria-live meldet den Endbetrag, nicht jeden Zwischenschritt –
                deshalb steht der gerechnete Wert im Text der Vorlesehilfe und
                der laufende nur im sichtbaren Feld.
              */}
              <span className="relative">
                <span
                  aria-hidden="true"
                  className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-ink-strong"
                >
                  {formatEuro(shownTotal)}
                </span>
                <span className="sr-only" aria-live="polite">
                  Festpreis {formatEuro(total)}
                </span>
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
