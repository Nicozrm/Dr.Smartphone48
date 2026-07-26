"use client";

import { useEffect, useState } from "react";
import { currentTheme, toggleTheme, type Theme } from "@/lib/theme";

/**
 * Tag-/Nachtumschalter. Sonne und Mond teilen sich denselben Platz und
 * werden über Rotation und Maskierung ineinander übergeblendet – eine
 * Bewegung mit Anfang, Zweck und Ende.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(currentTheme());
    setMounted(true);
    const onChange = (e: Event) =>
      setThemeState((e as CustomEvent<Theme>).detail ?? currentTheme());
    window.addEventListener("op-themechange", onChange);
    return () => window.removeEventListener("op-themechange", onChange);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={isDark ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln"}
      aria-pressed={isDark}
      title="Design wechseln"
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-strong transition-colors duration-[var(--duration-fast)] hover:bg-sunken ${className}`}
    >
      <span className="relative block h-5 w-5" aria-hidden="true">
        {/* Sonne */}
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: mounted && !isDark ? 1 : 0,
            transform: mounted && !isDark ? "rotate(0deg) scale(1)" : "rotate(-60deg) scale(0.5)",
            transition:
              "opacity var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)",
          }}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.8v2.4m0 13.6v2.4M2.8 12h2.4m13.6 0h2.4M5.3 5.3l1.7 1.7m10 10 1.7 1.7M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7" />
        </svg>
        {/* Mond */}
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: mounted && isDark ? 1 : 0,
            transform: mounted && isDark ? "rotate(0deg) scale(1)" : "rotate(60deg) scale(0.5)",
            transition:
              "opacity var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)",
          }}
        >
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      </span>
    </button>
  );
}
