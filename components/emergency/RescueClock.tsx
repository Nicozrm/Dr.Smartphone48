"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/*
  Rettungsuhr.

  Sie zählt die Zeit seit dem Wasserkontakt und markiert, welcher Schritt
  gerade dran ist. Was sie bewusst nicht tut: einen Countdown behaupten.

  Korrosion beginnt, sobald Wasser die Platine berührt, und läuft über
  Stunden und Tage weiter – es gibt keine Frist, die um 14:07 abläuft. Ein
  rot blinkender Balken würde also etwas erfinden, das es nicht gibt, und
  jemanden weiter unter Druck setzen, der gerade genug Druck hat.

  Die Phasen sind Prioritäten, keine Fristen. Deshalb sagt die Uhr nie
  „zu spät“, sondern immer nur, was als Nächstes das Beste ist.
*/

interface Phase {
  /** Beginn der Phase in Minuten nach dem Kontakt. */
  from: number;
  title: string;
  action: string;
}

const phases: Phase[] = [
  {
    from: 0,
    title: "Strom weg",
    action:
      "Nur das zählt jetzt: ausschalten, nichts anschließen. Alles andere kann warten.",
  },
  {
    from: 3,
    title: "Öffnen, was ohne Werkzeug geht",
    action:
      "Hülle ab, SIM- und Speicherkarte heraus, abtupfen, Anschlüsse nach unten ausklopfen.",
  },
  {
    from: 20,
    title: "Kühl, trocken, unbewegt",
    action:
      "Aufrecht bei Zimmertemperatur ablegen. Nicht föhnen, nicht in Reis, nicht ausprobieren.",
  },
  {
    from: 120,
    title: "Jetzt zählt die Reinigung",
    action:
      "Durch weiteres Warten gewinnt niemand etwas. Rückstände lassen sich nur zerlegt und im Ultraschallbad entfernen.",
  },
];

const starts: { label: string; minutesAgo: number }[] = [
  { label: "Gerade eben", minutesAgo: 0 },
  { label: "Vor ein paar Minuten", minutesAgo: 5 },
  { label: "Vor etwa einer Stunde", minutesAgo: 60 },
  { label: "Länger her", minutesAgo: 240 },
];

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RescueClock() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  if (startedAt === null) {
    return (
      <div className="rounded-[var(--radius-l)] border border-line bg-raised p-5 md:p-6">
        <p className="flex items-center gap-2 text-[0.875rem] font-medium text-ink-strong">
          <Icon name="clock" size={17} className="text-ink-soft" />
          Wann ist es passiert?
        </p>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
          Dann sagen wir Ihnen, welcher Schritt gerade der wichtigste ist.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {starts.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                const at = Date.now() - option.minutesAgo * 60_000;
                setStartedAt(at);
                setNow(Date.now());
              }}
              className="inline-flex h-10 items-center rounded-full border border-line px-4 text-[0.875rem] text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = seconds / 60;
  const currentIndex = phases.reduce(
    (acc, phase, i) => (minutes >= phase.from ? i : acc),
    0,
  );
  const current = phases[currentIndex];

  return (
    <div className="rounded-[var(--radius-l)] border border-line bg-raised p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.875rem] font-medium text-ink-strong">
          <Icon name="clock" size={17} className="text-ink-soft" />
          Seit dem Kontakt
        </p>
        <p
          className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-ink-strong"
          role="timer"
          aria-live="off"
        >
          {formatElapsed(seconds)}
        </p>
      </div>

      <div className="mt-5 rounded-[var(--radius-m)] border border-accent bg-accent-subtle p-4">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-accent">
          Jetzt dran
        </p>
        <p className="mt-1.5 text-[0.9375rem] font-medium text-ink-strong">
          {current.title}
        </p>
        <p className="mt-1 text-[0.875rem] leading-relaxed text-ink">
          {current.action}
        </p>
      </div>

      <ol className="mt-5 space-y-2.5">
        {phases.map((phase, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={phase.title} className="flex items-start gap-3">
              <span
                className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.5rem] ${
                  active
                    ? "border-accent bg-accent text-accent-contrast"
                    : done
                      ? "border-line-strong bg-line-strong text-[var(--surface-raised)]"
                      : "border-line text-transparent"
                }`}
                aria-hidden="true"
              >
                <Icon name="check" size={9} />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[0.875rem] ${
                    active
                      ? "font-medium text-ink-strong"
                      : done
                        ? "text-ink-faint line-through"
                        : "text-ink-soft"
                  }`}
                >
                  {phase.title}
                </span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] text-ink-faint">
                  {phase.from === 0
                    ? "ab Minute 0"
                    : phase.from < 60
                      ? `ab Minute ${phase.from}`
                      : `ab Stunde ${phase.from / 60}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft">
        Diese Uhr zählt, sie mahnt nicht. Es gibt keine Frist, nach der nichts
        mehr zu retten wäre – aber es gibt eine Reihenfolge, und die steht
        oben.
      </p>

      <button
        type="button"
        onClick={() => setStartedAt(null)}
        className="mt-3 text-[0.8125rem] text-ink-faint underline underline-offset-4 transition-colors hover:text-ink-strong"
      >
        Zeitpunkt korrigieren
      </button>
    </div>
  );
}
