"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Der Pixel-Wecker.
 *
 * Ein hängender Bildpunkt ist kein defekter. Beim defekten („dead pixel") ist
 * die Ansteuerung des Teilpunkts unterbrochen – er bleibt schwarz, und daran
 * ändert nichts mehr etwas. Beim hängenden („stuck pixel") sitzt ein
 * Flüssigkristall in einer Stellung fest; er leuchtet dauerhaft rot, grün
 * oder blau. Solche Punkte lassen sich manchmal lösen, indem man sie zwingt,
 * ihre Stellung schnell zu wechseln.
 *
 * Manchmal. Nicht immer, nicht zuverlässig, und niemand kann vorher sagen,
 * ob es klappt. Genau so steht es auch auf der Seite – ein Werkzeug, das
 * Heilung verspricht, wäre hier fehl am Platz.
 *
 * ## Warum ein kleines Feld und kein Vollbild
 *
 * Alle verbreiteten Werkzeuge dieser Art lassen den ganzen Bildschirm
 * flackern. Das ist gleich zweifach schlecht:
 *
 * Erstens hilft es nicht mehr. Bewegt werden muss der eine Bildpunkt, der
 * hängt – die übrigen Millionen arbeiten ohnehin.
 *
 * Zweitens ist großflächiges Flackern zwischen etwa 3 und 50 Hz das
 * Reizmuster, das bei photosensibler Epilepsie Anfälle auslösen kann. Die
 * WCAG-Richtlinie erlaubt schnelles Flackern deshalb ausdrücklich nur auf
 * kleiner Fläche. Ein Feld von wenigen Zentimetern, das man über die Stelle
 * schiebt, ist also nicht die vorsichtige Notlösung, sondern schlicht die
 * bessere Umsetzung.
 *
 * Der Hinweis darauf steht trotzdem über dem Knopf, und gestartet wird erst
 * nach einer ausdrücklichen Bestätigung.
 *
 * ## Warum die Farben so wechseln
 *
 * Nacheinander Rot, Grün, Blau, Weiß und Schwarz: Jeder Teilpunkt wird damit
 * einzeln von ganz an nach ganz aus gefahren. Ein Wechsel nur zwischen Weiß
 * und Schwarz ließe einen hängenden roten Teilpunkt weitgehend in Ruhe.
 */

/** Farbfolge. Jeder Teilpunkt kommt einmal allein und einmal in Gesellschaft. */
const COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000"];

/** Bildwechsel je Sekunde. Schnell genug zum Lösen, langsam genug für 60 Hz. */
const HZ = 12;

/** Übliche Behandlungsdauer. Länger als eine halbe Stunde bringt erfahrungs-
    gemäß nichts mehr – dann sitzt der Punkt fest oder ist tot. */
const MINUTES = 20;

export function PixelWake() {
  const [armed, setArmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [size, setSize] = useState(140);
  const [elapsed, setElapsed] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [at, setAt] = useState({ x: 0, y: 0 });

  /* Die Farbe wird direkt am Element gesetzt, nicht über den Zustand: Zwölf
     Bildwechsel je Sekunde durch React zu schicken hieße, zwölfmal je
     Sekunde einen Baum zu rechnen, um eine Hintergrundfarbe zu ändern. */
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let step = 0;
    const id = window.setInterval(() => {
      step++;
      if (boxRef.current) {
        boxRef.current.style.background = COLORS[step % COLORS.length];
      }
      setElapsed((performance.now() - start) / 1000);
    }, 1000 / HZ);
    return () => window.clearInterval(id);
  }, [running]);

  /* Beim Anhalten das Feld sichtbar leer lassen, nicht auf einer zufälligen
     Farbe stehen – sonst sieht ein blau stehengebliebenes Feld aus wie ein
     Fehler, den das Werkzeug gerade verursacht hat. */
  useEffect(() => {
    if (!running && boxRef.current) boxRef.current.style.background = "";
  }, [running]);

  const onDown = useCallback((event: React.PointerEvent) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    box.setPointerCapture(event.pointerId);
  }, []);

  const onMove = useCallback((event: React.PointerEvent) => {
    const drag = dragRef.current;
    const parent = boxRef.current?.offsetParent as HTMLElement | null;
    if (!drag || !parent) return;
    const rect = parent.getBoundingClientRect();
    setAt({
      x: event.clientX - rect.left - drag.dx,
      y: event.clientY - rect.top - drag.dy,
    });
  }, []);

  const onUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);

  return (
    <div className="wake">
      <div className="max-w-xl">
        <h3 className="text-title">Pixel-Wecker</h3>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Ein hängender Bildpunkt leuchtet dauerhaft rot, grün oder blau –
          bei ihm klemmt der Flüssigkristall in einer Stellung. Manchmal löst
          er sich, wenn man ihn zwingt, schnell zwischen allen Stellungen zu
          wechseln. Schieben Sie das Feld unten über die betroffene Stelle.
        </p>
        <p className="mt-3 text-sm font-medium text-warn">
          Das Feld wechselt {HZ}-mal je Sekunde die Farbe. Wenn Sie
          lichtempfindlich sind oder zu Anfällen neigen, starten Sie es nicht.
          Es bleibt bewusst klein: Großflächiges Flackern in diesem Takt ist
          genau das Reizmuster, das Anfälle auslösen kann – und für den einen
          Bildpunkt, um den es geht, bringt eine große Fläche ohnehin nichts.
        </p>
      </div>

      <div className="wake-stage mt-7">
        <div
          ref={boxRef}
          className="wake-box"
          data-running={running}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            width: size,
            height: size,
            transform: `translate(${at.x}px, ${at.y}px)`,
          }}
          role="img"
          aria-label={
            running
              ? "Farbwechselndes Feld, verschiebbar"
              : "Feld zum Verschieben über den hängenden Bildpunkt"
          }
        >
          {!running ? <span className="wake-hint">verschieben</span> : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
        <label className="flex items-center gap-2.5 text-sm text-ink-strong">
          <input
            type="checkbox"
            checked={armed}
            onChange={(e) => {
              setArmed(e.target.checked);
              if (!e.target.checked) setRunning(false);
            }}
            className="h-4 w-4"
          />
          Ich habe den Hinweis gelesen
        </label>

        <button
          type="button"
          onClick={() => {
            setElapsed(0);
            setRunning((r) => !r);
          }}
          disabled={!armed}
          data-ripple
          className={`press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
            running
              ? "border border-line-strong text-ink-strong hover:border-ink-strong"
              : "bg-accent text-accent-contrast"
          }`}
        >
          {running ? (
            <>
              <span className="scope-live" aria-hidden="true" />
              Anhalten
            </>
          ) : (
            <>
              Wecken starten
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>

        <label className="flex items-center gap-3 text-sm text-ink-soft">
          Feldgröße
          <input
            type="range"
            min={60}
            max={260}
            step={10}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="crack-slider w-32"
            aria-label="Größe des Feldes in Bildpunkten"
          />
          <span className="font-mono text-xs tabular-nums text-ink-faint">
            {size} px
          </span>
        </label>

        {running ? (
          <p className="font-mono text-sm tabular-nums text-ink-strong" role="status">
            {minutes}:{String(seconds).padStart(2, "0")} von {MINUTES}:00
          </p>
        ) : null}
      </div>

      <div className="mt-7 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">Hängend</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Leuchtet dauerhaft in einer Farbe. Der Flüssigkristall sitzt fest,
            die Ansteuerung ist heil. Nur hier hat das Wecken überhaupt eine
            Chance – nach etwa {MINUTES} Minuten ohne Erfolg wird es keine mehr.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">Defekt</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Bleibt schwarz, auch auf weißem Grund. Die Ansteuerung ist
            unterbrochen; daran ändert kein Farbwechsel etwas. Hier hilft nur
            ein neues Panel.
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-faint">
        Ob es wirkt, lässt sich vorher nicht sagen, und wir versprechen es
        nicht. Wenn es nicht wirkt, hat es dem Bildschirm auch nicht
        geschadet – gewechselt werden Farben, wie beim Ansehen eines Films.
      </p>
    </div>
  );
}
