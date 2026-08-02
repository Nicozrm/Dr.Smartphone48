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
 *
 * Geschrieben wird **nicht** `style.transform`, sondern die beiden Variablen
 * --mag-x/--mag-y, aus denen globals.css die `translate`-Eigenschaft baut.
 * Grund: Der Druckpunkt (.press) animiert `scale`. Lägen beide in derselben
 * `transform`-Kette, würde entweder die Anziehung nachschleppen (weil sie
 * die Transition des Druckpunkts erbt) oder der Druckpunkt springen (weil
 * jeder Frame der Anziehung ihn überschreibt). Als getrennte Eigenschaften
 * komponiert der Browser beides und jede Ebene behält ihr Timing.
 */
export function MagneticField() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    /*
      `target` ist die Schaltfläche unter dem Zeiger, `driven` diejenige, die
      gerade geschrieben wird. Beim Verlassen sind das kurzzeitig zwei
      verschiedene Dinge: Der Zeiger ist schon weg, die Fläche muss aber noch
      zurückfedern. Ohne diese Trennung bleibt sie in ihrer letzten Auslenkung
      stehen – sichtbar als Schaltfläche, die dauerhaft ein paar Pixel
      schief hängt.
    */
    let target: HTMLElement | null = null;
    let driven: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const STRENGTH = 0.28;
    const MAX = 8;

    const release = (el: HTMLElement) => {
      el.style.willChange = "";
      el.style.removeProperty("--mag-x");
      el.style.removeProperty("--mag-y");
    };

    const animate = () => {
      pos.x += (pos.tx - pos.x) * 0.15;
      pos.y += (pos.ty - pos.y) * 0.15;
      const settled =
        Math.abs(pos.tx - pos.x) < 0.1 && Math.abs(pos.ty - pos.y) < 0.1;

      if (driven) {
        if (settled && !target) {
          // Angekommen und niemand mehr da: Variablen abräumen, damit im
          // style-Attribut nichts von der Bewegung zurückbleibt.
          pos.x = 0;
          pos.y = 0;
          release(driven);
          driven = null;
        } else {
          driven.style.setProperty("--mag-x", `${pos.x.toFixed(2)}px`);
          driven.style.setProperty("--mag-y", `${pos.y.toFixed(2)}px`);
        }
      }

      raf = driven || target ? requestAnimationFrame(animate) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(animate);
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic]");
      if (el && el !== target) {
        // Wechselt der Zeiger direkt von einer Fläche auf die nächste, muss
        // die alte augenblicklich zurück – sonst bliebe sie ausgelenkt liegen,
        // weil sie ab jetzt nicht mehr geschrieben wird.
        if (driven && driven !== el) release(driven);
        target = el;
        driven = el;
        rect = el.getBoundingClientRect();
        pos.x = 0;
        pos.y = 0;
        el.style.willChange = "translate";
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!target) return;
      if (!rect) rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pos.tx = Math.max(-MAX, Math.min(MAX, (e.clientX - cx) * STRENGTH));
      pos.ty = Math.max(-MAX, Math.min(MAX, (e.clientY - cy) * STRENGTH));
      kick();
    };
    const onOut = (e: PointerEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (target && (!to || !target.contains(to))) {
        target = null;
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
      if (driven) release(driven);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
