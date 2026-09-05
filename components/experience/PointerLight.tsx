"use client";

import { useEffect } from "react";

/*
  Das Zeigerlicht.

  Drei Wirkungen, eine Quelle: Wo der Zeiger steht, glänzt die Glasscheibe
  (`--gx/--gy` für `.glass-pane[data-sheen]`), erscheint das Werkstattraster
  (`.lightgrid`) und neigt sich die Karte (`[data-tilt]`).

  Alle drei brauchen dieselbe Zahl – die Position des Zeigers im Element –
  und deshalb gibt es sie hier genau einmal. Drei getrennte Zuhörer wären
  dreimal dieselbe Rechnung und drei Gelegenheiten, dass sie auseinanderläuft.

  **Der teure Weg wäre ein `pointermove` an `document`**, der bei jedem Bild
  ermittelt, welche Fläche gerade darunterliegt. Stattdessen zwei Ereignisse:
  `pointerover` sagt per Delegation, welches Element angefahren wurde – erst
  dann hängt ein `pointermove` an genau diesem einen. Im Ruhezustand rechnet
  nichts, und nie mehr als ein Element gleichzeitig.

  **Die Neigung wird direkt als `transform` geschrieben, nicht als Custom
  Property.** Ein per Zeiger gesetzter Wert, aus dem eine Transform gemischt
  wird, kostet in Chromium je Bild eine Stilneuberechnung – dieselbe Falle,
  wegen der der Akzent nicht über `@property` atmet (siehe CLAUDE.md). Der
  fertige String kostet nur das Compositing.

  `transform` ist dabei frei: `.press` benutzt `scale`, `.lift` und die
  magnetische Anziehung benutzen `translate`. Genau dafür wurden die drei im
  Motion-System auseinandergezogen.

  Zwei Fälle, in denen es die Datei gar nicht erst gibt:

  – **Grober Zeiger.** Auf einem Touchscreen liegt der Finger auf der Fläche,
    die er beleuchten soll. Ein Glanzpunkt unter dem Finger ist keiner, und
    eine Karte, die sich unter der Berührung wegdreht, ist ein Fehler.
  – **prefers-reduced-motion.** Ein Reflex, der einem Zeiger folgt, ist
    Bewegung – auch wenn sich nichts verschiebt.
*/

/** Alles, was --gx/--gy liest. Wer eine Fläche ergänzt, trägt sie hier ein. */
const SELECTOR = ".glass-pane[data-sheen], .lightgrid, [data-tilt]";

/** Maximaler Ausschlag der Neigung in Grad. Mehr wirkt wie Bonbonpapier. */
const TILT_DEG = 1.15;

export function PointerLight() {
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

      // Anteil 0…1 in beiden Richtungen, an den Rändern geklemmt: Ein Zeiger,
      // der beim Verlassen noch ein Ereignis abgibt, soll die Neigung nicht
      // über den Anschlag treiben.
      const fx = Math.min(Math.max((px - r.left) / r.width, 0), 1);
      const fy = Math.min(Math.max((py - r.top) / r.height, 0), 1);

      active.style.setProperty("--gx", `${(fx * 100).toFixed(1)}%`);
      active.style.setProperty("--gy", `${(fy * 100).toFixed(1)}%`);

      if (active.hasAttribute("data-tilt")) {
        // Der Zeiger zieht die nächste Kante zu sich: oben am Rand kippt die
        // Karte nach hinten, nicht nach vorn. Deshalb das Vorzeichen bei X.
        const rx = (0.5 - fy) * 2 * TILT_DEG;
        const ry = (fx - 0.5) * 2 * TILT_DEG;
        active.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      }
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
      active.removeAttribute("data-lit");
      if (active.hasAttribute("data-tilt")) {
        // Erst die Transition zurückgeben, dann die Neigung nehmen – sonst
        // schnappt die Karte in einem Bild zurück statt zu gleiten.
        active.removeAttribute("data-tilting");
        active.style.transform = "";
      }
      active = null;
    };

    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!target || target === active) return;
      release();
      active = target;
      active.addEventListener("pointermove", onMove);
      active.addEventListener("pointerleave", release);
      active.dataset.lit = "true";
      if (active.hasAttribute("data-tilt")) active.dataset.tilting = "true";
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
