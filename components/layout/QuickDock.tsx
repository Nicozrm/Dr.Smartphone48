"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Icon, type IconName } from "@/components/ui/Icon";
import { openingColor, useOpeningState } from "@/lib/opening";
import { site } from "@/lib/site";

/*
  Die Aktionsleiste.

  Auf einem Telefon sind die drei häufigsten Absichten eines Besuchers
  „anrufen", „hinfahren" und „was kostet das". Auf dem Schreibtisch stehen
  diese Wege in der Kopfzeile. Auf dem Telefon lagen sie hinter dem Menü –
  also hinter drei Handgriffen, und zwar an jeder Stelle jeder Seite.

  Die Leiste holt sie an den unteren Bildschirmrand, wo der Daumen ohnehin
  liegt. Sie ist damit der einzige Teil dieser Website, der nicht erklärt,
  sondern nur abkürzt.

  Vier Entscheidungen, die zusammengehören:

  – **Vier Ziele, nicht sechs.** Eine Leiste mit sechs Zeichen ist eine
    zweite Navigation, und dann sucht man wieder. Was hier steht, muss man
    im Vorbeigehen treffen können.
  – **Sie weicht beim Lesen zurück.** Vorwärtsscrollen fährt sie aus dem
    Bild, Zurückscrollen holt sie sofort wieder. Der Zustand wird direkt am
    Element gesetzt, nicht über `useState`: Sonst rechnete React bei jedem
    Scrollereignis einen Baum durch, um ein Attribut zu ändern – dieselbe
    Überlegung wie beim Sturzschreiber auf /check.
  – **Der Öffnungsstatus steht darüber**, weil er die Frage beantwortet, die
    vor dem Anruf kommt. Gerechnet wird er in `lib/opening.ts`, gemeinsam
    mit der Verfügbarkeitskarte auf /kontakt.
  – **Im internen Bereich gibt es sie nicht.** Wer am Rechnungswerkzeug
    sitzt, ruft nicht die eigene Werkstatt an; dort ist die Leiste nur
    verdeckte Bildschirmfläche.

  Die WhatsApp-Schaltfläche führt auf den nackten Chat ohne vorbereiteten
  Text. Sie fällt damit ausdrücklich **nicht** unter die Absenderegel: Die
  Seite überträgt nichts, der Besucher schreibt selbst (siehe CLAUDE.md,
  „Die Absenderegel").
*/

type DockAction = {
  key: string;
  label: string;
  /** Vollständige Beschriftung für Vorlesehilfen – „WhatsApp" allein sagt nicht, wohin. */
  aria: string;
  icon?: IconName;
  brand?: "whatsapp";
  href: string;
  external?: boolean;
  /** Interner Link (Next.js) statt Sprung nach draußen. */
  internal?: boolean;
};

const actions: DockAction[] = [
  {
    key: "call",
    label: "Anrufen",
    aria: `Anrufen: ${site.phone}`,
    icon: "phone",
    href: site.phoneHref,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    aria: "WhatsApp-Chat öffnen",
    brand: "whatsapp",
    href: site.whatsappHref,
    external: true,
  },
  {
    key: "route",
    label: "Route",
    aria: `Route nach ${site.street}, ${site.city}`,
    icon: "pin",
    href: site.google.mapsUrl,
    external: true,
  },
  {
    key: "price",
    label: "Sofortpreis",
    aria: "Sofortpreis berechnen",
    icon: "tool",
    href: "/reparatur",
    internal: true,
  },
];

export function QuickDock() {
  const pathname = usePathname();
  const state = useOpeningState();
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    let last = window.scrollY;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;

      // Unter 6 px passiert nichts. Ohne diese Schwelle flackert die Leiste
      // beim Gummiband-Effekt am Seitenende und bei jedem Zittern der Hand.
      if (Math.abs(delta) < 6) return;

      const atTop = y < 160;
      const atBottom = y + window.innerHeight > document.documentElement.scrollHeight - 160;
      const hide = delta > 0 && !atTop && !atBottom;

      dock.dataset.hidden = hide ? "true" : "false";
      last = y;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Beim Seitenwechsel wieder hervorholen: Wer eine neue Seite öffnet, fängt
  // oben an – eine weggefahrene Leiste wäre dort nur verschwunden.
  useEffect(() => {
    if (dockRef.current) dockRef.current.dataset.hidden = "false";
  }, [pathname]);

  if (pathname.startsWith("/intern")) return null;

  return (
    <>
      {/* Hält den Platz frei, damit die Leiste nie den letzten Knopf einer
          Seite verdeckt. */}
      <div className="dock-space" aria-hidden="true" />

      <div ref={dockRef} className="dock" data-hidden="false">
        <nav
          className="glass-dock flex flex-col gap-0.5 px-1.5 pb-1.5 pt-1"
          aria-label="Schnellzugriff"
        >
          <p className="flex items-center justify-center gap-1.5 px-2 text-[0.6875rem] leading-tight text-ink-soft">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: state ? openingColor(state.tone) : "var(--ink-faint)" }}
              aria-hidden="true"
            />
            <span className="truncate">{state ? state.compact : site.openingHoursShort}</span>
          </p>

          <ul className="flex items-stretch gap-0.5">
            {actions.map((action) => {
              const active = action.internal ? pathname.startsWith(action.href) : false;
              const content = (
                <>
                  {action.brand ? (
                    <BrandIcon name={action.brand} size={20} aria-hidden="true" />
                  ) : (
                    <Icon name={action.icon!} size={20} aria-hidden="true" />
                  )}
                  <span className="dock-label">{action.label}</span>
                </>
              );

              return (
                <li key={action.key} className="flex flex-1">
                  {action.internal ? (
                    <Link
                      href={action.href}
                      aria-label={action.aria}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "true" : undefined}
                      className="dock-item press"
                    >
                      {content}
                    </Link>
                  ) : (
                    <a
                      href={action.href}
                      aria-label={action.aria}
                      className="dock-item press"
                      {...(action.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {content}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
