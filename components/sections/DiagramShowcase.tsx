"use client";

import { useEffect, useState } from "react";
import { DeviceDiagram } from "@/components/configurator/DeviceDiagram";
import { repairMeta, type DiagramPart } from "@/lib/data/devices";
import { formatEuro } from "@/lib/format";

const sequence: { part: DiagramPart; label: string; price: number }[] = [
  { part: "screen", label: repairMeta.display.label, price: 199 },
  { part: "battery", label: repairMeta.battery.label, price: 79 },
  { part: "camera", label: repairMeta.camera.label, price: 109 },
  { part: "port", label: repairMeta.chargeport.label, price: 89 },
  { part: "back", label: repairMeta.backglass.label, price: 119 },
];

/**
 * Demonstriert den Sofortpreis-Rechner: Das Diagramm durchläuft ruhig die
 * Bauteile, der Preis wechselt mit. Bei prefers-reduced-motion steht es still.
 */
export function DiagramShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % sequence.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const current = sequence[index];

  return (
    <div className="relative rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-raised">
      <DeviceDiagram highlight={current.part} className="mx-auto w-full max-w-[300px]" />
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-5">
        <span key={`l-${current.part}`} className="price-swap text-[0.9375rem] font-medium text-ink-strong">
          {current.label}
        </span>
        <span
          key={`p-${current.part}`}
          className="price-swap font-mono text-2xl font-semibold tracking-tight text-ink-strong"
        >
          ab {formatEuro(current.price)}
        </span>
      </div>
      <p className="mt-1.5 text-[0.8125rem] text-ink-faint">
        iPhone 13 · Beispielpreise inkl. Einbau und Garantie
      </p>
    </div>
  );
}
