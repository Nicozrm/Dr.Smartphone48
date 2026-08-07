"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

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
 * 1. Neigung. Maximal 2,4 Grad zum Zeiger (oder zur Gerätelage, siehe unten).
 *    Darüber wird aus einem ruhenden Objekt ein Spielzeug, das man dreht.
 * 2. Reflexion. Der Glanzpunkt wandert **gegenläufig** zur Auslenkung über das
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
 * die eigentlichen Transformationen stehen in CSS.
 *
 * Auf grobem Zeiger (Touch) gibt es keine Maus, die eine Reflexion auslösen
 * könnte – aber ein Telefon in der Hand kennt seine eigene Lage im Raum.
 * Dort übernimmt der Neigungssensor (`deviceorientation`) exakt dieselbe
 * Rechnung wie der Mauszeiger auf dem Desktop: Wer das eigene Gerät kippt,
 * sieht die Spiegelung auf dem gezeichneten Gerät im selben Moment wandern –
 * dieselbe Optik, mit der eigenen Hand ausgelöst statt mit der Maus. Auf
 * iOS verlangt der Zugriff einen expliziten Fingertipp (`requestPermission`
 * läuft nur innerhalb einer echten Nutzerhandlung); dafür der kleine, rein
 * optionale Knopf unten. Android liefert Neigungsdaten ohne Dialog – dort
 * beginnt es sofort. In beiden Fällen verlässt der Messwert das Gerät nie,
 * er bewegt ausschließlich diese eine Animation.
 *
 * Bei prefers-reduced-motion bleibt das Gerät vollständig still – dann ist
 * es schlicht ein sauber ausgeleuchtetes Objekt.
 */
export function HeroDevice({ className = "" }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const requestTiltRef = useRef<() => void>(() => {});
  const [tiltPrompt, setTiltPrompt] = useState(false);

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

    // Gemeinsame Umrechnung einer normalisierten Auslenkung (-0.5…0.5 auf
    // beiden Achsen) in Neigung und gegenläufigen Glanzpunkt – von Zeiger
    // und Neigungssensor gleichermaßen genutzt, damit sich beide Quellen
    // identisch anfühlen (siehe Bewegung 1 und 2 oben).
    const apply = (px: number, py: number) => {
      to.ry = Math.max(-MAX_TILT, Math.min(MAX_TILT, px * MAX_TILT * 2));
      to.rx = Math.max(-MAX_TILT, Math.min(MAX_TILT, -py * MAX_TILT * 2));
      to.gx = 50 - px * 46;
      to.gy = 30 - py * 26;
      kick();
    };

    const onPointer = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      // Der Bezug ist das Fenster, nicht die Bühne: Das Gerät soll den Zeiger
      // auch dann bemerken, wenn er über der Überschrift daneben steht.
      const px = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const py = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      apply(px, py);
    };

    // Neigungssensor als Ersatz für den fehlenden Mauszeiger. Die ersten
    // Werte sind die Kalibrierung ("so hält die Person das Telefon gerade"),
    // nicht der Nullpunkt des Sensors – sonst müsste man das Telefon erst in
    // eine ganz bestimmte Lage drehen, bevor überhaupt etwas passiert.
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    // Grad Auslenkung aus der Kalibrierlage, ab denen die Wirkung voll
    // ausgereizt ist – ein entspanntes Kippen in der Hand, kein Verdrehen.
    const ORIENT_RANGE = 20;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.beta !== "number" || typeof e.gamma !== "number") return;
      if (baseBeta === null || baseGamma === null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
        return;
      }
      const px = Math.max(-0.5, Math.min(0.5, (e.gamma - baseGamma) / ORIENT_RANGE));
      const py = Math.max(-0.5, Math.min(0.5, (e.beta - baseBeta) / ORIENT_RANGE));
      apply(px, py);
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

    // iOS 13+ verlangt für Sensordaten einen eigenen Erlaubnis-Dialog, der
    // sich nur aus einer Nutzerhandlung heraus öffnen lässt – daher die
    // Typprüfung statt eines einfachen Feature-Checks auf das Ereignis
    // selbst, das auf iOS immer existiert, aber ohne Erlaubnis nie feuert.
    type OrientationCtor = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const orientationCtor =
      typeof DeviceOrientationEvent !== "undefined"
        ? (DeviceOrientationEvent as OrientationCtor)
        : undefined;

    let orientationAttached = false;
    const attachOrientation = () => {
      if (orientationAttached) return;
      orientationAttached = true;
      window.addEventListener("deviceorientation", onOrientation);
    };

    if (fine) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    } else if (window.matchMedia("(pointer: coarse)").matches && orientationCtor) {
      if (typeof orientationCtor.requestPermission === "function") {
        requestTiltRef.current = () => {
          orientationCtor
            .requestPermission!()
            .then((state) => {
              if (state === "granted") attachOrientation();
            })
            .catch(() => {})
            .finally(() => setTiltPrompt(false));
        };
        setTiltPrompt(true);
      } else {
        // Android u. Ä.: Neigungsdaten stehen ohne Dialog zur Verfügung.
        attachOrientation();
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    write();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className={`hero-stage-wrap ${className}`}>
      <div ref={stageRef} className="hero-stage" aria-hidden="true">
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

      {/*
        Bewusst außerhalb des aria-hidden-Bereichs: Eine bedienbare
        Schaltfläche darin wäre eine Tabulator-Falle ohne Ankündigung –
        genau das, was diese Website an gesperrten Bereichen mit `inert`
        statt `aria-hidden` vermeidet (siehe CLAUDE.md).
      */}
      {tiltPrompt && (
        <button
          type="button"
          onClick={() => requestTiltRef.current()}
          className="hero-tilt-prompt inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-page/90 px-3 text-[0.75rem] text-ink-soft shadow-[var(--shadow-floating)] backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:border-ink-faint hover:text-ink-strong"
        >
          <Icon name="touch" size={13} />
          Zum Ausprobieren neigen
        </button>
      )}
    </div>
  );
}
