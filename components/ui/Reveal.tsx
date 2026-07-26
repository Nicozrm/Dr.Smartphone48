"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Verzögerung in ms – für gestaffelte Gruppen */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  /** Im Druck ausblenden (z. B. Seiten-Intro über einem Bericht). */
  printHide?: boolean;
}

/**
 * Scroll-Reveal: beobachtet die Sichtbarkeit und setzt data-revealed.
 * Die eigentliche Bewegung lebt vollständig in CSS (.reveal),
 * inklusive prefers-reduced-motion-Fallback.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
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
      data-print={printHide ? "hide" : undefined}
      className={`reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
