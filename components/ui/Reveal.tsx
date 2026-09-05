"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Verzögerung in ms – für gestaffelte Gruppen */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  /** Ankername für Sprungmarken (siehe SectionNav). */
  id?: string;
  /** Im Druck ausblenden (z. B. Seiten-Intro über einem Bericht). */
  printHide?: boolean;
}

/**
 * Dieselbe Staffelung, zwei Uhren.
 *
 * Für den Beobachter-Weg ist „später" eine **Dauer**: --reveal-delay wird zur
 * transition-delay. Für den scrollgebundenen Weg ist „später" eine
 * **Strecke** – dort verschiebt --reveal-shift den Sichtbereich, in dem die
 * Bewegung abläuft. Eine Verzögerung in Millisekunden hätte auf einer
 * Scroll-Zeitachse keine Bedeutung; sie würde schlicht ignoriert, und die
 * Staffelung wäre lautlos verschwunden.
 *
 * Der Umrechnungsfaktor ist gegriffen und gedeckelt: 90 ms Versatz (der
 * übliche Schritt in diesem Projekt) ergeben 6 % Sichtbereich, und bei 18 %
 * ist Schluss. Ohne Deckel liefe das letzte Element einer langen Gruppe erst
 * an, wenn es das Bild schon fast wieder verlässt.
 */
function revealVars(delay: number) {
  return {
    "--reveal-delay": `${delay}ms`,
    "--reveal-shift": `${Math.min(delay / 15, 18)}%`,
  };
}

/**
 * Scroll-Reveal. Wo `animation-timeline: view()` zur Verfügung steht, hängt
 * die Bewegung an der Position im Bild und läuft ohne JavaScript auf dem
 * Compositor; sonst beobachtet dieser Baustein die Sichtbarkeit und setzt
 * data-revealed. Die Bewegung selbst lebt in beiden Fällen vollständig in
 * CSS (.reveal), inklusive prefers-reduced-motion-Fallback.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  id,
  printHide = false,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.setAttribute("data-revealed", "true");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      id={id}
      data-print={printHide ? "hide" : undefined}
      className={`reveal ${className}`}
      style={delay ? (revealVars(delay) as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
