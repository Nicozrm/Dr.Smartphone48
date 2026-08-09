"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  LATE_FACTOR,
  SAMPLE_FRAMES,
  type Summary,
  histogram,
  intervalsFrom,
  reading,
  summarise,
} from "@/lib/display/framerate";

/**
 * Der Bildfrequenz-Schreiber.
 *
 * Die Auswertung steht in lib/display/framerate.ts und ist dort ohne Browser
 * prüfbar. Hier steht das, was nur im Browser geht – und zwei Dinge, die man
 * beim Weiterbauen leicht falsch macht:
 *
 * ## Während der Messung wird nichts gerendert
 *
 * Der Zähler läuft über `requestAnimationFrame`, und genau dessen Abstände
 * sind die Messgröße. Würde React je Bild einen Zustand setzen, maße das
 * Werkzeug die Kosten seiner eigenen Anzeige – ein Instrument, das sich
 * selbst misst. Der Fortschrittsbalken wird deshalb direkt am Element
 * gesetzt, genau wie die Kurve beim Sturzschreiber, und React erfährt nur
 * das Ergebnis.
 *
 * ## Ein Wechsel in den Hintergrund bricht ab
 *
 * Browser drosseln Hintergrund-Tabs auf ein Bild je Sekunde oder weniger.
 * Wer wegwechselt, misst diese Drossel und nicht seinen Bildschirm – dieselbe
 * Regel wie beim Drosselschreiber, und aus demselben Grund endet die Messung
 * dann mit einer Erklärung statt mit einer Zahl.
 */

/** Fächer des Verteilungsdiagramms. */
const BINS = 48;

/** Obergrenze der Achse als Vielfaches der üblichen Bilddauer. Alles darüber
    landet im letzten Fach – siehe `histogram`. */
const AXIS_FACTOR = 3;

type Phase = "idle" | "läuft" | "fertig" | "abgebrochen";

const msFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const hzFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function FrameRate() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Summary | null>(null);
  const [bars, setBars] = useState<number[]>([]);
  const [axisMax, setAxisMax] = useState(0);

  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const abortRef = useRef(false);

  useEffect(
    () => () => {
      abortRef.current = true;
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const run = useCallback(() => {
    abortRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setResult(null);
    setBars([]);
    setPhase("läuft");

    const times: number[] = [];

    const tick = (now: number) => {
      if (abortRef.current) return;
      if (document.hidden) {
        setPhase("abgebrochen");
        return;
      }

      times.push(now);

      /* Am Element vorbei an React: siehe Kopfkommentar. */
      if (barRef.current) {
        const pct = (times.length / SAMPLE_FRAMES) * 100;
        barRef.current.style.width = `${Math.min(100, pct)}%`;
      }

      if (times.length >= SAMPLE_FRAMES) {
        /* Der erste Abstand ist kein Bild, sondern der Rest der Arbeit, die
           beim Drücken noch lief. Er fliegt raus – nicht um das Ergebnis zu
           schönen, sondern weil er nichts über den Bildschirm sagt. */
        const intervals = intervalsFrom(times).slice(1);
        const s = summarise(intervals);
        const max = s.medianMs * AXIS_FACTOR;
        setResult(s);
        setAxisMax(max);
        setBars(histogram(intervals, BINS, max));
        setPhase("fertig");
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
  }, []);

  const running = phase === "läuft";
  const peak = bars.length ? Math.max(...bars) : 0;

  return (
    <div className="frames">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Bildfrequenz-Schreiber</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Ein Ersatzdisplay ist nicht gleich einem Ersatzdisplay – manches
            läuft mit 60 Bildern je Sekunde, wo ab Werk 120 verbaut waren. Auf
            dem Kassenbon steht das nicht; spüren kann man es, beweisen kaum.
            Hier wird {SAMPLE_FRAMES} Bilder lang gemessen, wie schnell und wie
            gleichmäßig Ihr Bildschirm tatsächlich liefert.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Keine Berechtigung nötig. Lassen Sie die Seite im Vordergrund und
            fassen Sie währenddessen nichts an – ein Browser bremst
            Hintergrund-Tabs absichtlich, und gemessen wäre dann diese Bremse.
          </p>
        </div>

        <button
          type="button"
          onClick={running ? stop : run}
          data-ripple
          className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-medium transition-colors ${
            running
              ? "border border-line-strong text-ink-strong hover:border-ink-strong"
              : "bg-accent text-accent-contrast"
          }`}
        >
          {running ? (
            <>
              <span className="scope-live" aria-hidden="true" />
              Abbrechen
            </>
          ) : (
            <>
              {phase === "fertig" ? "Noch einmal" : "Messen"}
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>
      </div>

      {running ? (
        <div className="thermal-bar mt-7" role="progressbar" aria-label="Messung läuft">
          <div ref={barRef} style={{ width: "0%" }} />
        </div>
      ) : null}

      {phase === "abgebrochen" ? (
        <p className="mt-7 max-w-2xl text-sm leading-relaxed text-ink" role="status">
          Abgebrochen – die Seite lag im Hintergrund. Dort drosselt der Browser
          absichtlich auf ein Bild je Sekunde; jede Zahl daraus beschriebe
          diese Drossel und nicht Ihren Bildschirm.
        </p>
      ) : null}

      {result && phase === "fertig" ? (
        <>
          <dl className="frames-readout mt-7">
            <div>
              <dt>Bildfrequenz</dt>
              <dd className="font-mono tabular-nums">
                {result.nearest
                  ? `${result.nearest} Hz`
                  : `${hzFormat.format(result.hz)} Hz`}
              </dd>
            </div>
            <div>
              <dt>Bilddauer</dt>
              <dd className="font-mono tabular-nums">
                {msFormat.format(result.medianMs)} ms
              </dd>
            </div>
            <div>
              <dt>Streuung</dt>
              <dd className="font-mono tabular-nums">
                ± {msFormat.format(result.jitterMs)} ms
              </dd>
            </div>
            <div>
              <dt>Zu spät</dt>
              <dd className="font-mono tabular-nums" data-warn={result.late > 0}>
                {result.late} von {result.count}
              </dd>
            </div>
          </dl>

          {/* Die Verteilung. Ein einzelner Mittelwert verschweigt genau das,
              was man beim Scrollen bemerkt: den einen Balken weit rechts. */}
          <figure className="mt-7">
            <div className="frames-hist" aria-hidden="true">
              {bars.map((n, i) => (
                <span
                  key={i}
                  className="frames-hist__bar"
                  data-late={axisMax > 0 && (i / BINS) * axisMax > result.medianMs * LATE_FACTOR}
                  style={{ height: peak > 0 ? `${(n / peak) * 100}%` : "0%" }}
                />
              ))}
            </div>
            {/* Jede Marke steht auf ihrem Wert – siehe .frames-axis. */}
            <div className="frames-axis" aria-hidden="true">
              <span className="font-mono" data-edge="start" style={{ left: "0%" }}>
                0 ms
              </span>
              <span
                className="font-mono"
                style={{ left: `${(result.medianMs / axisMax) * 100}%` }}
              >
                {msFormat.format(result.medianMs)} ms
              </span>
              <span className="font-mono" data-edge="end" style={{ left: "100%" }}>
                {msFormat.format(axisMax)} ms
              </span>
            </div>
            <figcaption className="mt-3 text-sm leading-relaxed text-ink-soft">
              {reading(result)} Jeder Balken ist ein Fach von{" "}
              {msFormat.format(axisMax / BINS)} ms; ab dem{" "}
              {msFormat.format(LATE_FACTOR)}-fachen der üblichen Bilddauer
              wechselt die Farbe – dort fehlte ein Bild. Was rechts aus der
              Achse liefe, steht im
              letzten Fach: Ein Diagramm, das seine Ausreißer wegschneidet,
              zeigt ein ruhigeres Gerät, als vor Ihnen liegt.
            </figcaption>
          </figure>
        </>
      ) : null}

      <div className="mt-7 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">Was die Zahl beweist</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Nach oben ist sie belastbar: Wer 120 Hz misst, hat ein Panel, das
            120 Hz kann. Zusammen mit dem{" "}
            <Link href="/ersatzteile" className="underline underline-offset-2">
              Vergleich der Ersatzteile
            </Link>{" "}
            ist das der Nachweis, dass nach einer Reparatur noch drinsteckt,
            was vorher drin war.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">Was sie nicht beweist</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Nach unten nicht: Stromsparmodus, wenig Ladung, ein warmes Gerät
            oder eine Systemeinstellung senken die Rate, ohne dass das Panel
            etwas dafür kann. Ein gemessenes 60 heißt „gerade 60“, nicht
            „kann nur 60“.
          </p>
        </div>
      </div>
    </div>
  );
}
