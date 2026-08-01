"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * Kopfzeilen-Navigation. Sie erscheint erst ab lg; darunter übernimmt das
 * Menü, sonst brechen Wortmarke und Punkte um. `wide` blendet den Punkt
 * zusätzlich erst ab xl ein – so bleibt die Zeile auf kleinen Notebooks
 * luftig, ohne dass Kontakt oder Notfall dafür weichen müssen. Alles
 * Weitere steht im Menü, im Fuß und in der Befehls-Palette.
 */
const navigation: { href: string; label: string; wide?: boolean }[] = [
  { href: "/reparatur", label: "Reparatur" },
  { href: "/notfall", label: "Notfall" },
  { href: "/check", label: "Geräte-Check" },
  { href: "/ankauf", label: "Ankauf" },
  { href: "/refurbished", label: "Refurbished", wide: true },
  { href: "/kontakt", label: "Kontakt" },
];

/** Nur im mobilen Menü – die Kopfzeile bleibt sonst zu voll. */
const secondaryNavigation = [
  { href: "/refurbished", label: "Refurbished" },
  { href: "/zwilling", label: "Digitaler Zwilling" },
  { href: "/ersatzteile", label: "Ersatzteile" },
  { href: "/werkstatt", label: "Werkstatt" },
];

function openPalette() {
  window.dispatchEvent(new Event("op-openpalette"));
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Escape schließt das mobile Menü. Ein Overlay, das die ganze Seite verdeckt
  // und sich nur über die eigene Schaltfläche schließen lässt, ist für
  // Tastatur- und Screenreader-Nutzung eine Sackgasse.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] ${
        open
          ? // Solide statt Blur: verschachtelte backdrop-filter (Header + Overlay)
            // brechen das Compositing des Overlay-Hintergrunds in Chromium.
            "bg-page border-b border-line"
          : scrolled
            ? "glass border-x-0 border-t-0"
            : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 md:px-8">
        <Link href="/" aria-label={`${site.name} – Startseite`} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Hauptnavigation">
          {navigation.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-[0.9375rem] transition-colors duration-[var(--duration-fast)] xl:px-3.5 ${
                  item.wide ? "hidden xl:block" : ""
                } ${
                  active
                    ? "text-ink-strong font-medium"
                    : "text-ink-soft hover:text-ink-strong"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Suche und Befehle öffnen"
            title="Suche und Befehle (⌘K)"
            className="hidden lg:inline-flex h-10 items-center gap-2 rounded-full border border-line px-3 text-[0.875rem] text-ink-soft transition-colors duration-[var(--duration-fast)] hover:border-line-strong hover:text-ink-strong"
          >
            <Icon name="search" size={16} />
            <kbd className="font-mono text-[0.75rem] text-ink-faint">⌘K</kbd>
          </button>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            href="/reparatur"
            className="hidden sm:inline-flex h-10 items-center rounded-full bg-ink-strong px-4.5 text-[0.9375rem] font-medium text-[var(--surface-page)] transition-colors duration-[var(--duration-fast)] hover:opacity-90"
          >
            Sofortpreis
          </Link>

          <ThemeToggle className="sm:hidden" />
          <button
            type="button"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-strong hover:bg-sunken"
            aria-expanded={open}
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} size={22} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-page/95 backdrop-blur-xl">
          <nav className="mx-auto max-w-6xl px-5 pt-6" aria-label="Mobile Navigation">
            <ul className="flex flex-col divide-y divide-line">
              {[
                ...navigation.filter((item) => item.href !== "/refurbished"),
                ...secondaryNavigation,
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between py-4 text-lg font-medium text-ink-strong"
                  >
                    {item.label}
                    <Icon name="arrow-right" size={18} className="text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/reparatur"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink-strong text-base font-medium text-[var(--surface-page)]"
            >
              Sofortpreis berechnen
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
