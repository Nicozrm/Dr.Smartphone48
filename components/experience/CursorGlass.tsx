"use client";

import { useEffect } from "react";

/**
 * Glasring um den Zeiger.
 *
 * Bewusst **zusätzlich** zum Systemcursor, nicht an seiner Stelle. Wer den
 * echten Cursor versteckt und durch eine nachziehende Grafik ersetzt, baut
 * genau das Gefühl ein, das diese Seite an anderer Stelle bekämpft: eine
 * Verzögerung zwischen Hand und Bild. Der Ring darf nachziehen, weil er nur
 * begleitet – die Spitze, mit der man zielt, sitzt weiterhin exakt.
 *
 * Der Ring ist echtes Glas: Er filtert, was unter ihm liegt (backdrop-filter),
 * statt eine milchige Fläche darüberzulegen. Über hellen Karten wirkt er
 * deshalb anders als über dem schwarzen Zahlenband – wie eine Linse, nicht
 * wie ein Aufkleber.
 *
 * Aus bei grobem Zeiger (Touch) und bei prefers-reduced-motion. Die Position
 * wird über `translate` geschrieben, nicht über `transform`, damit eine
 * eventuelle `scale`-Animation am selben Element nicht kollidiert.
 */
export function CursorGlass() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const ring = document.createElement("div");
    ring.className = "cursor-glass";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    // Ziel = wahre Zeigerposition, Ist = gezeichnete. Die Differenz ist die
    // Trägheit; 0,18 pro Bild ergibt ein Nachlaufen von etwa 60 ms – spürbar
    // weich, aber nie so weit hinterher, dass es wie ein Fehler aussieht.
    let tx = -100;
    let ty = -100;
    let x = tx;
    let y = ty;
    let raf = 0;
    let running = false;

    const draw = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      ring.style.translate = `${x}px ${y}px`;

      // Steht der Ring, hört das Zeichnen auf – ein dauerhaft laufender
      // Frame-Loop für einen ruhenden Ring wäre reine Akkuverschwendung.
      if (Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1) {
        x = tx;
        y = ty;
        ring.style.translate = `${x}px ${y}px`;
        running = false;
        return;
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      tx = event.clientX;
      ty = event.clientY;
      if (!ring.dataset.on) {
        // Beim ersten Auftauchen nicht von links oben hereinfliegen.
        x = tx;
        y = ty;
        ring.dataset.on = "true";
      }
      start();

      // Über Bedienbarem weitet sich der Ring und wird eine Spur klarer.
      const target = event.target as Element | null;
      const interactive = target?.closest?.(
        'a, button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
      );
      ring.dataset.active = interactive ? "true" : "";
    };

    const onLeave = () => {
      delete ring.dataset.on;
      ring.dataset.hidden = "true";
    };
    const onEnter = () => {
      delete ring.dataset.hidden;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);
    // Beim Drücken wird der Ring kurz kleiner – die einzige Rückmeldung,
    // die er überhaupt gibt.
    const onDown = () => (ring.dataset.press = "true");
    const onUp = () => delete ring.dataset.press;
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      ring.remove();
    };
  }, []);

  return null;
}
