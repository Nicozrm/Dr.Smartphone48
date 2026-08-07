"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { toggleTheme } from "@/lib/theme";
import { playClick, toggleSound } from "@/lib/sound";
import { grades, refurbishedDevices } from "@/lib/data/refurbished";
import { formatEuro } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Command-Palette (⌘K / Strg K) – die Tastatur als Abkürzung durch die
 * gesamte Seite. Navigation und Aktionen an einem Ort, in der Sprache der
 * Marke: leise, präzise, sofort. Fokus wird gefangen und sauber
 * zurückgegeben; ohne Treffer bleibt es still.
 */

type Command = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: IconName;
  group: "Navigation" | "Aktionen" | "Geräte auf Lager";
  run: (router: ReturnType<typeof useRouter>) => void;
  keepOpen?: boolean;
  /**
   * Erscheint erst, wenn getippt wird. Der Bestand gehört in die Suche, nicht
   * in die Grundansicht – zehn Geräte würden die elf Seiten der Website
   * erdrücken, die jemand ohne Suchbegriff sehen will.
   */
  onlyWhenSearching?: boolean;
};

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${site.name} ${site.street} ${site.zip} ${site.city}`,
)}`;

const commands: Command[] = [
  // Der Notfall steht zuoberst: Wer ihn sucht, hat keine Zeit zu scrollen.
  { id: "notfall", label: "Notfall-Soforthilfe", hint: "Wasserschaden, Bruch, Akku", icon: "shield", group: "Navigation", keywords: "wasser wasserschaden hilfe sos erste hilfe kaputt reis display gebrochen akku aufgebläht startet nicht", run: (r) => r.push("/notfall") },
  { id: "home", label: "Startseite", icon: "sparkle", group: "Navigation", keywords: "home start", run: (r) => r.push("/") },
  { id: "reparatur", label: "Reparatur – Sofortpreis", icon: "tool", group: "Navigation", keywords: "preis rechner display akku", run: (r) => r.push("/reparatur") },
  { id: "check", label: "Geräte-Check", hint: "Live-Diagnose", icon: "cpu", group: "Navigation", keywords: "diagnose test pixel touch sensor akku", run: (r) => r.push("/check") },
  { id: "ankauf", label: "Ankauf – Restwert", hint: "Was Ihr Gerät noch wert ist", icon: "leaf", group: "Navigation", keywords: "verkaufen ankauf wert restwert geld gebraucht abgeben", run: (r) => r.push("/ankauf") },
  { id: "zwilling", label: "Digitaler Zwilling", hint: "Zustand, Akku-Coach & Lebensdauer", icon: "sparkle", group: "Navigation", keywords: "twin zustand akku prognose lebensdauer laden ladeverhalten coach", run: (r) => r.push("/zwilling") },
  { id: "ticket", label: "Reparatur-Ticket", hint: "Voranschlag & Übergabeprotokoll", icon: "calendar", group: "Navigation", keywords: "ticket auftrag protokoll qr imei drucken vorgang", run: (r) => r.push("/ticket") },
  { id: "status", label: "Reparaturstatus", hint: "Wo steht mein Gerät?", icon: "clock", group: "Navigation", keywords: "status vorgang verfolgen sendung wo ist mein handy fertig abholbereit nummer", run: (r) => r.push("/status") },
  { id: "refurbished", label: "Refurbished-Geräte", icon: "shield", group: "Navigation", keywords: "gebraucht kaufen", run: (r) => r.push("/refurbished") },
  { id: "versorgung", label: "Update-Horizont", hint: "Wie lange es noch Sicherheitsupdates gibt", icon: "shield", group: "Navigation", keywords: "updates sicherheit support android ios versorgung wie lange veraltet unsicher", run: (r) => r.push("/versorgung") },
  { id: "ersatzteile", label: "Ersatzteile", icon: "cpu", group: "Navigation", keywords: "teile", run: (r) => r.push("/ersatzteile") },
  { id: "werkstatt", label: "Werkstatt", icon: "pin", group: "Navigation", keywords: "labor team", run: (r) => r.push("/werkstatt") },
  { id: "kontakt", label: "Kontakt", icon: "mail", group: "Navigation", keywords: "termin anfahrt", run: (r) => r.push("/kontakt") },
  { id: "beleg", label: "Prüfbeleg", hint: "Sechs Prüfskripte, vollständige Ausgabe", icon: "waveform", group: "Navigation", keywords: "beleg prüfung verify nachweis transparenz skript", run: (r) => r.push("/beleg") },

  { id: "act-notfall", label: "Wasserschaden – was jetzt zu tun ist", icon: "waveform", group: "Aktionen", keywords: "wasser nass spüle toilette regen notfall", run: (r) => r.push("/notfall#wasser") },
  { id: "act-preis", label: "Sofortpreis berechnen", icon: "arrow-right", group: "Aktionen", keywords: "reparatur preis", run: (r) => r.push("/reparatur") },
  { id: "act-check", label: "Geräte-Check starten", icon: "waveform", group: "Aktionen", keywords: "diagnose test", run: (r) => r.push("/check") },
  { id: "act-wert", label: "Restwert schätzen", icon: "leaf", group: "Aktionen", keywords: "verkaufen wert ankauf", run: (r) => r.push("/ankauf") },
  { id: "act-theme", label: "Design wechseln", hint: "Hell / Dunkel", icon: "moon", group: "Aktionen", keywords: "dark light dunkel hell theme", keepOpen: true, run: () => toggleTheme() },
  // Direktes Feedback im selben Klick, sonst hört niemand, dass sich etwas
  // geändert hat – der Ton ist schließlich das, worum es hier geht.
  { id: "act-sound", label: "Klickton im Rechner", hint: "Ein / Aus", icon: "waveform", group: "Aktionen", keywords: "ton sound audio klick feedback rechner konfigurator", keepOpen: true, run: () => { if (toggleSound()) playClick("on"); } },
  { id: "act-call", label: "Anrufen", hint: site.phone, icon: "phone", group: "Aktionen", keywords: "telefon", run: () => { window.location.href = site.phoneHref; } },
  { id: "act-route", label: "Route planen", hint: `${site.street}, ${site.city}`, icon: "pin", group: "Aktionen", keywords: "anfahrt maps karte", run: () => window.open(mapsUrl, "_blank", "noopener,noreferrer") },
  { id: "act-mail", label: "E-Mail schreiben", hint: site.email, icon: "mail", group: "Aktionen", keywords: "kontakt", run: () => { window.location.href = `mailto:${site.email}`; } },
  { id: "act-whatsapp", label: "WhatsApp öffnen", hint: site.phone, icon: "phone", group: "Aktionen", keywords: "chat nachricht", run: () => window.open(site.whatsappHref, "_blank", "noopener,noreferrer") },
  { id: "act-reviews", label: "Google-Bewertungen", hint: `${site.google.rating.toLocaleString("de-DE", { minimumFractionDigits: 1 })} aus ${site.google.reviewCount}`, icon: "sparkle", group: "Aktionen", keywords: "rezensionen sterne", run: () => window.open(site.google.placeUrl, "_blank", "noopener,noreferrer") },

  // Der Bestand aus einer Quelle: Wer „Pixel 8“ tippt, landet direkt im
  // Prüfprotokoll des Geräts statt im gefilterten Gitter.
  ...refurbishedDevices.map((device): Command => ({
    id: `dev-${device.id}`,
    label: `${device.name} · ${device.storage}`,
    hint: `${formatEuro(device.price)} · Zustand ${grades.find((g) => g.id === device.grade)!.label} · Akku ${device.battery} %`,
    icon: "shield",
    group: "Geräte auf Lager",
    keywords: `${device.brand} refurbished gebraucht ${device.color} prüfprotokoll`,
    onlyWhenSearching: true,
    run: (r) => r.push(`/refurbished/${device.id}`),
  })),
];

/** Teilsequenz-Match: alle Zeichen der Query in Reihenfolge? Score = Kompaktheit. */
function score(query: string, text: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let ti = 0;
  let first = -1;
  let last = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        ti++;
        break;
      }
      ti++;
    }
    if (found === -1) return null;
    if (first === -1) first = found;
    last = found;
  }
  return (last - first) + first * 0.5;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const scored = commands
      .filter((c) => !c.onlyWhenSearching || query.trim().length > 0)
      .map((c) => ({ c, s: score(query, `${c.label} ${c.keywords ?? ""} ${c.hint ?? ""}`) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => (a.s! - b.s!));
    return scored.map((x) => x.c);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    restoreRef.current?.focus?.();
  }, []);

  const openPalette = useCallback(() => {
    restoreRef.current = document.activeElement as HTMLElement;
    setOpen(true);
  }, []);

  // Globale Tastenkürzel + externer Öffnen-Trigger.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) restoreRef.current = document.activeElement as HTMLElement;
          return !v;
        });
      }
    };
    const onOpen = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("op-openpalette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("op-openpalette", onOpen);
    };
  }, [openPalette]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      document.documentElement.style.overflow = "hidden";
      return () => {
        cancelAnimationFrame(id);
        document.documentElement.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    if (!cmd.keepOpen) close();
    cmd.run(router);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Fokus im Dialog halten. Ohne diese Klammer wandert die Tabulatortaste
      // aus der Palette heraus in die Seite dahinter, die durch den Scrim
      // verdeckt ist – der Kommentar oben versprach die Falle, der Code hatte
      // sie nicht. Ein Modal, das den Fokus verliert, ist für Tastatur- und
      // Screenreader-Nutzung nicht bedienbar.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'input, button:not([tabindex="-1"]), a[href]',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !panelRef.current?.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    }
  };

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Befehle und Navigation"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        aria-label="Schließen"
        tabIndex={-1}
        onClick={close}
        className="cmdk-scrim absolute inset-0 bg-ink-strong/25 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        className="cmdk-panel relative w-full max-w-xl overflow-hidden rounded-[var(--radius-l)] border border-line bg-raised shadow-floating"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={19} className="shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen oder Befehl eingeben …"
            className="h-14 w-full bg-transparent text-[1.0625rem] text-ink-strong placeholder:text-ink-faint focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Suche"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-opt-${results[active].id}` : undefined}
          />
          <kbd className="hidden shrink-0 rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-faint sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-[0.9375rem] text-ink-soft">
              Nichts gefunden. Versuchen Sie „Preis“, „Check“ oder „Kontakt“.
            </p>
          ) : (
            results.map((cmd, i) => {
              const showGroup = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              return (
                <div key={cmd.id}>
                  {showGroup ? (
                    <p className="px-3 pb-1 pt-3 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
                      {cmd.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    id={`cmdk-opt-${cmd.id}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => runAt(i)}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-s)] px-3 py-2.5 text-left transition-colors duration-[120ms] ${
                      i === active ? "bg-sunken" : "hover:bg-sunken/60"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                        i === active ? "bg-accent-subtle text-accent" : "bg-sunken text-ink-soft"
                      }`}
                    >
                      <Icon name={cmd.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium text-ink-strong">
                        {cmd.label}
                      </span>
                      {cmd.hint ? (
                        <span className="block truncate text-[0.8125rem] text-ink-soft">{cmd.hint}</span>
                      ) : null}
                    </span>
                    <Icon
                      name="arrow-right"
                      size={15}
                      className={`shrink-0 transition-opacity ${i === active ? "opacity-100 text-ink-soft" : "opacity-0"}`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[0.75rem] text-ink-faint">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="font-mono">↑↓</kbd> wählen</span>
            <span className="flex items-center gap-1"><kbd className="font-mono">↵</kbd> öffnen</span>
          </span>
          <span className="font-mono">{site.name}</span>
        </div>
      </div>
    </div>
  );
}
