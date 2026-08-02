"use client";

import { useEffect } from "react";

/**
 * MagneticField – gibt Elementen mit [data-magnetic] eine leise physische
 * Anziehung: Sie neigen sich dem Zeiger entgegen und federn beim Verlassen
 * zurück. Ein globaler Controller über Event-Delegation, damit kein Button
 * eigene Logik braucht.
 *
 * Nur bei feinem Zeiger (Maus/Trackpad) aktiv und bei ruhender Bewegung
 * abgeschaltet – auf Touch und bei prefers-reduced-motion passiert nichts.
 */
export function MagneticField() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    /**
     * `active` ist das Element unter dem Zeiger, `animating` das Element, das
     * gerade bewegt wird. Beide getrennt zu halten ist der Kern: Beim
     * Verlassen wird `active` sofort null, die Rückfederung braucht die
     * Referenz aber noch. Wurden sie in einer Variablen geführt, blieb die
     * Schaltfläche nach dem Verlassen um bis zu 8 px verschoben stehen – die
     * Rückbewegung lief zwar, schrieb ihr Ergebnis aber auf niemanden mehr.
     */
    let active: HTMLElement | null = null;
    let animating: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const STRENGTH = 0.28;
    const MAX = 8;

    const release = (el: HTMLElement) => {
      el.style.transform = "";
      el.style.willChange = "";
    };

    const animate = () => {
      pos.x += (pos.tx - pos.x) * 0.15;
      pos.y += (pos.ty - pos.y) * 0.15;

      const settled =
        Math.abs(pos.tx - pos.x) < 0.1 && Math.abs(pos.ty - pos.y) < 0.1;

      if (animating) {
        if (settled && !active) {
          // Zur Ruhe gekommen und nicht mehr angefahren: Inline-Stil abräumen,
          // damit das Element wieder allein von CSS bestimmt wird.
          pos.x = 0;
          pos.y = 0;
          release(animating);
          animating = null;
        } else {
          animating.style.transform = `translate(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px)`;
        }
      }

      // Solange gefahren wird oder die Feder noch läuft, weiterrechnen.
      // Ruht der Zeiger auf dem Element, hält die Schleife an, statt
      // dauerhaft Frames zu verbrennen.
      raf = animating && !(settled && !active) ? requestAnimationFrame(animate) : 0;
    };
    const kick = () => {
      if (!raf && animating) raf = requestAnimationFrame(animate);
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic]");
      if (el && el !== active) {
        // Ein noch nachfederndes anderes Element sofort sauber zurücksetzen.
        if (animating && animating !== el) release(animating);
        active = el;
        animating = el;
        rect = el.getBoundingClientRect();
        el.style.willChange = "transform";
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!active) return;
      // Der Rahmen kann durch Scrollen veraltet sein – vor jeder Messung frisch.
      rect = active.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pos.tx = Math.max(-MAX, Math.min(MAX, (e.clientX - cx) * STRENGTH));
      pos.ty = Math.max(-MAX, Math.min(MAX, (e.clientY - cy) * STRENGTH));
      kick();
    };
    const onOut = (e: PointerEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (active && (!to || !active.contains(to))) {
        active = null;
        rect = null;
        pos.tx = 0;
        pos.ty = 0;
        kick();
      }
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      if (animating) release(animating);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
