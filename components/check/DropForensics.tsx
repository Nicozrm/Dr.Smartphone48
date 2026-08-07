"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  FREEFALL_G,
  IMPACT_G,
  MIN_FREEFALL_MS,
  decelerationG,
  fallHeight,
  fallTime,
  impactVelocity,
  surfaces,
} from "@/lib/motion/impact";

/**
 * Der Beschleunigungsschreiber.
 *
 * Beantwortet die Frage, die jeder zweite Kunde am Tresen stellt und auf die
 * es eine ordentliche Antwort gibt: Warum ist das Display gebrochen, es ist
 * doch nur einen halben Meter gefallen? Und warum ist es beim letzten Mal
 * heil geblieben?
 *
 * Die Antwort steht nicht in der Fallhöhe, sondern im Bremsweg – und die
 * Rechnung dazu steht in `lib/motion/impact.ts`. Dieses Werkzeug liefert
 * dafür die eine Zahl, die ein Telefon wirklich messen kann.
 *
 * ## Der Sensor misst den freien Fall, nicht den Aufprall
 *
 * Ein Beschleunigungsmesser misst Eigenbeschleunigung: Ein Gerät auf dem
 * Tisch zeigt 1 g, ein fallendes zeigt 0 g. Der freie Fall ist deshalb sauber
 * zu erkennen und dauert lange genug – aus einem Meter immerhin 450
 * Millisekunden –, dass die üblichen 60 Messwerte je Sekunde ihn gut
 * auflösen.
 *
 * Der Aufprall selbst dauert etwa eine Millisekunde. In dieser Zeit nimmt der
 * Sensor mit hoher Wahrscheinlichkeit gar keinen Messwert. Der angezeigte
 * Spitzenwert ist deshalb eine Untergrenze, und das steht auch dabei. Ein
 * Messgerät, das seine eigene Grenze verschweigt, ist ein Ratespiel mit
 * Nachkommastellen.
 *
 * ## Niemand soll sein Telefon fallen lassen
 *
 * Das Werkzeug funktioniert mit einem Klaps auf den Tisch neben dem Gerät und
 * mit fünf Zentimetern über einem Kissen. Das steht so auf der Seite, und es
 * steht dort vor dem Knopf, nicht danach.
 *
 * ## Warum die Kurve an React vorbei gezeichnet wird
 *
 * Der Schrieb wird sechzigmal je Sekunde neu gesetzt. Ginge das über
 * `useState`, rechnete React sechzigmal je Sekunde einen Baum durch, um ein
 * einziges `d`-Attribut zu ändern. Der Pfad wird deshalb direkt am Element
 * gesetzt; React erfährt nur von den Ergebnissen, und die kommen selten.
 */

/** Sichtfenster des Schriebs in Sekunden. */
const WINDOW_S = 4;
/** Obergrenze der Achse. Ein festes Aufsetzen erreicht 3 bis 8 g. */
const MAX_G = 8;
const VIEW_W = 600;
const VIEW_H = 150;

type Phase = "idle" | "running" | "denied" | "unsupported";

interface Finding {
  kind: "fall" | "aufprall";
  /** Dauer des freien Falls in Sekunden – nur bei kind === "fall". */
  seconds: number;
  /** Daraus gerechnete Höhe in Metern. */
  meters: number;
  /** Höchster gesehener Betrag in g. Untergrenze, siehe Kopfkommentar. */
  peakG: number;
  at: number;
}

/*
  Alle Zahlen durch dieselben drei Formatierer. `toFixed` wäre kürzer und
  schreibt einen Punkt – auf einer deutschen Seite ist das ein
  Tausendertrennzeichen, und „4.6 m/s" liest sich als viertausendsechshundert.
*/
const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const meterFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const oneDigit = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDigits = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function DropForensics() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [finding, setFinding] = useState<Finding | null>(null);
  const [rate, setRate] = useState(0);
  const [live, setLive] = useState(1);

  const pathRef = useRef<SVGPathElement>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  const stop = useCallback(() => {
    stopRef.current();
    setPhase("idle");
  }, []);

  const start = useCallback(async () => {
    const DME = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DME === "undefined" || !("DeviceMotionEvent" in window)) {
      setPhase("unsupported");
      return;
    }
    if (typeof DME?.requestPermission === "function") {
      try {
        // Muss aus einer Nutzerhandlung heraus laufen – deshalb hier und
        // nicht in einem Effekt.
        if ((await DME.requestPermission()) !== "granted") {
          setPhase("denied");
          return;
        }
      } catch {
        setPhase("unsupported");
        return;
      }
    }

    setFinding(null);
    setPhase("running");

    /* Ringpuffer der letzten Sekunden. Er lebt in einem ref, damit das
       Zeichnen nichts mit dem Zustand von React zu tun hat. */
    const samples: { t: number; g: number }[] = [];
    let received = 0;
    let firstAt = 0;

    // Zustandsautomat der Erkennung.
    let fallStart = 0;
    let watchUntil = 0;
    let watchPeak = 0;
    let watchSeconds = 0;

    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;

      const now = performance.now();
      if (!firstAt) firstAt = now;
      received++;

      const g = Math.hypot(a.x, a.y, a.z) / 9.80665;
      samples.push({ t: now, g });
      while (samples.length && now - samples[0].t > WINDOW_S * 1000) samples.shift();

      /* --- freier Fall --- */
      if (g < FREEFALL_G) {
        if (!fallStart) fallStart = now;
      } else if (fallStart) {
        const ms = now - fallStart;
        fallStart = 0;
        if (ms >= MIN_FREEFALL_MS) {
          // Ab jetzt 400 ms auf den Aufprall warten und dessen Spitze nehmen.
          watchUntil = now + 400;
          watchPeak = g;
          watchSeconds = ms / 1000;
        }
      }

      if (watchUntil) {
        if (g > watchPeak) watchPeak = g;
        if (now > watchUntil) {
          watchUntil = 0;
          setFinding({
            kind: "fall",
            seconds: watchSeconds,
            meters: fallHeight(watchSeconds),
            peakG: watchPeak,
            at: Date.now(),
          });
        }
      } else if (g > IMPACT_G) {
        // Ein Stoß ohne vorherigen Fall – der Klaps auf den Tisch.
        setFinding((current) =>
          current && current.kind === "aufprall" && current.peakG >= g
            ? current
            : { kind: "aufprall", seconds: 0, meters: 0, peakG: g, at: Date.now() },
        );
      }
    };

    window.addEventListener("devicemotion", onMotion);

    let raf = 0;
    let lastRate = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!samples.length) return;

      const t1 = samples[samples.length - 1].t;
      const t0 = t1 - WINDOW_S * 1000;
      let d = "";
      for (const sample of samples) {
        const x = ((sample.t - t0) / (WINDOW_S * 1000)) * VIEW_W;
        const y = VIEW_H - Math.min(1, sample.g / MAX_G) * VIEW_H;
        d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      pathRef.current?.setAttribute("d", d);

      if (now - lastRate > 500) {
        lastRate = now;
        const seconds = (t1 - firstAt) / 1000;
        if (seconds > 0.5) setRate(Math.round(received / seconds));
        setLive(samples[samples.length - 1].g);
      }
    };
    raf = requestAnimationFrame(draw);

    stopRef.current = () => {
      window.removeEventListener("devicemotion", onMotion);
      cancelAnimationFrame(raf);
      stopRef.current = () => {};
    };
  }, []);

  const running = phase === "running";

  /* Für die Tabelle: die gemessene Höhe, sonst ein Meter als Anschauung. */
  const height = finding?.kind === "fall" && finding.meters > 0.02 ? finding.meters : 1;
  const velocity = impactVelocity(height);

  return (
    <div className="drop">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Beschleunigungsschreiber</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Klopfen Sie fest auf den Tisch neben das Gerät, oder heben Sie es
            fünf Zentimeter an und lassen Sie es auf ein Kissen fallen. Der
            Schrieb zeigt, was der Beschleunigungssensor dabei sieht.
          </p>
          <p className="mt-3 text-sm font-medium text-warn">
            Lassen Sie Ihr Telefon zum Ausprobieren nicht auf harten Boden
            fallen. Dieses Werkzeug misst den Schaden, es verhindert ihn nicht.
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
              Aufzeichnung beenden
            </>
          ) : (
            <>
              Aufzeichnen
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
          aria-label="Verlauf der gemessenen Beschleunigung"
        >
          {/* Ruhelage und Aufprallschwelle als Bezugslinien. Ohne sie ist eine
              Kurve nur eine Kurve. */}
          <line
            x1="0"
            x2={VIEW_W}
            y1={VIEW_H - (1 / MAX_G) * VIEW_H}
            y2={VIEW_H - (1 / MAX_G) * VIEW_H}
            className="drop-rule"
          />
          <line
            x1="0"
            x2={VIEW_W}
            y1={VIEW_H - (IMPACT_G / MAX_G) * VIEW_H}
            y2={VIEW_H - (IMPACT_G / MAX_G) * VIEW_H}
            className="drop-rule is-impact"
          />
          <line
            x1="0"
            x2={VIEW_W}
            y1={VIEW_H - (FREEFALL_G / MAX_G) * VIEW_H}
            y2={VIEW_H - (FREEFALL_G / MAX_G) * VIEW_H}
            className="drop-rule is-fall"
          />
          <path ref={pathRef} className="drop-line" />
        </svg>

        {/* Links, nicht rechts: Der Schrieb wandert nach rechts, das Neueste
            steht dort. Beschriftungen am rechten Rand lägen also immer genau
            auf dem Ereignis, das man gerade ansehen will. */}
        <div className="drop-scale" aria-hidden="true">
          <span style={{ bottom: `${(IMPACT_G / MAX_G) * 100}%` }}>
            {oneDigit.format(IMPACT_G)} g · Aufprall
          </span>
          <span style={{ bottom: `${(1 / MAX_G) * 100}%` }}>1,0 g · Ruhe</span>
          <span style={{ bottom: `${(FREEFALL_G / MAX_G) * 100}%` }}>
            {twoDigits.format(FREEFALL_G)} g · freier Fall
          </span>
        </div>

        {!running ? (
          <div className="scope-idle">
            {phase === "denied"
              ? "Ohne Sensorzugriff bleibt der Schrieb leer."
              : phase === "unsupported"
                ? "Dieses Gerät hat keinen Beschleunigungssensor – am Smartphone öffnen."
                : "Noch keine Aufzeichnung."}
          </div>
        ) : null}
      </div>

      <div className="mt-7 flex flex-wrap items-baseline gap-x-10 gap-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">Jetzt</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
            {running ? `${twoDigits.format(live)} g` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Messwerte je Sekunde
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink-strong">
            {rate ? `${rate} Hz` : "—"}
          </p>
        </div>
      </div>

      {finding ? (
        <div className="drop-finding mt-7">
          {finding.kind === "fall" ? (
            <>
              <p className="text-eyebrow text-accent">Freier Fall erkannt</p>
              <p className="mt-3 text-lg leading-relaxed text-ink-strong">
                {Math.round(finding.seconds * 1000)} Millisekunden ohne
                Erdanziehung. Daraus gerechnet:{" "}
                <strong className="font-semibold">
                  {meterFormat.format(finding.meters)} m
                </strong>{" "}
                Fallhöhe, Aufprall mit{" "}
                {oneDigit.format(impactVelocity(finding.meters))} m/s.
              </p>
            </>
          ) : (
            <>
              <p className="text-eyebrow text-accent">Stoß erkannt</p>
              <p className="mt-3 text-lg leading-relaxed text-ink-strong">
                Kein freier Fall davor – der Sensor hat nur den Stoß gesehen.
              </p>
            </>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Höchster gemessener Wert: {oneDigit.format(finding.peakG)} g. Das ist eine
            Untergrenze und nicht die Spitze: Bei {rate || 60} Messwerten je
            Sekunde liegen zwischen zwei Werten {Math.round(1000 / (rate || 60))}{" "}
            Millisekunden, ein Aufprall dauert etwa eine. Der wahre Höchstwert
            liegt fast immer zwischen zwei Messungen.
          </p>
        </div>
      ) : null}

      <div className="mt-10">
        <h4 className="text-sm font-semibold text-ink-strong">
          Warum es auf den Untergrund ankommt und nicht auf die Höhe
        </h4>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Aus {meterFormat.format(height)} m trifft ein Gerät mit{" "}
          {oneDigit.format(velocity)} m/s auf – egal worauf. Was sich unterscheidet,
          ist der Weg, auf dem es zum Stehen kommt. Und der geht direkt in die
          Kraft ein: doppelter Bremsweg, halbe Belastung.
        </p>

        <table className="drop-table mt-5">
          <thead>
            <tr>
              <th scope="col">Untergrund</th>
              <th scope="col">Bremsweg</th>
              <th scope="col">Verzögerung</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((surface) => (
              <tr key={surface.id}>
                <th scope="row">
                  {surface.label}
                  <span className="drop-note">{surface.note}</span>
                </th>
                <td className="tabular-nums">
                  {surface.stop < 0.01
                    ? `${oneDigit.format(surface.stop * 1000)} mm`
                    : `${Math.round(surface.stop * 1000)} mm`}
                </td>
                <td className="tabular-nums">
                  {numberFormat.format(
                    Math.round(decelerationG(velocity, surface.stop)),
                  )}{" "}
                  g
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-sm leading-relaxed text-ink-faint">
          Die Bremswege sind Schätzungen der Größenordnung, keine Messungen –
          verlässlich ist nicht der einzelne Wert, sondern das Verhältnis
          zwischen den Zeilen. Gerechnet wird mit der mittleren Verzögerung
          (a = v² / 2s); die tatsächliche Spitze liegt darüber. Aus{" "}
          {meterFormat.format(height)} m dauert der Fall{" "}
          {Math.round(fallTime(height) * 1000)} ms.
        </p>
      </div>
    </div>
  );
}
