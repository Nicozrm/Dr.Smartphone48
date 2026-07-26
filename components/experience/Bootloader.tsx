"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

/**
 * Bootloader – die Seite startet wie ein Betriebssystem statt mit einem
 * Spinner. OLED-Schwarz, die Marke zeichnet sich, danach melden sich die
 * Module der Reihe nach.
 *
 * Regeln, damit daraus keine Ladehürde wird:
 * - Läuft nur beim ersten Aufruf pro Sitzung (sessionStorage).
 * - Liegt als Overlay über der bereits gerenderten Seite: kein Layout-Shift,
 *   kein blockierendes Rendering, kein Einfluss auf LCP-Inhalte darunter.
 * - prefers-reduced-motion: kurzer Crossfade statt Szene.
 * - Ohne JS erscheint er gar nicht – die Seite ist sofort da.
 */

const MODULES = [
  "Display-Engine",
  "Sensor-Framework",
  "Repair-Engine",
  "Diagnose-Modul",
  "Preisdatenbank",
];

const HOLD = 1900;
const KEY = "ds48-booted";

export function Bootloader() {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let booted = true;
    try {
      booted = sessionStorage.getItem(KEY) === "1";
    } catch {
      // Privater Modus: dann eben jedes Mal – unkritisch.
      booted = false;
    }
    if (booted) return;

    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* egal */
    }

    setShow(true);
    document.documentElement.style.overflow = "hidden";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? 500 : HOLD + 480;
    const t = window.setTimeout(() => {
      setDone(true);
      document.documentElement.style.overflow = "";
    }, total);

    return () => {
      window.clearTimeout(t);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (!show || done) return null;

  return (
    <div
      className="boot"
      data-done={done ? "true" : "false"}
      style={{ ["--boot-hold" as string]: `${HOLD}ms` }}
      role="status"
      aria-live="polite"
      aria-label={`${site.name} startet`}
    >
      <div className="w-full max-w-[280px] px-6 text-center">
        {/* Marke zeichnet sich */}
        <svg viewBox="0 0 32 32" width={54} height={54} fill="none" className="mx-auto text-white">
          <rect
            x="7.25"
            y="2.25"
            width="17.5"
            height="27.5"
            rx="4.25"
            stroke="currentColor"
            strokeWidth="1.9"
            className="boot-stroke"
            style={{ ["--len" as string]: 92 }}
          />
          <path
            d="M16 9.5v13M9.5 16h13"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="square"
            className="boot-stroke"
            style={{ ["--len" as string]: 26, animationDelay: "420ms" }}
          />
        </svg>

        <p
          className="boot-line mt-5 text-[0.9375rem] font-semibold tracking-[-0.02em] text-white"
          style={{ animationDelay: "700ms" }}
        >
          {site.name}
        </p>

        {/* Fortschritt */}
        <div className="boot-bar mx-auto mt-6 h-px w-full overflow-hidden bg-white/20">
          <i />
        </div>

        {/* Module melden sich */}
        <ul className="mt-5 space-y-1 text-left font-mono text-[0.6875rem] text-white/45">
          {MODULES.map((m, i) => (
            <li
              key={m}
              className="boot-line flex items-center justify-between gap-3"
              style={{ animationDelay: `${820 + i * 190}ms` }}
            >
              <span>{m}</span>
              <span className="text-white/70">bereit</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
