"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/*
  PWM – warum manche Displays abends Kopfschmerzen machen.

  Ein OLED kann seine Leuchtdioden nicht wie eine Glühbirne herunterdimmen.
  Er schaltet sie stattdessen sehr schnell an und aus; je dunkler es sein
  soll, desto länger bleibt der Aus-Anteil. Das Auge sieht einen Mittelwert,
  das Nervensystem eines Teils der Menschen aber die Dunkelphasen dazwischen –
  Kopfschmerz, Augendruck, Übelkeit nach längerem Lesen im Dunkeln.

  Entscheidend ist die Frequenz. Gute Panels schalten mit einigen tausend
  Hertz; günstige Nachbauten oft mit wenigen hundert. Genau diese Zahl steht
  in keinem Datenblatt eines Ersatzteils, und genau sie merkt der Kunde
  hinterher – nachts, nach zwei Wochen, ohne zu wissen, woran es liegt.

  ── Warum hier nichts flimmert ───────────────────────────────────────────
  Der naheliegende Weg wäre, beide Panels verlangsamt blinken zu lassen.
  Er ist falsch, und zwar nicht ein bisschen: Eine gleichmäßige Zeitlupe
  dreht die Aussage um. 3.000 Hz haben die *kürzere* Periode als 240 Hz –
  verlangsamt blinkt das gute Panel also schneller und wirkt damit
  unruhiger. Der Betrachter lernte das Gegenteil der Wirklichkeit.

  Der Grund, warum 240 Hz stören und 3.000 Hz nicht, ist auch gar nicht die
  Geschwindigkeit an sich, sondern die **Länge der einzelnen Dunkelphase**.
  Deshalb steht hier keine Animation, sondern ein Zeitausschnitt: zehn
  Millisekunden, aufgetragen von links nach rechts. Hell ist hell, schwarz
  ist aus. Was man sieht, ist das Signal – und darunter steht als Zahl, wie
  lange es am Stück dunkel bleibt.

  Dass der schnelle Streifen bei niedriger Helligkeit zu einer gleichmäßig
  matten Fläche verschmiert, ist kein Darstellungsfehler. Es ist genau das,
  was das Auge mit ihm macht.
*/

interface Panel {
  id: string;
  label: string;
  tag: string;
  /** Schaltfrequenz in Hertz – Größenordnung einer Panelklasse, kein Messwert. */
  hz: number;
  note: string;
  gut: boolean;
}

/** Breite des dargestellten Zeitausschnitts. Zehn Millisekunden. */
const WINDOW_MS = 10;

const panels: Panel[] = [
  {
    id: "hoch",
    label: "Hochfrequente Dimmung",
    tag: "Original & Originalqualität",
    hz: 3000,
    note: "Dreißig Impulse in zehn Millisekunden. Die Dunkelphasen dazwischen sind so kurz und so dicht verteilt, dass praktisch kein Nervensystem sie noch einzeln auflöst – bei niedriger Helligkeit verschmiert der Streifen zur gleichmäßigen Fläche, und genau das tut das Auge auch. Panels dieser Güte verbauen wir.",
    gut: true,
  },
  {
    id: "niedrig",
    label: "Niederfrequente Dimmung",
    tag: "typisch für günstige Nachbauten",
    hz: 240,
    note: "Dieselbe Helligkeit, verteilt auf gut zwei lange Dunkelphasen im selben Zeitraum. Für die meisten Menschen bleibt das unsichtbar – für empfindliche ist es der Unterschied zwischen „geht schon“ und „abends kann ich damit nicht mehr lesen“.",
    gut: false,
  },
];

const nf = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: n < 1 ? 2 : 1 });

export function PwmDemo() {
  const [brightness, setBrightness] = useState(25);
  const sliderId = useId();

  /** Hellanteil einer Periode. Hier bewusst linear – siehe Ehrlichkeitszeile. */
  const duty = brightness / 100;

  return (
    <div
      className="rounded-[var(--radius-l)] border border-line bg-raised p-6 md:p-8"
      style={{ ["--pwm-duty" as string]: `${brightness}%` }}
    >
      <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
        <Icon name="waveform" size={14} />
        Flimmern bei niedriger Helligkeit
      </p>
      <h3 className="text-title mt-3">
        Warum manche Displays abends Kopfschmerzen machen
      </h3>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
        Ein OLED dimmt nicht, er blinkt. Je dunkler das Bild sein soll, desto
        länger sind die Pausen zwischen den Blitzen. Wie schnell ein Panel
        dabei schaltet, steht in keinem Datenblatt eines Ersatzteils – und ist
        der häufigste Grund für Beschwerden, die niemand einem neuen Display
        zuordnet.
      </p>

      {/* Regler */}
      <div className="mt-7 max-w-md">
        <label
          htmlFor={sliderId}
          className="flex items-baseline justify-between text-[0.875rem] font-medium text-ink-strong"
        >
          Helligkeit
          <span className="font-mono text-[0.8125rem] text-ink-soft">
            {brightness} %
          </span>
        </label>
        <input
          id={sliderId}
          type="range"
          min={5}
          max={100}
          step={5}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sunken accent-[var(--accent)]"
        />
        <p className="mt-1.5 text-[0.8125rem] text-ink-soft">
          Je dunkler, desto länger die Dunkelphasen. Bei voller Helligkeit
          leuchtet durchgehend – das Problem entsteht erst nachts.
        </p>
      </div>

      {/* Die beiden Zeitausschnitte */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {panels.map((p) => {
          const pulses = (p.hz * WINDOW_MS) / 1000;
          const darkMs = (1000 / p.hz) * (1 - duty);
          return (
            <div
              key={p.id}
              className="rounded-[var(--radius-m)] border border-line bg-page p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-ink-strong">{p.label}</span>
                <span
                  className="font-mono text-[0.75rem]"
                  style={{ color: p.gut ? "var(--positive)" : "var(--warn)" }}
                >
                  ~{p.hz.toLocaleString("de-DE")} Hz
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                {p.tag}
              </p>

              <div
                className="pwm-strip mt-3.5"
                style={{ ["--pwm-tile" as string]: `${100 / pulses}%` }}
                role="img"
                aria-label={`${p.hz.toLocaleString("de-DE")} Hell-Dunkel-Wechsel pro Sekunde bei ${brightness} Prozent Helligkeit. Jede Dunkelphase dauert ${nf(darkMs)} Millisekunden.`}
              />
              <div className="mt-1.5 flex justify-between font-mono text-[0.6875rem] text-ink-faint">
                <span>0 ms</span>
                <span>{WINDOW_MS} ms</span>
              </div>

              <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3 text-[0.875rem]">
                <span className="text-ink-soft">Eine Dunkelphase dauert</span>
                <span
                  className="font-mono tabular-nums"
                  style={{ color: p.gut ? "var(--positive)" : "var(--warn)" }}
                >
                  {nf(darkMs)} ms
                </span>
              </p>

              <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                {p.note}
              </p>
            </div>
          );
        })}
      </div>

      {/* Die Pointe: Helligkeit gleich, Verteilung verschieden. */}
      <div className="mt-4 flex items-center gap-4 rounded-[var(--radius-m)] border border-line bg-page p-4">
        <span className="pwm-average" aria-hidden="true" />
        <p className="text-[0.875rem] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink-strong">
            Beide Panels wirken exakt gleich hell.
          </span>{" "}
          Das Auge bildet über die Zeit einen Mittelwert – und der ist bei
          gleichem Hellanteil derselbe. Der Unterschied steckt nicht in der
          Helligkeit, sondern darin, wie fein die Dunkelphasen darauf verteilt
          sind.
        </p>
      </div>

      {/* Die Ehrlichkeitszeile – nicht kleingedruckt, sondern Teil der Aussage. */}
      <p className="mt-6 border-t border-line pt-5 text-[0.875rem] leading-relaxed text-ink-soft">
        <span className="font-medium text-ink-strong">
          Was Sie hier sehen, ist ein Diagramm, keine Messung.
        </span>{" "}
        Echtes Flimmern lässt sich auf Ihrem Bildschirm nicht zeigen – er hat
        eine eigene Bildrate und eine eigene Dimmung. Die Hertz-Angaben sind
        Größenordnungen üblicher Panelklassen, keine Messwerte am einzelnen
        Ersatzteil. Und der Zusammenhang zwischen Regler und Hellanteil ist bei
        echten Geräten nicht linear, hier schon – sonst wäre der Zusammenhang
        nicht sichtbar.
      </p>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
        Wenn Sie auf Flimmern empfindlich reagieren, sagen Sie es uns vor der
        Reparatur. Dann verbauen wir gezielt ein Panel mit hoher
        Schaltfrequenz – und sagen Ihnen ehrlich, wenn wir für Ihr Modell
        keines bekommen.
      </p>
    </div>
  );
}
