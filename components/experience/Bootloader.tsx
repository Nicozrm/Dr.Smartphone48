"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

/**
 * Bootloader – die Seite startet wie ein Betriebssystem statt mit einem
 * Spinner.
 *
 * Regeln, damit daraus keine Ladehürde wird:
 * - **Nur auf der Startseite.** Wer aus der Google-Suche direkt auf
 *   /reparatur oder /kontakt kommt, will einen Preis oder eine Telefonnummer –
 *   nicht die Inszenierung einer Marke, die er noch gar nicht kennt. Eine
 *   Eröffnungssequenz gehört an den Eingang, nicht in jeden Raum.
 * - **Jederzeit abbrechbar.** Klick, Taste, Scroll oder Wischen beendet die
 *   Sequenz sofort. Eine Animation, die man nicht überspringen kann, ist keine
 *   Inszenierung mehr, sondern eine Wartezeit.
 * - Läuft nur beim ersten Aufruf pro Sitzung (sessionStorage).
 * - Liegt als Overlay über der bereits gerenderten Seite: kein Layout-Shift,
 *   kein blockierendes Rendering, kein Einfluss auf LCP-Inhalte darunter.
 * - prefers-reduced-motion: kurzer Crossfade statt Szene.
 * - Ohne JS erscheint er gar nicht – die Seite ist sofort da.
 */

const MODULES = ["Display-Engine", "Diagnose-Modul", "Preisdatenbank"];

/**
 * Haltedauer der Szene. Bewusst knapp: Die Sequenz soll den ersten Eindruck
 * setzen, nicht den ersten Klick verzögern. Zuvor waren es 1900 ms zuzüglich
 * Ausblendung – zusammen über zwei Sekunden, in denen die Seite nicht bedienbar
 * war.
 */
const HOLD = 1100;
const FADE = 480;
const KEY = "ds48-booted";

export function Bootloader() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  const finish = useCallback(() => {
    setDone(true);
    document.documentElement.style.overflow = "";
  }, []);

  useEffect(() => {
    // Ausschließlich am Eingang der Seite.
    if (pathname !== "/") return;

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
    const total = reduced ? 500 : HOLD + FADE;
    const timer = window.setTimeout(finish, total);

    // Jede Absicht des Besuchers beendet die Sequenz sofort.
    const skip = () => {
      window.clearTimeout(timer);
      finish();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const type of events) {
      window.addEventListener(type, skip, { passive: true, once: true });
    }

    return () => {
      window.clearTimeout(timer);
      for (const type of events) window.removeEventListener(type, skip);
      document.documentElement.style.overflow = "";
    };
  }, [pathname, finish]);

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
            style={{ ["--len" as string]: 26, animationDelay: "280ms" }}
          />
        </svg>

        <p
          className="boot-line mt-5 text-[0.9375rem] font-semibold tracking-[-0.02em] text-white"
          style={{ animationDelay: "420ms" }}
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
              style={{ animationDelay: `${520 + i * 150}ms` }}
            >
              <span>{m}</span>
              <span className="text-white/70">bereit</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 font-mono text-[0.6875rem] text-white/35">
          Tippen zum Überspringen
        </p>
      </div>
    </div>
  );
}
