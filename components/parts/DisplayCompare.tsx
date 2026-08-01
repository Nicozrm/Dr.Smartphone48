"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/*
  Original gegen Nachbau – zum Anfassen.

  „Wir verbauen nur gute Displays" behauptet jede Werkstatt. Beweisen lässt
  es sich in einem Ladengeschäft schlecht und auf einer Website eigentlich
  gar nicht: Farbe und Schwarzwert eines fremden Panels kann niemand auf dem
  Bildschirm des Besuchers zeigen.

  Eine Eigenschaft aber schon – und ausgerechnet die, die man im Alltag am
  deutlichsten merkt und am schwersten benennt: die Verzögerung zwischen
  Finger und Bild. Die wird hier nicht dargestellt, sondern erzeugt. Wer den
  Punkt über die Fläche zieht, spürt den Unterschied zwischen 0 und 35
  Millisekunden sofort, ohne dass ihm jemand etwas erklären muss.

  Farbe und Schwarzwert stehen daneben – aber als das, was sie sind:
  Veranschaulichung auf dem Bildschirm des Betrachters, nicht Messung. Der
  Unterschied zwischen beidem steht sichtbar dabei, sonst wäre die ganze
  Übung wieder nur eine Behauptung.
*/

interface Grade {
  id: string;
  label: string;
  tag: string;
  /** Zusätzliche Verzögerung in Millisekunden – wird tatsächlich erzeugt. */
  latency: number;
  /** Farbdrift als CSS-Filter – Veranschaulichung, keine Messung. */
  filter: string;
  /** Schwarzwert der Beispielfläche. */
  black: string;
  brightness: string;
  trueTone: string;
  note: string;
  installed: boolean;
}

const grades: Grade[] = [
  {
    id: "original",
    label: "Original",
    tag: "Herstellerteil",
    latency: 0,
    filter: "none",
    black: "#000000",
    brightness: "voll",
    trueTone: "arbeitet wie ab Werk",
    note: "Das Panel, das im Gerät war. Nichts verändert sich – weder messbar noch spürbar.",
    installed: true,
  },
  {
    id: "oem",
    label: "Originalqualität",
    tag: "unsere Empfehlung",
    latency: 8,
    filter: "saturate(0.97)",
    black: "#050506",
    brightness: "praktisch voll",
    trueTone: "arbeitet, wenn der Originalchip übernommen wird",
    note: "Baugleiche Fertigung, einzeln geprüft. Der Unterschied liegt im Bereich dessen, was ein Mensch im direkten Vergleich gerade eben erkennt – und im Preis.",
    installed: true,
  },
  {
    id: "billig",
    label: "Günstiger Nachbau",
    tag: "verbauen wir nicht",
    latency: 35,
    filter: "saturate(0.72) hue-rotate(-8deg) brightness(0.9)",
    black: "#1c2026",
    brightness: "spürbar dunkler, besonders draußen",
    trueTone: "fällt meist aus, Automatik oft ebenfalls",
    note: "Der Grund, warum eine Displayreparatur anderswo 60 € weniger kostet. Man sieht es nicht im Laden – man merkt es nach zwei Wochen.",
    installed: false,
  },
];

/**
 * Verzögert die Zeigerposition um `latency` Millisekunden – echt, nicht gemalt.
 *
 * Die Schleife läuft nur, solange tatsächlich Eingaben ankommen, und hält an,
 * sobald die Anzeige aufgeholt hat. Eine Demonstration, die im Hintergrund
 * dauerhaft Bilder anfordert, wäre ausgerechnet an der Stelle unhöflich, an
 * der es um Sorgfalt geht.
 */
function useLaggedPointer(latency: number) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [touched, setTouched] = useState(false);
  const history = useRef<{ x: number; y: number; t: number }[]>([]);
  const frame = useRef<number | null>(null);
  const lastPush = useRef(0);
  const latencyRef = useRef(latency);
  latencyRef.current = latency;

  const run = useCallback(() => {
    if (frame.current !== null) return;
    const tick = () => {
      const now = performance.now();
      const target = now - latencyRef.current;
      const list = history.current;
      // Jüngstes Ereignis suchen, das alt genug ist, um jetzt sichtbar zu sein.
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].t <= target) {
          setPosition({ x: list[i].x, y: list[i].y });
          break;
        }
      }
      // Alles Ältere als eine Sekunde ist Ballast.
      while (list.length > 2 && list[0].t < now - 1000) list.shift();

      // Nichts mehr in der Warteschlange und keine frische Eingabe: anhalten.
      if (now - lastPush.current > latencyRef.current + 200) {
        frame.current = null;
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const push = (x: number, y: number) => {
    if (!touched) setTouched(true);
    lastPush.current = performance.now();
    history.current.push({ x, y, t: lastPush.current });
    run();
  };

  return { position, push, touched };
}

export function DisplayCompare() {
  const [gradeId, setGradeId] = useState("original");
  const grade = grades.find((g) => g.id === gradeId)!;
  const { position, push, touched } = useLaggedPointer(grade.latency);
  const surface = useRef<HTMLDivElement>(null);

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return;
    push(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    );
  };

  return (
    <div>
      {/* Auswahl */}
      <div className="flex flex-wrap gap-2">
        {grades.map((g) => {
          const on = g.id === gradeId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGradeId(g.id)}
              aria-pressed={on}
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[0.875rem] transition-colors duration-[var(--duration-fast)] ${
                on
                  ? "border-accent bg-accent-subtle font-medium text-accent"
                  : "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong"
              }`}
            >
              {g.label}
              <span
                className={`font-mono text-[0.6875rem] ${
                  on ? "text-accent/70" : "text-ink-faint"
                }`}
              >
                {g.latency === 0 ? "0 ms" : `+${g.latency} ms`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* Die Fläche zum Ziehen */}
        <div>
          <div
            ref={surface}
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-[var(--radius-l)] border border-line"
            style={{
              background: `linear-gradient(150deg, ${grade.black} 0%, ${grade.black} 45%, #10131a 100%)`,
              filter: grade.filter,
              transition: "filter var(--duration-base) var(--ease-out), background var(--duration-base) var(--ease-out)",
            }}
          >
            {/* Farbfeld: Hauttöne und Sättigung sind das, was zuerst auffällt */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14">
              {["#e8b48c", "#c2543f", "#2f6fb5", "#3f8f5f", "#f2c744", "#f5f5f7"].map(
                (color) => (
                  <span key={color} className="flex-1" style={{ background: color }} />
                ),
              )}
            </div>

            {/* Der verzögerte Punkt */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${position?.x ?? 50}%`,
                top: `${position?.y ?? 40}%`,
                background:
                  "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.28) 60%, rgba(255,255,255,0) 72%)",
              }}
            />

            {!touched ? (
              <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-[0.9375rem] font-medium text-white/70">
                Ziehen Sie den Finger oder den Zeiger über die Fläche.
              </p>
            ) : null}
          </div>

          <p className="mt-3 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-soft">
            <Icon name="waveform" size={15} className="mt-0.5 shrink-0 text-ink-faint" />
            <span>
              Die Verzögerung ist echt: Der Punkt zeigt Ihre Zeigerposition von
              vor {grade.latency} Millisekunden. Farbe und Schwarzwert daneben
              sind nur veranschaulicht – ein fremdes Panel lässt sich auf Ihrem
              Bildschirm nicht abbilden.
            </span>
          </p>
        </div>

        {/* Die Eigenschaften */}
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-title">{grade.label}</h3>
            <span
              className={`inline-flex h-7 items-center rounded-full px-3 font-mono text-[0.6875rem] uppercase tracking-[0.1em] ${
                grade.installed
                  ? "bg-positive-subtle text-positive"
                  : "bg-[var(--danger-subtle)] text-[var(--danger)]"
              }`}
            >
              {grade.tag}
            </span>
          </div>

          <p className="mt-3 leading-relaxed text-ink-soft">{grade.note}</p>

          <dl className="mt-6 divide-y divide-line border-y border-line">
            {[
              ["Verzögerung Finger → Bild", grade.latency === 0 ? "wie ab Werk" : `+${grade.latency} ms`],
              ["Helligkeit", grade.brightness],
              ["Schwarzwert", grade.black === "#000000" ? "vollständig schwarz" : grade.black === "#050506" ? "praktisch schwarz" : "sichtbar aufgehellt"],
              ["True Tone / Automatik", grade.trueTone],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
              >
                <dt className="text-[0.875rem] text-ink-soft">{label}</dt>
                <dd className="text-right text-[0.9375rem] font-medium text-ink-strong">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-[0.8125rem] leading-relaxed text-ink-soft">
            Typische Werte aus dem, was uns durch die Hände geht – keine
            Laborwerte und keine Aussage über jedes Panel am Markt. Es gibt
            gute Nachbauten. Sie kosten nur nicht das, was der billige kostet.
          </p>
        </div>
      </div>
    </div>
  );
}
