"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Die Auswahl-Bestätigung – innen eine Insel, außen eine Vorlesehilfe.
 *
 * Sie beantwortet die Frage, die der Konfigurator bisher nur nebenbei
 * beantwortet hat: „Ist mein Klick angekommen?" Der Preis rechts aktualisiert
 * sich zwar, steht auf schmalen Schirmen aber unterhalb der Auswahl – also
 * außerhalb des Blickfelds im Moment des Klicks.
 *
 * Zwei Dinge, die sie von reiner Zierde unterscheiden:
 *
 * – **Sie ist eine `aria-live`-Region.** Was hier erscheint, wird
 *   vorgelesen. Damit ist sie für Screenreader-Nutzung die Bestätigung,
 *   die sehende Nutzung durch die Bewegung bekommt – nicht ein Effekt
 *   obendrauf, sondern derselbe Dienst über zwei Kanäle.
 * – **Sie verschwindet von selbst.** Eine Bestätigung, die stehen bleibt,
 *   ist keine Bestätigung mehr, sondern ein Element.
 *
 * Ohne Bewegungswunsch erscheint sie ohne Animation und bleibt etwas länger
 * stehen – der Inhalt zählt, die Choreografie nicht.
 */

export interface PillContent {
  /** Wechselt der Schlüssel, erscheint die Insel neu. */
  key: string;
  icon: IconName;
  label: string;
  /** Rechts, einzeilig – Preis, Dauer, Zustand. */
  detail?: string;
  /** Für die Vorlesehilfe, falls sie ausführlicher sein muss als der Text. */
  spoken?: string;
}

const SICHTBAR_MS = 2600;

export function SelectionPill({ content }: { content: PillContent | null }) {
  const [shown, setShown] = useState<PillContent | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!content) return;
    setShown(content);
    window.clearTimeout(timer.current);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(
      () => setShown(null),
      reduced ? SICHTBAR_MS + 900 : SICHTBAR_MS,
    );
    return () => window.clearTimeout(timer.current);
  }, [content]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-[120] flex justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {shown ? (
        <p
          key={shown.key}
          className="selection-pill glass-strong flex max-w-[min(30rem,100%)] items-center gap-3 rounded-full py-2.5 pl-4 pr-5 shadow-floating"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-contrast">
            <Icon name={shown.icon} size={15} />
          </span>
          <span className="min-w-0 truncate text-[0.9375rem] font-medium text-ink-strong">
            {shown.label}
          </span>
          {shown.detail ? (
            <span className="ml-auto shrink-0 font-mono text-[0.875rem] text-ink-soft">
              {shown.detail}
            </span>
          ) : null}
          {shown.spoken ? <span className="sr-only">{shown.spoken}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
