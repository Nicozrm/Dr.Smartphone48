export type Theme = "light" | "dark";

const STORAGE_KEY = "op-theme";

/** Aktuelles Theme aus dem <html>-Attribut lesen (vom No-Flash-Skript gesetzt). */
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Theme setzen: Attribut umschalten, Wahl persistieren und einen kurzen
 * Übergang anstoßen. Ein CustomEvent "op-themechange" hält andere
 * Komponenten (z. B. die Command-Palette) synchron.
 */
export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduced) {
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 340);
  }

  root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Privater Modus o. Ä. – kein Grund zu scheitern.
  }
  window.dispatchEvent(new CustomEvent("op-themechange", { detail: theme }));
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
