"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  COLS,
  type DigitizerResult,
  MIN_COVERAGE,
  ROWS,
  cellIndex,
  evaluate,
  reading,
} from "@/lib/display/digitizer";

/**
 * Der Digitizer-Prüfstand.
 *
 * Die Auswertung – und vor allem die Unterscheidung zwischen „nicht geprüft“
 * und „meldet nicht“ – steht in lib/display/digitizer.ts. Hier steht das
 * Verhalten im Browser, mit drei Entscheidungen:
 *
 * ## Die Felder werden am DOM gefärbt, nicht über den Zustand
 *
 * Ein Finger überstreicht bei 120 Hz gut hundert Felder je Sekunde. Liefe
 * jedes davon durch `useState`, rechnete React hundertmal je Sekunde einen
 * Baum durch, um eine Hintergrundfarbe zu setzen – dieselbe Überlegung wie
 * beim Sturzschreiber und beim Pixel-Wecker. React erfährt erst das
 * Ergebnis.
 *
 * ## Alle Zeiger, nicht nur der erste
 *
 * `pointerdown`/`pointermove` kommen je Berührung einmal. Wer nur den ersten
 * verfolgt, misst mit fünf Fingern dasselbe wie mit einem – und ein
 * Digitizer, der beim vierten Finger aussteigt, fiele nicht auf.
 *
 * ## Kein `setPointerCapture`
 *
 * Naheliegend, um Bewegungen außerhalb der Fläche mitzubekommen, und hier
 * falsch: Der Fang leitet **alle** weiteren Zeiger auf dasselbe Element um
 * und verfälscht damit genau die Zahl, um die es geht. Stattdessen
 * `touch-action: none` auf der Fläche, damit die Seite beim Wischen nicht
 * mitrutscht.
 */

const CELLS = COLS * ROWS;

export function Digitizer() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DigitizerResult | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const coveredRef = useRef<Set<number>>(new Set());
  const activeRef = useRef<Set<number>>(new Set());
  const maxPointsRef = useRef(0);

  /** Alle Felder zurücksetzen – am DOM, wie sie auch gefärbt werden. */
  const clearCells = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    for (const cell of Array.from(grid.children) as HTMLElement[]) {
      delete cell.dataset.on;
      delete cell.dataset.gap;
    }
  }, []);

  const start = useCallback(() => {
    coveredRef.current = new Set();
    activeRef.current = new Set();
    maxPointsRef.current = 0;
    setResult(null);
    setLiveCount(0);
    clearCells();
    setRunning(true);
  }, [clearCells]);

  const finish = useCallback(() => {
    setRunning(false);
    const out = evaluate(coveredRef.current, maxPointsRef.current);
    setResult(out);
    // Die Löcher bekommen ihre Markierung erst jetzt: Während des Wischens
    // wäre jede noch nicht erreichte Stelle ein Loch, und die Fläche
    // flackerte vor Warnfarbe.
    const grid = gridRef.current;
    if (grid) {
      for (const index of out.gaps) {
        const cell = grid.children[index] as HTMLElement | undefined;
        if (cell) cell.dataset.gap = "1";
      }
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const grid = gridRef.current;
    if (!grid) return;

    const mark = (clientX: number, clientY: number) => {
      const rect = grid.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      const index = cellIndex(x, y, rect.width, rect.height);
      if (coveredRef.current.has(index)) return;
      coveredRef.current.add(index);
      const cell = grid.children[index] as HTMLElement | undefined;
      if (cell) cell.dataset.on = "1";
    };

    const onDown = (e: PointerEvent) => {
      activeRef.current.add(e.pointerId);
      maxPointsRef.current = Math.max(maxPointsRef.current, activeRef.current.size);
      setLiveCount(activeRef.current.size);
      mark(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (!activeRef.current.has(e.pointerId)) return;
      // getCoalescedEvents liefert die Zwischenpunkte, die der Browser
      // zusammengefasst hat. Ohne sie reißt eine schnelle Bewegung Löcher in
      // die Spur, und die Auswertung fände Lücken, die der Digitizer sehr
      // wohl gemeldet hat.
      const points = e.getCoalescedEvents?.() ?? [];
      if (points.length) for (const p of points) mark(p.clientX, p.clientY);
      else mark(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      activeRef.current.delete(e.pointerId);
      setLiveCount(activeRef.current.size);
    };

    grid.addEventListener("pointerdown", onDown);
    grid.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      grid.removeEventListener("pointerdown", onDown);
      grid.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [running]);

  const reported =
    typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;

  return (
    <div className="digit">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Digitizer-Prüfstand</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Nach einem Sturz meldet ein Touchscreen manchmal streifen- oder
            fleckenweise nichts mehr. Fahren Sie die Fläche unten mit dem
            Finger ab – am besten in Schlangenlinien, bis in jede Ecke.
            Gesucht wird nicht, was Sie auslassen, sondern was Sie
            <em> überstrichen</em> haben, ohne dass eine Meldung kam.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Keine Berechtigung nötig. Mit mehreren Fingern gleichzeitig prüfen
            Sie zugleich, wie viele Berührungen der Digitizer auseinanderhält.
          </p>
        </div>

        <button
          type="button"
          onClick={running ? finish : start}
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
              Auswerten
            </>
          ) : (
            <>
              {result ? "Noch einmal" : "Prüfung starten"}
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>
      </div>

      <div
        ref={gridRef}
        className="digit-grid mt-7"
        data-running={running}
        role="img"
        aria-label={
          running
            ? "Prüffläche – mit dem Finger abfahren"
            : "Prüffläche des Digitizer-Prüfstands"
        }
      >
        {Array.from({ length: CELLS }).map((_, i) => (
          <span key={i} className="digit-cell" />
        ))}
        {!running && !result ? (
          <span className="digit-hint">Prüfung starten und abfahren</span>
        ) : null}
      </div>

      <dl className="digit-readout mt-5">
        <div>
          <dt>Gleichzeitig</dt>
          <dd className="font-mono tabular-nums">
            {running ? liveCount : (result?.maxPoints ?? 0)}
            {result && !running ? " max." : ""}
          </dd>
        </div>
        <div>
          <dt>Browser meldet</dt>
          <dd className="font-mono tabular-nums">{reported || "—"}</dd>
        </div>
        <div>
          <dt>Bestrichen</dt>
          <dd className="font-mono tabular-nums">
            {result ? `${Math.round(result.coverage * 100)} %` : "—"}
          </dd>
        </div>
        <div>
          <dt>Stumme Felder</dt>
          <dd
            className="font-mono tabular-nums"
            data-warn={!!result?.conclusive && (result?.gaps.length ?? 0) > 0}
          >
            {result?.conclusive ? result.gaps.length : "—"}
          </dd>
        </div>
      </dl>

      {result ? (
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink" role="status">
          {reading(result)}
        </p>
      ) : null}

      <div className="mt-7 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">
            Warum nur eingeschlossene Lücken zählen
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Ein Feld, über das kein Finger lief, sagt nichts. Verdächtig ist
            nur, was ringsum von gemeldeter Fläche umschlossen ist: Dort ist
            der Finger nachweislich vorbeigekommen. Unter{" "}
            {Math.round(MIN_COVERAGE * 100)} % bestrichener Fläche gibt es
            deshalb gar keinen Befund, sondern die Bitte, weiterzufahren.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">
            Was der Prüfstand übersieht
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Eine tote Zone, die bis an den Rand reicht, sieht aus wie eine
            ausgelassene Ecke und wird nicht gemeldet. Das ist Absicht: Lieber
            ein übersehenes Loch als ein erfundenes – aus dem Befund folgt ein
            Kostenvoranschlag über ein neues Display.
          </p>
        </div>
      </div>
    </div>
  );
}
