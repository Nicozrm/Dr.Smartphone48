"use client";

import { useEffect, useRef } from "react";

/**
 * HeroDevice – das Gerät im Hero.
 *
 * Kein Produktfoto, sondern ein Objekt aus Licht: Gehäusekante, Glasfläche,
 * Reflexion, Bodenschatten. Der Grund ist nicht Ästhetik, sondern Ehrlichkeit –
 * ein Foto zeigt ein bestimmtes Modell in einer bestimmten Farbe und behauptet
 * damit etwas, was hier niemand behaupten will. Eine gezeichnete Silhouette
 * zeigt „ein Smartphone".
 *
 * Vier Bewegungen, alle unterhalb der Wahrnehmungsschwelle:
 *
 * 1. Neigung. Maximal 2,4 Grad zum Zeiger. Darüber wird aus einem ruhenden
 *    Objekt ein Spielzeug, das man dreht.
 * 2. Reflexion. Der Glanzpunkt wandert **gegenläufig** zum Zeiger über das
 *    Glas. Gegenläufig, weil eine Spiegelung die Lichtquelle zeigt, nicht den
 *    Betrachter – bewegt man den Kopf nach rechts, wandert das Spiegelbild
 *    nach links. Diese eine Zeile entscheidet darüber, ob die Fläche wie Glas
 *    aussieht oder wie eine Grafik mit einem hellen Fleck darauf.
 * 3. Lichtband. Ein sehr breiter, sehr blasser Streifen zieht in 18 Sekunden
 *    einmal über die Fläche. Reine CSS-Animation, läuft im Compositor.
 * 4. Kamerafahrt. Beim Scrollen wandert das Gerät rund ein Prozent der
 *    Bildhöhe langsamer als die Seite. Man sieht keine Bewegung, man sieht
 *    Tiefe.
 *
 * Bewegung 1, 2 und 4 laufen über CSS-Variablen, die JS je Bild schreibt;
 * die eigentlichen Transformationen stehen in CSS. Bei
 * prefers-reduced-motion und auf grobem Zeiger bleibt das Gerät still –
 * dann ist es schlicht ein sauber ausgeleuchtetes Objekt.
 */
export function HeroDevice({ className = "" }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    // Ziel- und Istwerte getrennt: Der Zeiger springt, das Gerät nicht.
    const cur = { rx: 0, ry: 0, gx: 50, gy: 30, sy: 0 };
    const to = { rx: 0, ry: 0, gx: 50, gy: 30, sy: 0 };
    let raf = 0;
    let visible = true;

    const MAX_TILT = 2.4;

    const write = () => {
      stage.style.setProperty("--rx", `${cur.rx.toFixed(3)}deg`);
      stage.style.setProperty("--ry", `${cur.ry.toFixed(3)}deg`);
      stage.style.setProperty("--gx", `${cur.gx.toFixed(2)}%`);
      stage.style.setProperty("--gy", `${cur.gy.toFixed(2)}%`);
      stage.style.setProperty("--sy", `${cur.sy.toFixed(2)}px`);
    };

    const tick = () => {
      // Ein einziger Glättungsfaktor für alle Achsen: Liefen Neigung und
      // Reflexion mit verschiedenen Trägheiten, entkoppelte sich der
      // Glanzpunkt sichtbar vom Gehäuse – und das Glas wirkte plötzlich
      // wie eine aufgeklebte Folie.
      const k = 0.08;
      cur.rx += (to.rx - cur.rx) * k;
      cur.ry += (to.ry - cur.ry) * k;
      cur.gx += (to.gx - cur.gx) * k;
      cur.gy += (to.gy - cur.gy) * k;
      cur.sy += (to.sy - cur.sy) * 0.16;
      write();

      const moving =
        Math.abs(to.rx - cur.rx) > 0.002 ||
        Math.abs(to.ry - cur.ry) > 0.002 ||
        Math.abs(to.gx - cur.gx) > 0.05 ||
        Math.abs(to.gy - cur.gy) > 0.05 ||
        Math.abs(to.sy - cur.sy) > 0.05;
      raf = moving && visible ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    const onPointer = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      // Der Bezug ist das Fenster, nicht die Bühne: Das Gerät soll den Zeiger
      // auch dann bemerken, wenn er über der Überschrift daneben steht.
      const px = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const py = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      to.ry = Math.max(-MAX_TILT, Math.min(MAX_TILT, px * MAX_TILT * 2));
      to.rx = Math.max(-MAX_TILT, Math.min(MAX_TILT, -py * MAX_TILT * 2));
      // Gegenläufig und gedämpft – siehe Punkt 2 oben.
      to.gx = 50 - px * 46;
      to.gy = 30 - py * 26;
      kick();
    };

    const onScroll = () => {
      const r = stage.getBoundingClientRect();
      // Nur solange die Bühne im Bild ist. Danach ist jede Rechnung verschenkt.
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      to.sy = -window.scrollY * 0.06;
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) kick();
      },
      { threshold: 0.01 },
    );
    io.observe(stage);

    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    write();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={`hero-stage ${className}`}
      aria-hidden="true"
    >
      <div className="hero-device">
        {/* Gehäusekante: der schmale, hellere Rand, an dem sich das Licht
            bricht. Ohne ihn ist die Silhouette nur eine dunkle Fläche. */}
        <div className="hero-frame">
          <div className="hero-glass">
            <span className="hero-specular" />
            <span className="hero-sweep" />
            <span className="hero-island" />
          </div>
        </div>
      </div>
      <div className="hero-floor" />
    </div>
  );
}
