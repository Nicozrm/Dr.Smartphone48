"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatHz, harmonicDistortion } from "@/lib/audio/spectrum";

/**
 * Klirrfaktor-Messung.
 *
 * Der Lautsprecher spielt einen reinen Ton, das Mikrofon hört zu, und
 * gemessen wird, wie viel davon als Vielfaches wieder herauskommt. Eine
 * angerissene Sicke oder eine schleifende Schwingspule verzerrt lange,
 * bevor ein Mensch den Fehler hört – und genau das macht diese Messung
 * sichtbar.
 *
 * ## Warum eine Rampe und keine einzelne Zahl
 *
 * Ein einzelner Klirrfaktor wäre wertlos. Er hängt am Raum, am Abstand, am
 * Mikrofon; „2,4 %" ohne diese Angaben ist eine Zahl ohne Aussage. Was
 * aussagekräftig ist, ist der **Verlauf über die Lautstärke**: Ein gesunder
 * Lautsprecher bleibt lange sauber und klirrt erst kurz unter
 * Vollaussteuerung, ein beschädigter klirrt von der ersten Stufe an. Diese
 * Form vergleicht denselben Aufbau mit sich selbst und ist deshalb von Raum
 * und Mikrofon weitgehend unabhängig.
 *
 * Das ist auch der Grund, warum hier kein Grenzwert steht. „Unter 1 % ist
 * gut" gilt für einen Messplatz, nicht für ein Telefon auf einem
 * Küchentisch.
 *
 * ## Der Unterschied zum Frequenzgang-Test darüber
 *
 * Der Test im Geräte-Check fährt einen Sweep und misst, welche Frequenzen
 * überhaupt ankommen – ob also etwas fehlt. Diese Messung hält eine
 * Frequenz fest und misst, was **dazukommt**. Ein Lautsprecher kann einen
 * tadellosen Frequenzgang haben und trotzdem kratzen.
 *
 * ## Echounterdrückung muss aus, sonst misst man nichts
 *
 * Der Browser ist darauf gebaut, ein Signal zu entfernen, das gerade aus dem
 * eigenen Lautsprecher kam – für ein Telefonat genau richtig, hier fatal:
 * Das eigene Signal ist die Messgröße.
 */

/** 1 kHz: mitten im empfindlichsten Bereich des Gehörs, und alle fünf
    Oberwellen liegen noch unter der Nyquist-Grenze jedes Telefons. */
const TONE_HZ = 1000;

/**
 * Fünf Stufen, grob logarithmisch. Die oberste bleibt deutlich unter
 * Vollaussteuerung: Übersteuert der Verstärker, misst man dessen Begrenzung
 * und nicht den Lautsprecher – und laut genug, um jemanden zu erschrecken,
 * wäre es auch.
 */
const LEVELS = [0.03, 0.07, 0.15, 0.3, 0.55];

/** Je Stufe: einschwingen lassen, dann mehrere Bilder mitteln. */
const SETTLE_MS = 260;
const FRAMES = 7;

/**
 * Unterhalb dieser Amplitude ist die Grundwelle im Rauschen.
 *
 * Das ist keine Feinheit, sondern die Stelle, an der diese Messung sonst
 * Unsinn ausgibt: Der Klirrfaktor teilt die Oberwellen durch die Grundwelle.
 * Ist die Grundwelle nur Rauschen, teilt man Rauschen durch Rauschen – im
 * Test kamen dabei 550 % heraus. Eine solche Zahl ist nicht bloß falsch, sie
 * sieht auch noch nach Befund aus.
 *
 * Deshalb wird jede Stufe einzeln geprüft und ohne verwertbare Grundwelle
 * gar nichts angezeigt. Dieselbe Regel wie beim Ablesewert des Stethoskops:
 * kein Signal, keine Behauptung.
 */
const USABLE_AMPLITUDE = 0.0006;

type Phase = "idle" | "running" | "done" | "denied" | "unsupported";

interface Step {
  level: number;
  thd: number;
  fundamental: number;
  harmonics: number[];
}

const percentFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Distortion() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [at, setAt] = useState(0);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  const run = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Ohne diese drei misst man die Aufbereitung statt des Lautsprechers;
        // die Echounterdrückung entfernt gezielt das eigene Signal.
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
    analyser.fftSize = 8192; // feiner als beim Stethoskop: die Oberwellen
    analyser.smoothingTimeConstant = 0; // sollen sauber getrennt sein
    source.connect(analyser);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = TONE_HZ;
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    const bins = new Float32Array(analyser.frequencyBinCount);
    let abort = false;

    stopRef.current = () => {
      abort = true;
      try {
        osc.stop();
      } catch {
        /* schon gestoppt */
      }
      stream.getTracks().forEach((track) => track.stop());
      void ctx.close();
      stopRef.current = () => {};
    };

    setSteps([]);
    setAt(0);
    setPhase("running");

    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    const measured: Step[] = [];

    for (let i = 0; i < LEVELS.length && !abort; i++) {
      setAt(i);
      // Rampe statt Sprung: Ein harter Pegelwechsel erzeugt ein Knacken, und
      // ein Knacken ist breitbandig – es landete als Oberwelle in der Messung.
      gain.gain.setTargetAtTime(LEVELS[i], ctx.currentTime, 0.03);
      await wait(SETTLE_MS);

      /* Median statt Mittelwert: Ein einzelnes Störgeräusch – ein Klopfen,
         ein Wort im Nebenzimmer – zieht einen Mittelwert mit, den Median
         nicht. */
      const runs: Step[] = [];
      for (let f = 0; f < FRAMES && !abort; f++) {
        analyser.getFloatFrequencyData(bins);
        const d = harmonicDistortion(bins, ctx.sampleRate, TONE_HZ);
        runs.push({ level: LEVELS[i], ...d });
        await wait(40);
      }
      runs.sort((a, b) => a.thd - b.thd);
      measured.push(runs[Math.floor(runs.length / 2)]);
      setSteps([...measured]);
    }

    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    await wait(150);
    stopRef.current();
    if (!abort) setPhase("done");
  }, []);

  const stop = useCallback(() => {
    stopRef.current();
    setPhase("idle");
  }, []);

  const running = phase === "running";
  const usable = (step: Step) => step.fundamental >= USABLE_AMPLITUDE;
  const measured = steps.filter(usable);
  const loudest = measured.length ? measured[measured.length - 1] : null;
  const maxThd = Math.max(0.02, ...measured.map((s) => s.thd));
  const tooQuiet = steps.length > 0 && measured.length === 0;

  return (
    <div className="dist">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Klirrfaktor</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Der Lautsprecher spielt zwei Sekunden lang einen Ton von{" "}
            {formatHz(TONE_HZ)}, immer lauter, und das Mikrofon hört mit.
            Gemessen wird, wie viel davon als Vielfaches zurückkommt – daran
            erkennt man einen angeschlagenen Lautsprecher, lange bevor man ihn
            hört.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Stellen Sie die Lautstärke auf etwa die Hälfte und legen Sie das
            Gerät hin. Ein Kopfhörer im Anschluss verfälscht die Messung – dann
            misst das Mikrofon den Raum.
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
              {phase === "done" ? "Noch einmal messen" : "Messen"}
              <Icon name="arrow-right" size={15} />
            </>
          )}
        </button>
      </div>

      {/* --- Die Rampe --- */}
      <div className="dist-ramp mt-7">
        {LEVELS.map((level, i) => {
          const step = steps[i];
          const good = step ? usable(step) : false;
          return (
            <div key={level} className="dist-col" data-active={running && at === i}>
              <div className="dist-bar-slot">
                {good ? (
                  <div
                    className="dist-bar"
                    style={{ height: `${Math.max(2, (step.thd / maxThd) * 100)}%` }}
                  />
                ) : null}
              </div>
              <p className="dist-value tabular-nums">
                {good ? `${percentFormat.format(step.thd * 100)} %` : "—"}
              </p>
              <p className="dist-level tabular-nums">
                Stufe {i + 1}
              </p>
            </div>
          );
        })}
      </div>

      {/* --- Die Oberwellen der lautesten Stufe --- */}
      {loudest ? (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Was bei der lautesten Stufe herauskam
          </p>
          <ul className="dist-harmonics mt-3">
            <li>
              <span className="dist-hz">{formatHz(TONE_HZ)}</span>
              <span className="dist-role">Grundton</span>
              <span className="dist-share tabular-nums">100 %</span>
            </li>
            {loudest.harmonics.map((amplitude, n) => (
              <li key={n}>
                <span className="dist-hz">{formatHz(TONE_HZ * (n + 2))}</span>
                <span className="dist-role">{n + 2}. Oberwelle</span>
                <span className="dist-share tabular-nums">
                  {loudest.fundamental > 0
                    ? `${percentFormat.format((amplitude / loudest.fundamental) * 100)} %`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 text-sm leading-relaxed text-ink-soft">
        {phase === "denied" ? (
          <p className="text-danger">Ohne Mikrofonzugriff lässt sich nichts messen.</p>
        ) : phase === "unsupported" ? (
          <p className="text-danger">Dieser Browser gibt kein Mikrofon frei.</p>
        ) : tooQuiet ? (
          <p className="text-warn">
            Der Ton kam kaum am Mikrofon an. Lautstärke höher stellen, Gerät
            hinlegen, Kopfhörer abziehen – sonst misst diese Messung den Raum
            und nicht den Lautsprecher.
          </p>
        ) : phase === "done" ? (
          <p>
            Entscheidend ist nicht die einzelne Zahl, sondern der Verlauf: Ein
            gesunder Lautsprecher bleibt über die ersten Stufen flach und
            steigt erst zum Schluss. Steigt die Kurve von Anfang an oder
            springt sie, lohnt sich ein Blick auf die Membran.
          </p>
        ) : (
          <p>
            Es wird die ganze Kette gemessen: Verstärker, Lautsprecher, Luft,
            Mikrofon. Ein Absolutwert sagt deshalb wenig – der Vergleich
            zwischen den Stufen sagt viel.
          </p>
        )}
      </div>
    </div>
  );
}
