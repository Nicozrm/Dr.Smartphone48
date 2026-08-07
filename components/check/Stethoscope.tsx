"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  DB_FLOOR,
  columnBins,
  dbToLevel,
  formatHz,
  logPosition,
  peakFrequency,
  rampColor,
} from "@/lib/audio/spectrum";
import {
  SPECTRUM_MAX_HZ,
  SPECTRUM_MIN_HZ,
  landmarks,
} from "@/lib/data/acoustics";

/**
 * Das Stethoskop.
 *
 * Ein Arzt hört ein Herz ab, weil das Geräusch etwas verrät, das man von
 * außen nicht sieht. Bei einem Telefon ist es dasselbe: Ein surrender
 * Vibrationsmotor, ein pfeifender Spannungswandler, ein kratzender
 * Lautsprecher – alles Dinge, die man hört, bevor man sie sieht, und die
 * sonst nur mit Laborgerät sichtbar werden.
 *
 * Hier macht der Browser sie sichtbar: als Spektrum (was ist gerade da) und
 * als Wasserfall (was war in den letzten drei Sekunden da). Zwei Telefone,
 * eines hält, eines hört.
 *
 * ## Das Wichtigste: die Aufbereitung muss aus
 *
 * `getUserMedia` liefert standardmäßig einen für Sprache aufbereiteten
 * Kanal – Echounterdrückung, Rauschunterdrückung, automatische Aussteuerung.
 * Für ein Telefonat ist das richtig. Für eine Messung ist es fatal, und zwar
 * besonders die Rauschunterdrückung: Sie ist darauf gebaut, **gleichförmige**
 * Geräusche zu entfernen. Genau das sind Spulenfiepen und Motorbrummen. Mit
 * Voreinstellung würde dieses Werkzeug zuverlässig nichts finden, und niemand
 * käme auf die Idee, dass es daran liegt.
 *
 * ## Warum hier eine Leinwand steht und sonst nirgends
 *
 * Der Rest dieser Website kommt ohne Canvas aus – der PWM-Vergleich auf
 * /ersatzteile etwa ist eine CSS-Kachel. Ein Wasserfall ist die Ausnahme, an
 * der das nicht mehr geht: Er schreibt je Bild eine Zeile aus 600 einzeln
 * eingefärbten Bildpunkten und schiebt das Bisherige um eine Zeile weiter.
 * Als DOM wären das 120.000 Knoten, die sechzigmal je Sekunde wandern.
 *
 * ## Was das Gerät nicht tut
 *
 * Es stellt keine Diagnose. Ein Ausschlag bei 180 Hz heißt „hier ist Schall
 * bei 180 Hz" und sonst nichts – die Marken daneben nennen, was in diesem
 * Bereich üblicherweise arbeitet, und das ist eine Orientierung, kein Befund.
 * Der Unterschied steht auch auf der Seite.
 */

/** Interne Auflösung der Leinwände. Die Darstellung skaliert per CSS. */
const W = 600;
const SPEC_H = 96;
const FALL_H = 200;

const FFT_SIZE = 4096;

type Phase = "idle" | "asking" | "running" | "denied" | "unsupported";

export function Stethoscope() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [peak, setPeak] = useState<{ hz: number; db: number } | null>(null);
  const [rate, setRate] = useState(0);

  const specRef = useRef<HTMLCanvasElement>(null);
  const fallRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});

  /* Aufräumen ist hier keine Fleißaufgabe: Ein Mikrofon, das nach dem
     Verlassen der Seite weiterläuft, ist ein Fehler mit Kameralampe. */
  useEffect(() => () => stopRef.current(), []);

  const stop = useCallback(() => {
    stopRef.current();
    setPhase("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    setPhase("asking");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Siehe Kopfkommentar – ohne diese drei misst man die Aufbereitung.
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      setPhase("denied");
      return;
    }

    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    // Etwas Glättung, sonst zappelt die Kurve so, dass man nichts ablesen
    // kann. Der Wasserfall bekommt dieselben Daten – dort mittelt ohnehin
    // das Auge über die Zeilen.
    analyser.smoothingTimeConstant = 0.55;
    source.connect(analyser);

    const bins = new Float32Array(analyser.frequencyBinCount);
    const columns = columnBins(
      W,
      analyser.frequencyBinCount,
      ctx.sampleRate,
      SPECTRUM_MIN_HZ,
      SPECTRUM_MAX_HZ,
    );

    const spec = specRef.current?.getContext("2d");
    const fall = fallRef.current?.getContext("2d", { willReadFrequently: false });
    const row = fall?.createImageData(W, 1);

    if (fall) {
      fall.fillStyle = "#08090a";
      fall.fillRect(0, 0, W, FALL_H);
    }

    setRate(Math.round(ctx.sampleRate));
    setPhase("running");

    let raf = 0;
    let lastReport = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      analyser.getFloatFrequencyData(bins);

      /* --- Wasserfall: alles eine Zeile nach unten, oben die neue --- */
      if (fall && row) {
        fall.drawImage(fallRef.current!, 0, 0, W, FALL_H - 1, 0, 1, W, FALL_H - 1);
        for (let x = 0; x < W; x++) {
          const { from, to } = columns[x];
          // Das Maximum, nicht der Mittelwert: Ein schmaler Pfeifton
          // verschwände sonst zwischen hunderten stillen Bins.
          let db = -Infinity;
          for (let i = from; i <= to; i++) if (bins[i] > db) db = bins[i];
          const [r, g, b] = rampColor(dbToLevel(db));
          const p = x * 4;
          row.data[p] = r;
          row.data[p + 1] = g;
          row.data[p + 2] = b;
          row.data[p + 3] = 255;
        }
        fall.putImageData(row, 0, 0);
      }

      /* --- Spektrum: die aktuelle Zeile als Kurve --- */
      if (spec) {
        spec.clearRect(0, 0, W, SPEC_H);
        spec.beginPath();
        spec.moveTo(0, SPEC_H);
        for (let x = 0; x < W; x++) {
          const { from, to } = columns[x];
          let db = -Infinity;
          for (let i = from; i <= to; i++) if (bins[i] > db) db = bins[i];
          spec.lineTo(x, SPEC_H - dbToLevel(db) * SPEC_H);
        }
        spec.lineTo(W, SPEC_H);
        spec.closePath();
        spec.fillStyle = "rgba(36, 86, 230, 0.16)";
        spec.fill();
        spec.strokeStyle = "#5b8cff";
        spec.lineWidth = 1.4;
        spec.stroke();
      }

      /* --- Ablesewert, sechsmal je Sekunde statt sechzigmal ---
         React bei jedem Bild neu rendern zu lassen kostet mehr Rechenzeit
         als die ganze Messung. Sechs Aktualisierungen wirken flüssig und
         sind ablesbar; sechzig sind ein Flimmern. */
      if (now - lastReport > 160) {
        lastReport = now;
        setPeak(peakFrequency(bins, ctx.sampleRate, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ));
      }
    };
    raf = requestAnimationFrame(frame);

    stopRef.current = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
      void ctx.close();
      stopRef.current = () => {};
    };
  }, []);

  const running = phase === "running";

  return (
    <div className="scope">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Stethoskop</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Halten Sie dieses Gerät an das andere und hören Sie hin – der
            Browser zeigt, was das Mikrofon aufnimmt. Oben das Spektrum dieses
            Augenblicks, darunter die letzten Sekunden als Wasserfall.
          </p>
        </div>
        <button
          type="button"
          onClick={running ? stop : start}
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
              Mikrofon schließen
            </>
          ) : (
            <>
              Zuhören
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>
      </div>

      <div className="scope-screen mt-7">
        <canvas
          ref={specRef}
          width={W}
          height={SPEC_H}
          className="scope-canvas scope-spectrum"
          aria-hidden="true"
        />
        <canvas
          ref={fallRef}
          width={W}
          height={FALL_H}
          className="scope-canvas scope-waterfall"
          role="img"
          aria-label={
            running
              ? "Wasserfalldarstellung des aufgenommenen Frequenzspektrums"
              : "Leere Wasserfalldarstellung"
          }
        />

        {/* Die Marken liegen als Text über der Achse, nicht in der Leinwand:
            So bleiben sie auswählbar, vorlesbar und in beiden Themes lesbar. */}
        <div className="scope-marks" aria-hidden="true">
          {landmarks.map((mark) => {
            const from = logPosition(mark.from, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
            const to = logPosition(mark.to, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
            return (
              <span
                key={mark.id}
                className="scope-mark"
                style={{ left: `${from * 100}%`, width: `${(to - from) * 100}%` }}
              >
                <span
                  className="scope-mark-label"
                  style={{ top: `${0.375 + mark.row * 0.95}rem` }}
                >
                  {mark.label}
                </span>
              </span>
            );
          })}
        </div>

        {!running ? (
          <div className="scope-idle">
            {phase === "denied"
              ? "Ohne Mikrofonzugriff bleibt es still."
              : phase === "unsupported"
                ? "Dieser Browser gibt kein Mikrofon frei."
                : phase === "asking"
                  ? "Warte auf die Freigabe …"
                  : "Noch nichts zu hören."}
          </div>
        ) : null}
      </div>

      {/* Die erste und die letzte Beschriftung sitzen genau auf dem Rand.
          Mittig ausgerichtet ragte davon die Hälfte aus dem Bild – deshalb
          werden die beiden Enden nach innen gezogen. */}
      <div className="scope-axis" aria-hidden="true">
        {[30, 100, 300, 1000, 3000, 10000, 20000].map((hz) => {
          const at = logPosition(hz, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
          return (
            <span
              key={hz}
              style={{
                left: `${at * 100}%`,
                transform:
                  at < 0.02
                    ? "translateX(0)"
                    : at > 0.98
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {formatHz(hz)}
            </span>
          );
        })}
      </div>

      {/*
        Beide Zahlen hängen an derselben Bedingung, und das ist der Punkt:
        Unterhalb der Rauschgrenze ist der „lauteste Ton" der lauteste
        Bildpunkt des Eigenrauschens. Eine Frequenz dafür anzugeben wäre eine
        Messung von nichts – mit drei Ziffern Genauigkeit. Also steht dort
        dann ein Strich.
      */}
      <div className="mt-8 flex flex-wrap items-baseline gap-x-10 gap-y-3">
        {(() => {
          const laut = peak !== null && peak.db > DB_FLOOR;
          return (
            <>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
                  Lautester Ton
                </p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
                  {laut ? formatHz(peak.hz) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
                  Pegel
                </p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
                  {laut ? `${Math.round(peak.db)} dB` : "—"}
                </p>
              </div>
            </>
          );
        })()}
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Abtastrate
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
            {rate ? formatHz(rate) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {landmarks.map((mark) => (
          <div key={mark.id}>
            <p className="text-sm font-medium text-ink-strong">
              {mark.label}{" "}
              <span className="font-mono text-xs font-normal text-ink-faint">
                {formatHz(mark.from)} – {formatHz(mark.to)}
              </span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{mark.reason}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm leading-relaxed text-ink-faint">
        Ein Ausschlag ist kein Befund. Die Marken sagen, was in einem Bereich
        üblicherweise arbeitet – nicht, dass es defekt ist. Umgekehrt gilt
        genauso: Ein stilles Spektrum beweist nichts. Die Aufnahme läuft
        ausschließlich in diesem Tab und wird nirgends gespeichert oder
        übertragen.
      </p>
    </div>
  );
}
