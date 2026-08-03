"use client";

import { Icon } from "@/components/ui/Icon";
import type { Shortcut } from "@/lib/workshop/useShortcuts";

/*
  Die Hilfe zu den Kürzeln.

  Sie steht hier, weil ein unsichtbares Kürzel keins ist: Wer nicht weiß, dass
  `j` und `k` durch die Liste gehen, drückt es nie. Die Liste entsteht aus
  denselben Objekten, die die Tasten belegen – eine Hilfe, die veraltet, wäre
  schlimmer als keine.
*/

export function ShortcutHelp({
  shortcuts,
  onClose,
}: {
  shortcuts: Shortcut[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--surface-inverse)]/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Tastaturkürzel"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-floating"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-title">Tastaturkürzel</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink-strong"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <dl className="mt-5 space-y-2.5">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-baseline justify-between gap-4">
              <dt>
                <kbd className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-[6px] border border-line bg-sunken px-2 font-mono text-[0.8125rem] text-ink-strong">
                  {shortcut.display ?? shortcut.key}
                </kbd>
              </dt>
              <dd className="text-right text-[0.875rem] text-ink-soft">{shortcut.label}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-[0.8125rem] leading-relaxed text-ink-faint">
          Kürzel wirken nicht, solange ein Eingabefeld den Fokus hat – dort
          sind Buchstaben Buchstaben.
        </p>
      </div>
    </div>
  );
}
