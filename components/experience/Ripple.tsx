"use client";

import { useEffect } from "react";

/**
 * Ripple – der Lichtkreis, der beim Drücken unter der Fläche ausläuft.
 *
 * Ein einziger delegierter Zuhörer für die ganze Seite, wie beim
 * MagneticField: Jede Schaltfläche mit [data-ripple] bekommt den Effekt,
 * ohne selbst Logik zu tragen.
 *
 * Zwei Entscheidungen, die den Unterschied zwischen „Material Design" und
 * „Glas" ausmachen:
 *
 * Der Kreis startet **am Druckpunkt**, nicht in der Mitte. Ein Ripple aus der
 * Mitte ist eine Animation, die nach dem Klick abgespielt wird; ein Ripple
 * unter dem Finger ist eine Reaktion auf den Klick. Der Unterschied ist
 * unbewusst, aber er entscheidet, ob die Fläche sich angefasst anfühlt.
 *
 * Und er ist so groß wie die Diagonale des Elements, gemessen vom Druckpunkt
 * aus – dadurch erreicht die Welle jede Ecke gleichzeitig und endet nicht
 * sichtbar mittendrin.
 *
 * Aufräumen übernimmt animationend; bleibt das Ereignis aus (Tab wechselt
 * währenddessen), räumt ein Timer nach. Ohne beides sammeln sich bei
 * längerer Nutzung hunderte toter Knoten in den Schaltflächen an.
 */
export function Ripple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onDown = (e: PointerEvent) => {
      // Nur der primäre Knopf – ein Rechtsklick öffnet ein Menü, er drückt nicht.
      if (e.button !== 0) return;
      const host = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-ripple]",
      );
      if (!host) return;

      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Abstand zur entferntesten Ecke – das ist der Radius, bei dem die
      // Welle die Fläche gerade vollständig ausfüllt.
      const reach = Math.hypot(
        Math.max(x, rect.width - x),
        Math.max(y, rect.height - y),
      );

      const span = document.createElement("span");
      span.className = "ripple";
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.width = `${reach * 2}px`;
      span.style.height = `${reach * 2}px`;

      const remove = () => span.remove();
      span.addEventListener("animationend", remove, { once: true });
      window.setTimeout(remove, 1000);

      host.appendChild(span);
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
