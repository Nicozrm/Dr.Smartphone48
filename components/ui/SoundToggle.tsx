"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { playClick, soundEnabled, toggleSound } from "@/lib/sound";

/**
 * Schalter für den Klickton im Sofortpreis-Rechner. Standardmäßig aus, wie
 * jeder Ton auf dieser Website – siehe `lib/sound.ts`.
 *
 * Klein und zurückhaltend, absichtlich kein Platz in der Kopfzeile wie beim
 * Theme: Ton ist eine Zugabe für den einen Rechner, keine Grundeinstellung
 * der ganzen Seite.
 */
export function SoundToggle({ className = "" }: { className?: string }) {
  // „Aus" ist der sichere Anfangswert für Server und ersten Client-Durchlauf
  // gleichermaßen – es gibt kein No-Flash-Skript wie beim Theme, das den
  // wirklichen Stand schon vor React kennen könnte. Erst nach der Hydration
  // liest der Effekt localStorage und zieht den Schalter still nach, ohne
  // dass die Schaltfläche selbst verschwindet oder neu einblendet.
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(soundEnabled());
    const onChange = (e: Event) => setOn((e as CustomEvent<boolean>).detail ?? soundEnabled());
    window.addEventListener("op-soundchange", onChange);
    return () => window.removeEventListener("op-soundchange", onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleSound();
        // Direktes Feedback für die Handlung selbst: Wer den Ton einschaltet,
        // soll ihn im selben Klick hören, nicht erst beim nächsten.
        if (next) playClick("on");
      }}
      aria-pressed={on}
      title={on ? "Klickton ausschalten" : "Klickton einschalten"}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.75rem] transition-colors duration-[var(--duration-fast)] ${
        on
          ? "border-accent bg-accent-subtle font-medium text-accent"
          : "border-line text-ink-faint hover:border-ink-faint hover:text-ink-soft"
      } ${className}`}
    >
      <Icon name="waveform" size={13} />
      Klickton {on ? "an" : "aus"}
    </button>
  );
}
