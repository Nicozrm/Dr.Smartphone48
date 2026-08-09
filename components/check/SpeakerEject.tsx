"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  CYCLES,
  SWEEP_HIGH,
  SWEEP_LOW,
  TOTAL_SECONDS,
  cycleAt,
  frequencyAtElapsed,
  fullCurve,
  progressAt,
} from "@/lib/audio/eject";

/**
 * Die Lautsprecher-Entwässerung.
 *
 * Die Physik und die Wahl des Frequenzbands stehen in lib/audio/eject.ts.
 * Hier steht, was im Browser dazugehört – und drei Entscheidungen, die man
 * beim Weiterbauen leicht zurückdreht:
 *
 * ## Der Warnhinweis steht über dem Knopf
 *
 * Dieselbe Regel wie beim Sturzschreiber und beim Pixel-Wecker: Wo ein
 * Werkzeug ein Risiko trägt, steht der Satz davor, nicht danach. Das Risiko
 * ist hier doppelt – ein tiefer Ton bei voller Lautstärke direkt am Ohr, und
 * ein Gerät, das gerade eingeschaltet wird, obwohl es das vielleicht nicht
 * sollte.
 *
 * ## Der Widerspruch zu /notfall wird benannt, nicht umgangen
 *
 * Auf /notfall steht als erste Regel bei Wasserschaden: nicht einschalten,
 * nicht laden. Dieses Werkzeug verlangt das Gegenteil, denn ohne laufendes
 * Gerät kein Ton. Beides gleichzeitig auf die Seite zu stellen, ohne den
 * Unterschied zu erklären, wäre ein Widerspruch, den ein Kunde ausbadet.
 * Deshalb trennt der Hinweis die beiden Fälle ausdrücklich: nasse Kammer bei
 * laufendem Gerät (hier richtig) gegen nass gewordenes Gerät (dort richtig).
 *
 * ## Der Klang wird im Voraus geplant, nicht je Bild gesetzt
 *
 * Frequenz- und Lautstärkeverlauf liegen als `setValueCurveAtTime` im
 * Audio-Thread. Ein Verlauf, den der Hauptstrang je Bild nachzieht, stottert
 * genau dann, wenn die Seite sonst etwas zu tun hat – und ein stotternder
 * Ton bewegt die Membran anders als ein glatter.
 */

/** Lautstärke des Oszillators. Nicht 1.0: Ein Sinus mit Vollaussteuerung
    treibt manche Endstufen in die Begrenzung, und eine begrenzte Sinuswelle
    ist ein Rechteck – lauter, aber mit weniger Membranweg dort, wo er zählt. */
const PEAK_GAIN = 0.85;

type Phase = "idle" | "läuft" | "fertig";

const hzFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

export function SpeakerEject() {
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const rafRef = useRef(0);

  /** Alles abräumen. Ein Ton, der nach dem Wegklicken weiterläuft, ist
      derselbe Fehler wie ein Mikrofon mit Kameralampe. */
  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      oscRef.current?.stop();
    } catch {
      /* Bereits gestoppt – kein Grund für einen Fehler. */
    }
    oscRef.current?.disconnect();
    oscRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const stop = useCallback(() => {
    teardown();
    setPhase("idle");
    setElapsed(0);
  }, [teardown]);

  const run = useCallback(() => {
    teardown();

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    ctxRef.current = ctx;
    void ctx.resume();

    const osc = ctx.createOscillator();
    // Sinus, nicht Rechteck: Die Oberwellen eines Rechtecks liegen im
    // Bereich, in dem die Membran kaum noch ausschlägt – sie machen den Ton
    // schärfer, nicht die Bewegung größer.
    osc.type = "sine";
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    oscRef.current = osc;

    /* Den ganzen Ablauf im Voraus in den Audio-Thread legen – als **eine**
       Kurve über die volle Dauer. Acht aneinandergereihte Kurven wären der
       naheliegende Weg und werfen in Chromium `NotSupportedError`; die
       Begründung steht bei `fullCurve`. */
    const points = fullCurve();
    const hz = Float32Array.from(points.map((p) => p.hz));
    const amp = Float32Array.from(points.map((p) => p.gain * PEAK_GAIN));
    const t0 = ctx.currentTime + 0.05;
    osc.frequency.setValueCurveAtTime(hz, t0, TOTAL_SECONDS);
    gain.gain.setValueCurveAtTime(amp, t0, TOTAL_SECONDS);
    osc.start(t0);
    osc.stop(t0 + TOTAL_SECONDS);

    setPhase("läuft");
    setElapsed(0);

    const tick = () => {
      const current = ctxRef.current;
      if (!current) return;
      const t = current.currentTime - t0;
      if (t >= TOTAL_SECONDS) {
        setElapsed(TOTAL_SECONDS);
        setPhase("fertig");
        teardown();
        return;
      }
      setElapsed(Math.max(0, t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [teardown]);

  const running = phase === "läuft";
  const progress = progressAt(elapsed);
  const remaining = Math.max(0, Math.ceil(TOTAL_SECONDS - elapsed));

  return (
    <div className="eject">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Lautsprecher entwässern</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Ein Tropfen in der Lautsprecherkammer macht den Klang dumpf und
            leise – die Öffnung ist schmal genug, dass die Oberflächenspannung
            ihn festhält. Bei tiefen Tönen legt die Membran je Schwingung den
            längsten Weg zurück und schiebt ihn wieder heraus. Der Ton läuft
            deshalb {CYCLES}-mal von {SWEEP_LOW} auf {SWEEP_HIGH} Hz und
            zurück.
          </p>
          <p className="mt-3 text-sm font-medium text-warn">
            Halten Sie das Gerät mit der Lautsprecheröffnung nach unten und
            nicht ans Ohr – der Ton kommt bei voller Lautstärke. Und er ist
            das Falsche, wenn Ihr Gerät nass geworden <em>ist</em>: Dann gilt
            weiter, was in den{" "}
            <Link href="/notfall" className="underline underline-offset-2">
              Notfall-Protokollen
            </Link>{" "}
            steht – nicht einschalten, nicht laden. Hier geht es um ein
            laufendes Gerät mit Wasser in der Kammer, nicht um ein nasses
            Telefon.
          </p>
        </div>

        <button
          type="button"
          onClick={running ? stop : run}
          disabled={!armed}
          data-ripple
          className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.9375rem] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
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
              {phase === "fertig" ? "Noch einmal" : "Ton starten"}
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>
      </div>

      <label className="mt-5 flex items-center gap-2.5 text-sm text-ink-strong">
        <input
          type="checkbox"
          checked={armed}
          onChange={(e) => {
            setArmed(e.target.checked);
            if (!e.target.checked) stop();
          }}
          className="h-4 w-4"
        />
        Ich habe den Hinweis gelesen
      </label>

      {/* Die Anzeige während der Behandlung: Fortschritt, Durchlauf, Ton. */}
      <div className="eject-stage mt-7" data-running={running}>
        <div className="eject-ring" style={{ ["--p" as string]: progress }}>
          {/* Immer die Restzeit, auch im Ruhezustand: Dort steht sie auf der
              vollen Dauer und sagt damit, worauf man sich einlässt. Zuvor
              stand hier im Ruhezustand die Dauer als Bruchzahl („14.4s“) –
              mit dem Punkt einer fremden Sprache und einer Genauigkeit, die
              niemand braucht. */}
          <span className="eject-ring__value font-mono tabular-nums">
            {remaining}s
          </span>
        </div>
        <dl className="eject-meta">
          <div>
            <dt>Durchlauf</dt>
            <dd className="font-mono tabular-nums">
              {running || phase === "fertig" ? cycleAt(elapsed) : 0} / {CYCLES}
            </dd>
          </div>
          <div>
            <dt>Ton</dt>
            <dd className="font-mono tabular-nums">
              {running ? `${hzFormat.format(frequencyAtElapsed(elapsed))} Hz` : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {phase === "fertig" ? (
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink" role="status">
          Durchgelaufen. Hört sich der Lautsprecher noch dumpf an, wiederholen
          Sie den Vorgang ein- bis zweimal – mehr bringt erfahrungsgemäß
          nichts. Bleibt es dabei, sitzt das Wasser nicht mehr in der Kammer,
          sondern tiefer, oder der Wandler hat etwas abbekommen.
        </p>
      ) : null}

      <div className="mt-7 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">Was es tut</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Es räumt die Kammer hinter dem Gitter frei – also den Raum, den
            die Membran selbst erreicht. Das ist der Ort, an dem Wasser nach
            Regen, Spritzern oder einem Sturz ins Waschbecken zuerst
            hängenbleibt.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">Was es nicht tut</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Es trocknet kein Gerät und erreicht nichts, was hinter der
            Dichtung liegt. Gegen Feuchtigkeit auf der Platine hilft kein Ton,
            sondern nur, das Gerät auszulassen und es öffnen zu lassen.
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-faint">
        Ob es wirkt, hängt davon ab, wo das Wasser steht, und wir versprechen
        nichts. Schaden kann es nicht: Bewegt wird die Membran in dem Bereich,
        für den sie gebaut ist – dieselbe Auslenkung wie bei einem Basslauf,
        nur länger am Stück.
      </p>
    </div>
  );
}
