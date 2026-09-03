"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { openingColor, useOpeningState } from "@/lib/opening";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * Kopfzeilen-Navigation. Sie erscheint erst ab lg; darunter übernimmt das
 * Menü, sonst brechen Wortmarke und Punkte um. `wide` blendet den Punkt
 * zusätzlich erst ab xl ein – so bleibt die Zeile auf kleinen Notebooks
 * luftig, ohne dass Kontakt oder Notfall dafür weichen müssen. Alles
 * Weitere steht im Menü, im Fuß und in der Befehls-Palette.
 */
const navigation: { href: string; label: string; icon: IconName; wide?: boolean }[] = [
  { href: "/reparatur", label: "Reparatur", icon: "tool" },
  { href: "/notfall", label: "Notfall", icon: "shield" },
  { href: "/check", label: "Geräte-Check", icon: "cpu" },
  { href: "/ankauf", label: "Ankauf", icon: "leaf" },
  { href: "/refurbished", label: "Refurbished", icon: "sparkle", wide: true },
  { href: "/kontakt", label: "Kontakt", icon: "mail" },
];

/** Nur im mobilen Menü – die Kopfzeile bleibt sonst zu voll. */
const secondaryNavigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/refurbished", label: "Refurbished", icon: "sparkle" },
  { href: "/zwilling", label: "Digitaler Zwilling", icon: "battery" },
  { href: "/versorgung", label: "Update-Horizont", icon: "clock" },
  { href: "/ersatzteile", label: "Ersatzteile", icon: "cpu" },
  { href: "/werkstatt", label: "Werkstatt", icon: "truck" },
];

function openPalette() {
  window.dispatchEvent(new Event("op-openpalette"));
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const status = useOpeningState();

  const navRef = useRef<HTMLElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);

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
    // Die Aktionsleiste am unteren Rand tritt zurück, solange das Menü steht:
    // Zwei Glasebenen übereinander brechen in Chromium das Compositing des
    // Hintergrunds – derselbe Grund, aus dem die Kopfzeile hier deckend wird.
    document.documentElement.dataset.navOpen = open ? "true" : "false";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.dataset.navOpen = "false";
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

  /*
    Die gleitende Markierung.

    Sie wird direkt am Element gesetzt – Position und Breite sind zwei Zahlen,
    und dafür einen React-Durchlauf je überfahrenem Punkt auszulösen wäre die
    teuerste denkbare Art, ein `translate` zu schreiben.

    `null` bedeutet „zurück zum aktiven Punkt"; gibt es keinen (Startseite,
    Impressum), verschwindet die Markierung ganz, statt am linken Rand zu
    parken.
  */
  const movePill = useCallback((target: HTMLElement | null) => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;

    const el =
      target ?? nav.querySelector<HTMLElement>('[data-nav-item][data-active="true"]');

    if (!el) {
      pill.dataset.ready = "false";
      return;
    }

    pill.style.width = `${el.offsetWidth}px`;
    pill.style.translate = `${el.offsetLeft}px 0`;
    pill.dataset.ready = "true";
  }, []);

  // useLayoutEffect: Die Markierung muss vor dem ersten Bild sitzen, sonst
  // sieht man sie beim Seitenwechsel einmal von links heranfahren.
  useLayoutEffect(() => {
    movePill(null);
  }, [pathname, movePill]);

  useEffect(() => {
    const onResize = () => movePill(null);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movePill]);

  const quickActions = [
    { href: site.phoneHref, label: "Anrufen", icon: "phone" as IconName, aria: `Anrufen: ${site.phone}` },
    { href: site.whatsappHref, label: "WhatsApp", brand: true, aria: "WhatsApp-Chat öffnen" },
    {
      href: site.google.mapsUrl,
      label: "Route",
      icon: "pin" as IconName,
      aria: `Route nach ${site.street}, ${site.city}`,
    },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] ${
        open
          ? // Solide statt Blur: verschachtelte backdrop-filter (Header + Overlay)
            // brechen das Compositing des Overlay-Hintergrunds in Chromium.
            "bg-page"
          : scrolled
            ? "glass border-x-0 border-t-0 border-b-0"
            : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 md:px-8">
        <Link href="/" aria-label={`${site.name} – Startseite`} className="shrink-0">
          <Logo />
        </Link>

        <nav
          ref={navRef}
          className="relative hidden lg:flex items-center gap-1 isolate"
          aria-label="Hauptnavigation"
          onPointerLeave={() => movePill(null)}
        >
          <span ref={pillRef} className="nav-pill" aria-hidden="true" />
          {navigation.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-weight-host=""
                data-nav-item=""
                data-active={active ? "true" : undefined}
                onPointerEnter={(e) => movePill(e.currentTarget)}
                onFocus={(e) => movePill(e.currentTarget)}
                onBlur={() => movePill(null)}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-[0.9375rem] transition-colors duration-[var(--duration-fast)] xl:px-3.5 ${
                  item.wide ? "hidden xl:block" : ""
                } ${active ? "text-ink-strong" : "text-ink-soft hover:text-ink-strong"}`}
              >
                {/*
                  Die Schriftstärke läuft beim Überfahren von 400 auf 600.
                  data-label wiederholt die Beschriftung, weil .weight-hover
                  daraus ein unsichtbares fettes Doppel baut und damit die
                  Breite reserviert – sonst schöbe jeder Punkt beim Überfahren
                  seine Nachbarn zur Seite. Siehe globals.css.
                */}
                <span
                  className="weight-hover"
                  data-label={item.label}
                  data-active={active ? "true" : undefined}
                >
                  {item.label}
                </span>
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
          {/*
            `max-sm:hidden` statt `hidden sm:inline-flex`: Die Komponente
            bringt selbst `inline-flex` mit, und zwei unbedingte
            display-Utilities entscheidet nicht die Reihenfolge im
            class-Attribut, sondern die Reihenfolge im erzeugten
            Stylesheet – dort gewinnt `inline-flex`. Ergebnis war ein
            zweiter Umschalter neben dem mobilen. Eine Variante mit
            Media-Query wird nach den unbedingten Utilities ausgegeben und
            setzt sich damit verlässlich durch.
          */}
          <ThemeToggle className="max-sm:hidden" />
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

      {/* Die Kante erscheint erst beim Scrollen und läuft an beiden Enden aus. */}
      <span className="header-rim" data-on={scrolled && !open ? "true" : "false"} aria-hidden="true" />

      {open ? (
        <div className="glass-sheet lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto">
          <nav
            className="mx-auto max-w-6xl px-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] pt-5"
            aria-label="Mobile Navigation"
          >
            {/* Die drei Wege, für die man ein Menü nicht erst wieder verlassen
                sollte. Sie stehen oben, nicht unten: Wer das Menü öffnet, um
                anzurufen, soll nicht erst an sieben Seiten vorbeiscrollen. */}
            <div className="flex gap-2">
              {quickActions.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  aria-label={action.aria}
                  className="sheet-quick press"
                  {...(action.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {action.brand ? (
                    <BrandIcon name="whatsapp" size={22} />
                  ) : (
                    <Icon name={action.icon!} size={22} />
                  )}
                  {action.label}
                </a>
              ))}
            </div>

            <p className="mt-3 flex items-center gap-2 px-1 text-[0.8125rem] text-ink-soft">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: status ? openingColor(status.tone) : "var(--ink-faint)" }}
                aria-hidden="true"
              />
              {status ? status.compact : site.openingHoursShort}
            </p>

            <ul className="mt-4 flex flex-col divide-y divide-line">
              {[
                ...navigation.filter((item) => item.href !== "/refurbished"),
                ...secondaryNavigation,
              ].map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "true" : undefined}
                      className="sheet-item"
                    >
                      <Icon
                        name={item.icon}
                        size={19}
                        className={active ? "text-accent" : "text-ink-faint"}
                      />
                      <span className="flex-1">{item.label}</span>
                      <Icon name="arrow-right" size={17} className="text-ink-faint" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/reparatur"
              className="breathe press mt-7 inline-flex h-13 w-full items-center justify-center rounded-full bg-accent text-base font-medium text-accent-contrast shadow-button"
            >
              Sofortpreis berechnen
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
