"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useCountUp – zählt eine Zahl auf einen neuen Wert hoch statt sie zu
 * ersetzen.
 *
 * Der Zweck ist nicht Schmuck, sondern Lesbarkeit einer Ursache: Wer im
 * Rechner eine zweite Reparatur anhakt, sieht am Hochlaufen, dass **sein**
 * Klick den Betrag verändert hat – und um wie viel. Ein Wert, der einfach
 * ausgetauscht wird, lässt beides offen; man muss die alte Zahl im Kopf
 * behalten haben, um die Differenz zu kennen.
 *
 * Drei Regeln halten es auf der richtigen Seite der Grenze zum Effekt:
 *
 * – Kurz. 420 ms für jede Distanz. Eine Dauer, die mit dem Betrag wächst,
 *   bestraft genau die Kunden mit den teuren Geräten mit Wartezeit.
 * – Immer ganzzahlig. Ein Preis, der für einen Moment „248,63 €" zeigt,
 *   wirkt wie ein Rechenfehler.
 * – Bei prefers-reduced-motion springt der Wert. Zahlen, die sich von selbst
 *   bewegen, sind für manche Menschen genau das Problem.
 *
 * Der erste Wert wird nie animiert: Beim ersten Rendern gibt es keinen
 * Vorgänger, von dem aus gezählt werden könnte – ein Hochlaufen von 0 wäre
 * eine Bewegung ohne Anlass.
 */
export function useCountUp(value: number, duration = 420): number {
  const [shown, setShown] = useState(value);
  /* Spiegelt `shown` als Ref. Nötig, weil ein abgebrochener Lauf beim
     nächsten Mal dort weiterzählen muss, wo er stehen geblieben ist – wer
     schnell drei Reparaturen anhakt, sähe den Betrag sonst bei jedem Klick
     auf den vorletzten Stand zurückspringen. */
  const shownRef = useRef(value);
  const rafRef = useRef(0);
  const firstRef = useRef(true);

  const set = (n: number) => {
    shownRef.current = n;
    setShown(n);
  };

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      set(value);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set(value);
      return;
    }

    const from = shownRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Dieselbe Kurve wie --ease-out in globals.css: schnell los, ruhig an.
      const eased = 1 - Math.pow(1 - t, 3);
      set(Math.round(from + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return shown;
}
