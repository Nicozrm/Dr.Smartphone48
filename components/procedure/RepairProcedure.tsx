"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { DeviceDiagram } from "@/components/configurator/DeviceDiagram";
import { repairMeta, type RepairKind } from "@/lib/data/devices";
import { procedures, procedureMinutes } from "@/lib/data/procedure";
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

export function RepairProcedure() {
  const [kind, setKind] = useState<RepairKind>("display");
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const startedAt = useRef(0);
  const offset = useRef(0);

  const steps = procedures[kind]!;
  const total = procedureMinutes(steps);

  // Welcher Schritt läuft gerade, und wie weit ist er?
  let acc = 0;
  let index = 0;
  for (let i = 0; i < steps.length; i++) {
    if (elapsed < acc + steps[i].minutes) {
      index = i;
      break;
    }
    acc += steps[i].minutes;
    index = i;
  }
  const done = elapsed >= total;
  const current = steps[Math.min(index, steps.length - 1)];

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

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        {/* Zeitleiste */}
        <ol className="relative">
          {/* Die durchgehende Linie, an der die Schritte hängen */}
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-2 bottom-2 w-px bg-line"
          />
          {steps.map((step, i) => {
            const isPast = i < index || done;
            const isNow = i === index && !done;
            let stepStart = 0;
            for (let k = 0; k < i; k++) stepStart += steps[k].minutes;
            const within = Math.min(
              1,
              Math.max(0, (elapsed - stepStart) / step.minutes),
            );
            return (
              <li key={step.title} className="relative pl-11">
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  className="block w-full py-3 text-left"
                  aria-current={isNow ? "step" : undefined}
                >
                  {/* Punkt auf der Linie – füllt sich, während der Schritt läuft */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-2 top-[1.15rem] flex h-4 w-4 items-center justify-center rounded-full border transition-colors duration-[var(--duration-base)] ${
                      isPast
                        ? "border-accent bg-accent"
                        : isNow
                          ? "border-accent bg-page"
                          : "border-line bg-page"
                    }`}
                  >
                    {isPast ? (
                      <Icon name="check" size={9} className="text-white" />
                    ) : isNow ? (
                      <span
                        className="block rounded-full bg-accent transition-[width,height] duration-[var(--duration-base)]"
                        style={{
                          width: `${4 + within * 6}px`,
                          height: `${4 + within * 6}px`,
                        }}
                      />
                    ) : null}
                  </span>

                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span
                      className={`text-[0.9375rem] ${
                        isNow
                          ? "font-medium text-ink-strong"
                          : isPast
                            ? "text-ink-soft"
                            : "text-ink-soft"
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
                  {isNow ? (
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
