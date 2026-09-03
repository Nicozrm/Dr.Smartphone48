"use client";

import { useEffect } from "react";

/*
  Der Glanz auf der Scheibe.

  Eine Glasfläche, deren Reflex sich beim Bewegen des Zeigers nicht ändert,
  ist eine bedruckte Folie. Der Glanz wandert deshalb mit: `.glass-pane`
  liest --gx/--gy und setzt dort seine Ellipse (siehe globals.css).

  Der teure Weg wäre, an `document` einen pointermove zu hängen und darin bei
  jedem Bild zu ermitteln, welche Scheibe gerade darunterliegt. Stattdessen
  arbeitet diese Datei mit zwei Ereignissen:

  – `pointerover` sagt (per Delegation, ein einziger Zuhörer für die ganze
    Seite), welche Scheibe angefahren wurde.
  – Erst dann wird ein `pointermove` an genau diese eine Scheibe gehängt, und
    beim Verlassen wieder abgenommen.

  Damit rechnet nie mehr als ein Element, und im Ruhezustand rechnet keines.

  Zwei Fälle, in denen es die Datei gar nicht erst gibt:

  – **Grober Zeiger.** Auf einem Touchscreen liegt der Finger auf der Fläche,
    die er beleuchten soll. Ein Glanzpunkt unter dem Finger ist keiner.
  – **prefers-reduced-motion.** Ein Reflex, der einem Zeiger folgt, ist
    Bewegung – auch wenn sich nichts verschiebt.

  Geschrieben wird nur im Animationsbild, und nur zwei Zahlen. Custom
  Properties zu *animieren* wäre teuer (siehe CLAUDE.md, „Der Akzent atmet");
  sie auf Zeigerbewegung zu setzen ist eine Neuzeichnung genau eines
  Verlaufs auf genau einem Element.
*/

const SELECTOR = ".glass-pane[data-sheen]";

export function GlassSheen() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active: HTMLElement | null = null;
    let frame = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      frame = 0;
      if (!active) return;
      const r = active.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      active.style.setProperty("--gx", `${(((px - r.left) / r.width) * 100).toFixed(1)}%`);
      active.style.setProperty("--gy", `${(((py - r.top) / r.height) * 100).toFixed(1)}%`);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const release = () => {
      if (!active) return;
      active.removeEventListener("pointermove", onMove);
      active.removeEventListener("pointerleave", release);
      // Zurück auf die Voreinstellung: oben Mitte, die Lichtrichtung der Seite.
      active.style.removeProperty("--gx");
      active.style.removeProperty("--gy");
      active = null;
    };

    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!target || target === active) return;
      release();
      active = target;
      active.addEventListener("pointermove", onMove);
      active.addEventListener("pointerleave", release);
      px = e.clientX;
      py = e.clientY;
      paint();
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      release();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
