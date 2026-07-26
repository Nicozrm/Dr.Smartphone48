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

    let current: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const STRENGTH = 0.28;
    const MAX = 8;

    const animate = () => {
      pos.x += (pos.tx - pos.x) * 0.15;
      pos.y += (pos.ty - pos.y) * 0.15;
      if (current) {
        current.style.transform = `translate(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px)`;
      }
      if (Math.abs(pos.tx - pos.x) > 0.1 || Math.abs(pos.ty - pos.y) > 0.1 || current) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = 0;
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(animate);
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic]");
      if (el && el !== current) {
        current = el;
        rect = el.getBoundingClientRect();
        el.style.willChange = "transform";
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!current) return;
      if (!rect) rect = current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      pos.tx = Math.max(-MAX, Math.min(MAX, (e.clientX - cx) * STRENGTH));
      pos.ty = Math.max(-MAX, Math.min(MAX, (e.clientY - cy) * STRENGTH));
      kick();
    };
    const onOut = (e: PointerEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (current && (!to || !current.contains(to))) {
        current.style.willChange = "";
        current = null;
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
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
