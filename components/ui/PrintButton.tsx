"use client";

import { Icon } from "./Icon";

/**
 * Druckt die aktuelle Seite. Eigene Komponente, damit Seiten, die sonst
 * vollständig auf dem Server gerendert werden, für diesen einen Knopf keinen
 * Client-Baum aufmachen müssen.
 *
 * Der Knopf trägt selbst `data-print="hide"` – auf dem Papier hätte er
 * keinen Zweck und stünde nur im Weg.
 */
export function PrintButton({
  label = "Protokoll drucken",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-print="hide"
      onClick={() => window.print()}
      className={`press inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-ink-strong hover:shadow-raised ${className}`}
    >
      <Icon name="check" size={16} />
      {label}
    </button>
  );
}
