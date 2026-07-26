"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollProgress – eine dezente vertikale Rail am rechten Rand, die den
 * Lesefortschritt anzeigt. Reine Orientierung, kein Schmuck: erscheint nur,
 * wenn die Seite tatsächlich scrollbar ist, und bleibt auf kleinen Geräten
 * ganz aus. Bewegung läuft GPU-nah über scaleY.
 */
export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setVisible(max > 400);
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 z-40 hidden h-[38vh] max-h-[420px] -translate-y-1/2 lg:block ${
        visible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)]`}
    >
      <div className="relative h-full w-px overflow-hidden rounded-full bg-line-strong">
        <div
          ref={fillRef}
          className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-ink-strong"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
    </div>
  );
}
