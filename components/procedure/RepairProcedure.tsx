"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { DeviceDiagram } from "@/components/configurator/DeviceDiagram";
import { repairMeta, type RepairKind } from "@/lib/data/devices";
import { procedures, procedureMinutes, type ProcedureStep } from "@/lib/data/procedure";
import { formatMinutes } from "@/lib/format";

/*
  Der Ablauf, den sonst niemand zeigt.

  Auf jedem Preisschild dieser Branche steht eine Dauer, und überall ist sie
  eine Zahl, die man glauben muss. Hier läuft sie ab: echte Arbeitsschritte,
  deren Einzelzeiten in der Summe exakt die zugesagte Dauer ergeben – geprüft
  bei jedem Build gegen `repairMeta.minutes`.

  Das Verkaufsargument ist dabei nicht die Animation, sondern der Inhalt.
  Zwei Schritte stehen ausdrücklich drin, die ein Werbetext weglassen würde:
  dass bei Ladebuchse und Lautsprecher zuerst gereinigt wird (und die
  Reparatur dann entfällt), und dass die Funktionsprüfung **vor** dem
  Verkleben passiert. Wer das liest, versteht, wofür er zahlt.

  Die Wiedergabe ist rafferisch: eine Minute Werkstatt in 320 ms. Ein
  Displaytausch läuft damit in gut vierzehn Sekunden durch – lang genug, um
  den Ablauf zu begreifen, kurz genug, um ihn zu Ende zu sehen.

  ---------------------------------------------------------------------------
  Die Partitur

  Die Schrittliste allein beantwortet nur „was kommt als Nächstes". Sie
  beantwortet nicht die Frage, die ein Blick auf die Uhrzeit im Kopf zuerst
  stellt: Ist das hier eine lange Reparatur mit einem kurzen kritischen
  Moment, oder eine kurze mit lauter gleich schweren Schritten? Diese Form
  sieht man erst, wenn alle Schritte nebeneinanderliegen, proportional zu
  ihrer echten Dauer – wie die Takte einer Partitur, bei der die Notenlänge
  die Zeit ist, nicht nur die Reihenfolge.

  Die Balkenbreite kommt direkt aus `step.minutes`, ohne eigene Rechnung und
  ohne eigene Behauptung: Was hier breit erscheint, ist in derselben Zahl
  breit, die auch `verify:procedure` gegen den zugesagten Festpreis prüft.
*/

/** Eine Werkstattminute in Millisekunden Wiedergabe. */
const MS_PER_MINUTE = 320;

const kinds: RepairKind[] = [
  "display",
  "battery",
  "chargeport",
  "camera",
  "speaker",
  "backglass",
  "diagnose",
];

interface StepState {
  /** Minute, zu der der Schritt beginnt. */
  start: number;
  isPast: boolean;
  isNow: boolean;
  /** Fortschritt innerhalb des laufenden Schritts, 0 bis 1. */
  within: number;
}

/**
 * Zustand jedes Schritts aus einer einzigen Zeitangabe ableiten.
 *
 * Vorher stand diese Rechnung zweimal im Bauteil – einmal, um den laufenden
 * Schritt zu finden, ein zweites Mal (mit einer eigenen Schleife je Zeile),
 * um seine Startzeit für die Anzeige zu bestimmen. Beide Stellen konnten
 * auseinanderlaufen, sobald jemand nur eine davon änderte. Jetzt gibt es nur
 * noch diese eine Stelle, und die Partitur und die Schrittliste lesen
 * dieselben Werte.
 */
function computeStepStates(
  steps: ProcedureStep[],
  elapsed: number,
  done: boolean,
): StepState[] {
  let acc = 0;
  let currentIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    if (elapsed < acc + steps[i].minutes) {
      currentIndex = i;
      break;
    }
    acc += steps[i].minutes;
    currentIndex = i;
  }

  let start = 0;
  return steps.map((step, i) => {
    const stepStart = start;
    start += step.minutes;
    const isPast = done || i < currentIndex;
    const isNow = !done && i === currentIndex;
    const within = isNow
      ? Math.min(1, Math.max(0, (elapsed - stepStart) / step.minutes))
      : isPast
        ? 1
        : 0;
    return { start: stepStart, isPast, isNow, within };
  });
}

export function RepairProcedure() {
  const [kind, setKind] = useState<RepairKind>("display");
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const raf = useRef(0);
  const startedAt = useRef(0);
  const offset = useRef(0);

  const steps = procedures[kind]!;
  const total = procedureMinutes(steps);
  const done = elapsed >= total;
  const stepStates = computeStepStates(steps, elapsed, done);
  const nowIndex = stepStates.findIndex((s) => s.isNow);
  const index = nowIndex === -1 ? steps.length - 1 : nowIndex;
  const current = steps[index];

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    setPlaying(false);
  }, []);

  const tick = useCallback(() => {
    const minutes = offset.current + (performance.now() - startedAt.current) / MS_PER_MINUTE;
    if (minutes >= total) {
      setElapsed(total);
      stop();
      return;
    }
    setElapsed(minutes);
    raf.current = requestAnimationFrame(tick);
  }, [total, stop]);

  const play = useCallback(() => {
    offset.current = elapsed >= total ? 0 : elapsed;
    if (elapsed >= total) setElapsed(0);
    startedAt.current = performance.now();
    setPlaying(true);
    raf.current = requestAnimationFrame(tick);
  }, [elapsed, total, tick]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Reparaturart wechseln setzt den Ablauf zurück.
  const choose = (next: RepairKind) => {
    stop();
    setKind(next);
    setElapsed(0);
    offset.current = 0;
  };

  // Auf einen Schritt springen – auch die Tastatur kommt so überall hin.
  const jumpTo = (i: number) => {
    stop();
    let at = 0;
    for (let k = 0; k < i; k++) at += steps[k].minutes;
    setElapsed(at);
    offset.current = at;
  };

  const clock = `${String(Math.floor(elapsed)).padStart(2, "0")}:${String(
    Math.floor((elapsed % 1) * 60),
  ).padStart(2, "0")}`;

  const chip =
    "inline-flex h-10 items-center rounded-full border px-4 text-[0.875rem] transition-colors duration-[var(--duration-fast)]";

  return (
    <div>
      {/* Reparaturart */}
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => choose(k)}
            aria-pressed={kind === k}
            className={`${chip} ${
              kind === k
                ? "border-accent bg-accent-subtle font-medium text-accent"
                : "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong"
            }`}
          >
            {repairMeta[k].label}
            <span
              className={`ml-2 font-mono text-[0.6875rem] ${
                kind === k ? "text-accent/70" : "text-ink-faint"
              }`}
            >
              {procedureMinutes(procedures[k]!)} min
            </span>
          </button>
        ))}
      </div>

      {/* Die Partitur – Form vor Inhalt */}
      <ProcedureScore
        steps={steps}
        stepStates={stepStates}
        elapsed={elapsed}
        total={total}
        done={done}
        hovered={hovered}
        onHover={setHovered}
        onJump={jumpTo}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        {/* Zeitleiste */}
        <ol className="relative">
          {/* Die durchgehende Linie, an der die Schritte hängen */}
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-2 bottom-2 w-px bg-line"
          />
          {steps.map((step, i) => {
            const state = stepStates[i]!;
            return (
              <li key={step.title} className="relative pl-11">
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  className="block w-full py-3 text-left"
                  aria-current={state.isNow ? "step" : undefined}
                >
                  {/* Punkt auf der Linie – füllt sich, während der Schritt läuft */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-2 top-[1.15rem] flex h-4 w-4 items-center justify-center rounded-full border transition-colors duration-[var(--duration-base)] ${
                      state.isPast
                        ? "border-accent bg-accent"
                        : state.isNow
                          ? "border-accent bg-page"
                          : "border-line bg-page"
                    }`}
                  >
                    {state.isPast ? (
                      <Icon name="check" size={9} className="text-white" />
                    ) : state.isNow ? (
                      <span
                        className="block rounded-full bg-accent transition-[width,height] duration-[var(--duration-base)]"
                        style={{
                          width: `${4 + state.within * 6}px`,
                          height: `${4 + state.within * 6}px`,
                        }}
                      />
                    ) : null}
                  </span>

                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span
                      className={`text-[0.9375rem] ${
                        state.isNow ? "font-medium text-ink-strong" : "text-ink-soft"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="font-mono text-[0.75rem] text-ink-faint">
                      {step.minutes} min
                    </span>
                  </span>

                  {/* Die Begründung steht nur beim laufenden Schritt – sonst
                      wäre die Leiste eine Textwand statt eines Ablaufs. */}
                  {state.isNow ? (
                    <span className="mt-1.5 block max-w-prose text-[0.875rem] leading-relaxed text-ink-soft">
                      {step.detail}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Gerät und Uhr */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-raised">
            <DeviceDiagram
              highlight={done ? "full" : current.part}
              className="mx-auto w-full max-w-[220px]"
            />

            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                  {done ? "Fertig" : playing ? "Läuft" : "Bereit"}
                </span>
                <span className="font-mono text-2xl font-semibold tabular-nums text-ink-strong">
                  {clock}
                </span>
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(elapsed / total) * 100}%` }}
                />
              </div>

              <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-soft">
                {done
                  ? `Nach ${formatMinutes(total)} geht das Gerät über den Tresen – geprüft nach 40 Punkten.`
                  : `${repairMeta[kind].label}: ${steps.length} Schritte, zusammen ${formatMinutes(total)}.`}
              </p>

              <button
                type="button"
                onClick={playing ? stop : play}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                {playing ? (
                  <>Anhalten</>
                ) : done ? (
                  <>Noch einmal</>
                ) : elapsed > 0 ? (
                  <>Weiter</>
                ) : (
                  <>
                    Ablauf abspielen
                    <Icon name="arrow-right" size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-ink-faint">
            Im Zeitraffer: eine Werkstattminute in einem Drittel einer Sekunde.
          </p>
        </aside>
      </div>

      <p className="mt-10 max-w-2xl border-t border-line pt-6 text-[0.875rem] leading-relaxed text-ink-soft">
        Die Einzelzeiten ergeben in der Summe genau die Dauer, die im
        Sofortpreis-Rechner steht – das prüft ein Test bei jedem Build. Es sind
        betriebliche Zusagen, keine Messwerte: Ein festsitzendes Rückglas
        dauert länger, eine Ladebuchse, die sich als Flusen entpuppt, endet
        nach vier Minuten. Beides sagen wir Ihnen, bevor wir weitermachen.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

/**
 * Die Partitur: alle Schritte auf einer Zeile, Breite proportional zur
 * Dauer. Ein Klick springt wie in der Liste darunter; ein Zeigefokus zeigt
 * den Titel darüber, ohne dass Text in schmale Balken gequetscht werden muss
 * – bei sechs bis zehn Schritten auf einer Zeile ist für die meisten davon
 * kein Wort Platz, und halb abgeschnittene Titel wären schlechter als keine.
 */
function ProcedureScore({
  steps,
  stepStates,
  elapsed,
  total,
  done,
  hovered,
  onHover,
  onJump,
}: {
  steps: ProcedureStep[];
  stepStates: StepState[];
  elapsed: number;
  total: number;
  done: boolean;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onJump: (i: number) => void;
}) {
  const nowIndex = stepStates.findIndex((s) => s.isNow);
  const shownIndex = hovered ?? (nowIndex === -1 ? steps.length - 1 : nowIndex);
  const shown = steps[shownIndex]!;
  const playheadPercent = Math.min(100, Math.max(0, (elapsed / total) * 100));

  return (
    <div className="mt-7">
      {/* Beschriftung: immer ein Schritt, nie zehn zugleich – der Zeiger
          bestimmt welcher, in Ruhe der gerade laufende. */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-[0.8125rem] font-medium text-ink-strong">
          {done && hovered === null ? "Fertig" : shown.title}
        </p>
        <p className="shrink-0 font-mono text-[0.75rem] text-ink-faint">
          {shown.minutes} min
        </p>
      </div>

      <div className="relative mt-2.5">
        {/* Der Zeiger – bewegt sich mit `elapsed`, springt bei reduzierter
            Bewegung statt zu gleiten. */}
        <div
          aria-hidden="true"
          className="absolute -top-1 z-10 flex -translate-x-1/2 flex-col items-center transition-[left] duration-100 ease-linear motion-reduce:transition-none"
          style={{ left: `${playheadPercent}%` }}
        >
          <span className="h-2 w-2 rounded-full bg-ink-strong" />
          <span className="h-[60px] w-px bg-ink-strong/70" />
        </div>

        <div
          role="group"
          aria-label={`Ablauf als Balken, proportional zur Dauer – ${steps.length} Schritte, zusammen ${total} Minuten`}
          className="flex h-14 gap-[3px] overflow-hidden rounded-[var(--radius-s)]"
        >
          {steps.map((step, i) => {
            const state = stepStates[i]!;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => onJump(i)}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(i)}
                onBlur={() => onHover(null)}
                aria-label={`${step.title}, ${step.minutes} Minuten, Schritt ${i + 1} von ${steps.length}`}
                aria-current={state.isNow ? "step" : undefined}
                style={{ flexGrow: step.minutes, flexBasis: 0 }}
                className="group relative min-w-[6px] overflow-hidden border-y border-line first:rounded-l-[var(--radius-s)] first:border-l last:rounded-r-[var(--radius-s)] last:border-r"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 transition-colors duration-[var(--duration-fast)] ${
                    state.isPast ? "bg-accent" : "bg-sunken group-hover:bg-accent-subtle"
                  }`}
                />
                {/* Innerhalb des laufenden Schritts füllt sich der Balken von
                    links – dieselbe Zahl (`within`), die auch den Punkt in
                    der Liste darunter wachsen lässt. */}
                {state.isNow ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: `${state.within * 100}%` }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-faint">
        Jeder Balken ist so breit wie seine Dauer – lang heißt sorgfältig, nicht
        kompliziert. Ein Fingerzeig oder Klick zeigt, welcher Schritt das ist.
      </p>
    </div>
  );
}
