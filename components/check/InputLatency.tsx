"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  type LatencySummary,
  MIN_TOUCH_SAMPLES,
  NOTICEABLE_MS,
  TAPS,
  type Tap,
  type TouchRate,
  latencyReading,
  summariseTaps,
  touchRate,
  touchRateReading,
} from "@/lib/display/latency";

/**
 * Der Eingabe-Schreiber.
 *
 * Die Auswertung steht in lib/display/latency.ts, prüfbar ohne Browser. Hier
 * steht das Messverfahren, und daran ist genau eine Stelle heikel:
 *
 * ## Der Zeitstempel des Ereignisses, nicht die Uhr im Handler
 *
 * `performance.now()` beim Eintritt in den Handler ist der Zeitpunkt, zu dem
 * das JavaScript **drankam** – nicht der, zu dem die Berührung geschah. Wer
 * damit rechnet, misst null und meldet ein makellos schnelles Gerät.
 * `event.timeStamp` trägt dagegen den Zeitpunkt, an dem der Browser das
 * Ereignis erzeugt hat, auf derselben Uhr. Die Differenz ist die Wartezeit in
 * der Warteschlange, und sie ist der interessante Teil: Sie wächst, wenn die
 * Seite zu tun hat, und sie ist das, was ein träges Gerät träge macht.
 *
 * ## Der Zeitstempel des Bildes, nicht der nach dem Zeichnen
 *
 * `requestAnimationFrame` bekommt den Zeitpunkt übergeben, zu dem das Bild
 * beginnt. Gemessen wird bis dorthin. Was danach kommt – Malen, Compositing,
 * der Bildschirm selbst – steckt nicht darin, und deshalb steht auf der Karte
 * „Untergrenze“ und nicht „Eingabeverzögerung“.
 *
 * ## Während der Messung wird nichts über React gezeichnet
 *
 * Der Zähler und die Rückmeldung nach jedem Tippen laufen direkt am Element.
 * Ein `useState` je Berührung würde die Zeit bis zum nächsten Bild um genau
 * die Arbeit verlängern, die React dafür braucht – das Werkzeug maße dann
 * sich selbst. Dieselbe Regel wie beim Bildfrequenz-Schreiber.
 */

type Phase = "idle" | "tippen" | "wischen" | "fertig";

const ms = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function InputLatency() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<LatencySummary | null>(null);
  const [rate, setRate] = useState<TouchRate | null>(null);

  const padRef = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const tapsRef = useRef<Tap[]>([]);
  const timesRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const startTaps = useCallback(() => {
    tapsRef.current = [];
    setResult(null);
    setPhase("tippen");
    if (countRef.current) countRef.current.textContent = `0 von ${TAPS}`;
  }, []);

  const startSwipe = useCallback(() => {
    timesRef.current = [];
    setRate(null);
    setPhase("wischen");
    if (countRef.current) countRef.current.textContent = `0 Punkte`;
  }, []);

  /** Eine Berührung: Warteschlange jetzt, Bild beim nächsten Aufschlag. */
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (phase !== "tippen") return;
      const handledAt = performance.now();
      /* Der Zeitstempel des **nativen** Ereignisses. React reicht ihn zwar
         durch, aber die Uhr ist die des Browsers – und nur auf ihr steht
         derselbe Nullpunkt wie unter `performance.now()`. */
      const queueMs = Math.max(0, handledAt - event.nativeEvent.timeStamp);

      /* Etwas sichtbar verändern, damit der Browser das Bild wirklich
         zeichnet. Ein rAF ohne jede Änderung kann ein Browser mit einem
         bereits geplanten Bild verrechnen – gemessen wäre dann ein Bild, das
         mit dieser Berührung nichts zu tun hat. */
      const pad = padRef.current;
      if (pad) pad.dataset.hit = String((Number(pad.dataset.hit ?? 0) + 1) % 2);

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame((frameAt) => {
        const frameMs = Math.max(0, frameAt - handledAt);
        tapsRef.current.push({ queueMs, frameMs });
        const n = tapsRef.current.length;
        if (countRef.current) countRef.current.textContent = `${n} von ${TAPS}`;
        if (n >= TAPS) {
          setResult(summariseTaps(tapsRef.current));
          setPhase("fertig");
        }
      });
    },
    [phase],
  );

  /** Ein Wisch: die Zwischenpunkte sind der Takt des Digitizers. */
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (phase !== "wischen") return;
      if (event.buttons === 0 && event.pointerType === "mouse") return;

      const native = event.nativeEvent;
      /* getCoalescedEvents liefert die Meldungen des Digitizers in ihrem
         ursprünglichen Takt. Ohne sie misst man, wie oft der Browser
         ausliefert – also die Bildrate, nicht die Abtastrate. */
      const points =
        typeof native.getCoalescedEvents === "function"
          ? native.getCoalescedEvents()
          : [native];
      for (const p of points) timesRef.current.push(p.timeStamp);

      const n = timesRef.current.length;
      if (countRef.current) countRef.current.textContent = `${n} Punkte`;
      if (n >= MIN_TOUCH_SAMPLES * 4) {
        setRate(touchRate(timesRef.current));
        setPhase("fertig");
      }
    },
    [phase],
  );

  const onPointerUp = useCallback(() => {
    if (phase !== "wischen") return;
    setRate(touchRate(timesRef.current));
    setPhase("fertig");
  }, [phase]);

  const armed = phase === "tippen" || phase === "wischen";

  return (
    <div className="lag">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Eingabe-Schreiber</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            „Fühlt sich träge an“ ist als Reklamation wertlos. Hier wird
            nachgemessen: wie lange eine Berührung braucht, bis sie im
            JavaScript ankommt, und wie lange von dort bis zum nächsten Bild.
            Dazu die Abtastrate Ihres Touchscreens – die Zahl, die nach einer
            billigen Display-Reparatur von 120 auf 60 fällt und auf keinem
            Beleg steht.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Keine Berechtigung nötig. Funktioniert mit Finger, Stift und Maus –
            die Abtastrate ist nur bei Finger und Stift eine Aussage über das
            Panel.
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={startTaps}
            data-ripple
            className="press inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors"
          >
            {phase === "fertig" ? "Noch einmal" : "Tippen"}
            <Icon name="arrow-right" size={15} />
          </button>
          <button
            type="button"
            onClick={startSwipe}
            className="press inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            Wischen
          </button>
        </div>
      </div>

      <button
        ref={padRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="lag-pad mt-7"
        data-armed={armed || undefined}
        aria-label={
          phase === "wischen"
            ? "Wischfläche für die Abtastrate"
            : "Tippfläche für die Verzögerungsmessung"
        }
      >
        <span className="lag-pad__hint">
          {phase === "tippen"
            ? `Tippen Sie ${TAPS} Mal – gleichmäßig, ohne Eile.`
            : phase === "wischen"
              ? "Wischen Sie in einem Zug über die Fläche, ohne abzusetzen."
              : "Wählen Sie oben eine Messung."}
        </span>
        <span ref={countRef} className="lag-pad__count font-mono tabular-nums" />
      </button>

      {result ? (
        <>
          <dl className="frames-readout mt-7">
            <div>
              <dt>Bis zum Bild</dt>
              <dd
                className="font-mono tabular-nums"
                data-warn={result.totalMs > NOTICEABLE_MS}
              >
                {ms.format(result.totalMs)} ms
              </dd>
            </div>
            <div>
              <dt>Warteschlange</dt>
              <dd className="font-mono tabular-nums">{ms.format(result.queueMs)} ms</dd>
            </div>
            <div>
              <dt>Zeichnen</dt>
              <dd className="font-mono tabular-nums">{ms.format(result.frameMs)} ms</dd>
            </div>
            <div>
              <dt>Schlechteste</dt>
              <dd className="font-mono tabular-nums">{ms.format(result.worstMs)} ms</dd>
            </div>
          </dl>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {latencyReading(result)}
          </p>
        </>
      ) : null}

      {rate ? (
        <>
          <dl className="frames-readout mt-7">
            <div>
              <dt>Abtastrate</dt>
              <dd className="font-mono tabular-nums">
                {rate.conclusive
                  ? `${rate.nearest ?? Math.round(rate.hz)} Hz`
                  : "–"}
              </dd>
            </div>
            <div>
              <dt>Abstand</dt>
              <dd className="font-mono tabular-nums">
                {rate.conclusive ? `${ms.format(rate.medianMs)} ms` : "–"}
              </dd>
            </div>
            <div>
              <dt>Zwischenpunkte</dt>
              <dd className="font-mono tabular-nums">{rate.count}</dd>
            </div>
          </dl>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {touchRateReading(rate)}
          </p>
        </>
      ) : null}

      <div className="mt-7 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">Was gemessen wird</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Zwei von vier Abschnitten: die Wartezeit im Browser und die Zeit
            bis zum nächsten Bild. Beide zusammen sind das, was eine
            überlastete Seite oder ein müdes Gerät ausmacht – und beide sind
            auf die Millisekunde genau zu haben.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">Warum es eine Untergrenze ist</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Was der Digitizer vor der Meldung an Abtastung und Filterung
            braucht und was der Bildschirm nach dem fertigen Bild noch
            benötigt, sieht kein Browser. Die gefühlte Verzögerung ist also
            größer als die gemessene – wie beim{" "}
            <Link href="/ersatzteile" className="underline underline-offset-2">
              Vergleich der Ersatzteile
            </Link>
            , der denselben Unterschied zeigt, statt ihn zu messen.
          </p>
        </div>
      </div>
    </div>
  );
}
