"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  NOTICEABLE,
  RUN_SECONDS,
  TARGET_MS,
  WINDOW_SECONDS,
  type Sample,
  type Verdict,
  summarize,
  work,
} from "@/lib/perf/throttle";

/**
 * Der Drosselschreiber.
 *
 * Dreißig Sekunden lang bekommt das Gerät immer dieselbe Arbeit, und die
 * Seite schreibt mit, wie lange sie jedes Mal dauert. Wird der Prozessor
 * warm, senkt das System den Takt – die Kurve knickt nach oben.
 *
 * Das ist das einzige Werkzeug hier, das ohne jede Berechtigung auskommt:
 * kein Mikrofon, kein Sensor, keine Kamera. Nur Rechnen und eine Uhr.
 *
 * ## Drosselung ist kein Fehler
 *
 * Jedes Telefon drosselt, und das muss es auch – ohne die Regelung schaltete
 * es nach zwei Minuten Videoaufnahme ab. Die Frage ist, wann sie einsetzt und
 * wie tief sie greift. Ein gealterter Akku, ein nach einer Reparatur schlecht
 * sitzendes Wärmeleitpad oder ein aufgeblähtes Zellenpaket verschieben beides
 * nach vorn.
 *
 * ## Die Kurve läuft an React vorbei
 *
 * Wie beim Sturzschreiber: Der Pfad wird direkt am Element gesetzt. React
 * dreißig Sekunden lang bei jeder Runde einen Baum durchrechnen zu lassen,
 * verfälschte genau die Messung, um die es geht.
 *
 * ## Der Tab muss sichtbar bleiben
 *
 * Browser drosseln Hintergrund-Tabs absichtlich und hart. Wer währenddessen
 * wegwechselt, misst diese Bremse statt der thermischen – deshalb bricht die
 * Messung ab, wenn die Seite in den Hintergrund gerät, statt ein falsches
 * Ergebnis auszugeben.
 */

const VIEW_W = 600;
const VIEW_H = 150;
/** Obergrenze der Achse als Vielfaches der Grundzeit. */
const MAX_RATIO = 2.5;

/**
 * Ab hier ist es keine Drosselung mehr.
 *
 * Thermische Drosselung eines Telefons landet erfahrungsgemäß zwischen dem
 * 1,1- und dem 2-fachen. Wird die Arbeit dreimal so langsam, war mit hoher
 * Wahrscheinlichkeit etwas anderes am Werk: eine zweite Anwendung, ein
 * Stromsparmodus, der mitten in der Messung zuschlug, oder ein Fenster, das
 * kurz den Fokus verlor.
 *
 * Diese Grenze zu ziehen ist kein Schönreden, sondern das Gegenteil: Ohne
 * sie behauptete die Seite, ein überlastetes Gerät habe ein Wärmeproblem –
 * und das wäre eine Diagnose aus einer Störung.
 */
const IMPLAUSIBLE = 3;

type Phase = "idle" | "kalibriert" | "läuft" | "fertig" | "abgebrochen";

const percentFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const msFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function ThermalTrace() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [rounds, setRounds] = useState(0);

  const pathRef = useRef<SVGPathElement>(null);
  const abortRef = useRef(false);

  useEffect(
    () => () => {
      abortRef.current = true;
    },
    [],
  );

  const run = useCallback(async () => {
    abortRef.current = false;
    setVerdict(null);
    setProgress(0);
    setPhase("kalibriert");

    const wait = () => new Promise((r) => window.setTimeout(r, 0));

    /* --- Kalibrieren: wie viele Runden dauern hier TARGET_MS? --- */
    let size = 200_000;
    let sink = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      const t0 = performance.now();
      sink ^= work(size, attempt + 1);
      const took = performance.now() - t0;
      if (took > TARGET_MS * 0.8 && took < TARGET_MS * 1.25) break;
      // Auf die Zielzeit skalieren, aber nie mehr als das Achtfache je
      // Schritt – sonst schießt die erste Schätzung über und der Browser
      // steht für Sekunden.
      const factor = Math.max(0.125, Math.min(8, TARGET_MS / Math.max(0.05, took)));
      size = Math.max(1000, Math.round(size * factor));
      await wait();
      if (abortRef.current) return;
    }
    setRounds(size);

    /* --- Messen --- */
    setPhase("läuft");
    const samples: Sample[] = [];
    const start = performance.now();

    while (!abortRef.current) {
      // Ein Wechsel in den Hintergrund macht jede weitere Zahl wertlos.
      if (document.hidden) {
        setPhase("abgebrochen");
        return;
      }

      const t0 = performance.now();
      sink ^= work(size, samples.length + 1);
      const ms = performance.now() - t0;
      const at = (t0 - start) / 1000;
      samples.push({ at, ms });

      /* Kurve direkt zeichnen. Bezug ist die eigene Grundzeit: Die Achse
         zeigt Vielfache, nicht Millisekunden – nur so ist die Form auf
         jedem Gerät dieselbe. */
      const base = samples.length > 6 ? samples[3].ms : ms;
      let d = "";
      for (const s of samples) {
        const x = (s.at / RUN_SECONDS) * VIEW_W;
        const y = VIEW_H - Math.min(1, s.ms / base / MAX_RATIO) * VIEW_H;
        d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      pathRef.current?.setAttribute("d", d);
      setProgress(Math.min(1, at / RUN_SECONDS));

      if (at >= RUN_SECONDS) break;
      await wait();
    }

    // Ohne diese Zeile darf der Übersetzer die ganze Schleife streichen.
    if (sink === 0x7fffffff) console.debug(sink);

    if (abortRef.current) return;
    setVerdict(summarize(samples));
    setPhase("fertig");
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
  }, []);

  const busy = phase === "läuft" || phase === "kalibriert";
  const throttled = verdict !== null && verdict.ratio >= NOTICEABLE;

  return (
    <div className="thermal">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Drosselschreiber</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            {RUN_SECONDS} Sekunden lang bekommt Ihr Gerät immer dieselbe
            Rechenaufgabe. Gemessen wird, wie lange sie jedes Mal braucht.
            Wird der Prozessor warm, senkt das System den Takt – und die Kurve
            knickt nach oben.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Keine Berechtigung nötig, kein Sensor, kein Mikrofon. Lassen Sie
            die Seite währenddessen im Vordergrund: Ein Browser bremst
            Hintergrund-Tabs absichtlich, und das wäre dann die falsche Bremse.
          </p>
        </div>
        <button
          type="button"
          onClick={busy ? stop : run}
          data-ripple
          className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-medium transition-colors ${
            busy
              ? "border border-line-strong text-ink-strong hover:border-ink-strong"
              : "bg-accent text-accent-contrast"
          }`}
        >
          {busy ? (
            <>
              <span className="scope-live" aria-hidden="true" />
              Abbrechen
            </>
          ) : (
            <>
              {phase === "fertig" ? "Noch einmal" : "Belasten"}
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>
      </div>

      <div className="drop-screen mt-7">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="drop-trace"
          role="img"
          aria-label="Verlauf der Rechenzeit über die Dauer der Belastung"
        >
          {[1, 1.5, 2].map((mark) => (
            <line
              key={mark}
              x1="0"
              x2={VIEW_W}
              y1={VIEW_H - (mark / MAX_RATIO) * VIEW_H}
              y2={VIEW_H - (mark / MAX_RATIO) * VIEW_H}
              className={`drop-rule ${mark === 1 ? "" : "is-impact"}`}
            />
          ))}
          <path ref={pathRef} className="drop-line" />
        </svg>

        <div className="drop-scale" aria-hidden="true">
          {[1, 1.5, 2].map((mark) => (
            <span key={mark} style={{ bottom: `${(mark / MAX_RATIO) * 100}%` }}>
              {mark.toFixed(1).replace(".", ",")}× Grundzeit
            </span>
          ))}
        </div>

        {phase === "idle" ? (
          <div className="scope-idle">Noch keine Messung.</div>
        ) : phase === "kalibriert" ? (
          <div className="scope-idle">Arbeitspaket wird auf dieses Gerät eingestellt …</div>
        ) : phase === "abgebrochen" ? (
          <div className="scope-idle">
            Die Seite war im Hintergrund – die Messung wäre wertlos gewesen.
          </div>
        ) : null}
      </div>

      {busy || verdict ? (
        <div className="thermal-bar mt-4" aria-hidden="true">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-baseline gap-x-10 gap-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Grundzeit
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
            {verdict ? `${msFormat.format(verdict.baseline)} ms` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Nach {RUN_SECONDS} s
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
            {verdict ? `${msFormat.format(verdict.current)} ms` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Verbliebene Leistung
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
            {verdict ? `${percentFormat.format(verdict.remaining * 100)} %` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-7 max-w-2xl text-sm leading-relaxed text-ink-soft">
        {phase === "fertig" && verdict ? (
          verdict.ratio >= IMPLAUSIBLE ? (
            <p>
              Dieselbe Arbeit dauerte am Ende das{" "}
              {msFormat.format(verdict.ratio)}-fache. Das ist mehr, als
              thermische Drosselung erklärt – dort liegt der Wert zwischen dem
              1,1- und dem 2-fachen. Wahrscheinlich lief etwas anderes mit,
              ein Stromsparmodus schaltete zu, oder das Fenster verlor
              zwischendurch den Vordergrund. Schließen Sie andere Anwendungen
              und messen Sie noch einmal; erst dann sagt die Kurve etwas über
              dieses Gerät.
            </p>
          ) : throttled ? (
            <p>
              Dieselbe Arbeit dauerte am Ende{" "}
              {percentFormat.format((verdict.ratio - 1) * 100)} % länger als am
              Anfang. Das ist normales Verhalten und für sich kein Befund –
              auffällig wäre es, wenn es schon in den ersten Sekunden
              einsetzte oder sich die Leistung halbierte. Wiederholen Sie die
              Messung nach zehn Minuten Ruhe: Fängt die Kurve dann sofort wieder
              oben an, hat das Gerät die Wärme nicht losgeworden.
            </p>
          ) : (
            <p>
              Die Rechenzeit blieb über {RUN_SECONDS} Sekunden praktisch
              konstant. Entweder war die Belastung zu kurz, um das Gerät warm
              zu bekommen, oder es führt seine Wärme gut ab. Beides ist ein
              gutes Zeichen.
            </p>
          )
        ) : (
          <p>
            Gemessen wird gegen den eigenen Anfangswert dieses Geräts, nicht
            gegen ein fremdes: Das Arbeitspaket wird vorher so eingestellt,
            dass eine Runde hier etwa {TARGET_MS} ms dauert
            {rounds ? ` (${percentFormat.format(rounds)} Durchläufe)` : ""}.
            Verglichen werden die ersten und die letzten {WINDOW_SECONDS}{" "}
            Sekunden. Andere Anwendungen, Stromsparmodus und ein warmer Raum
            verändern das Ergebnis – dies ist eine Beobachtung, kein Urteil.
          </p>
        )}
      </div>
    </div>
  );
}
