"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { WorkshopLogin } from "./WorkshopLogin";
import { WorkshopStats } from "./WorkshopStats";
import { TicketList } from "./TicketList";
import { TicketDetail } from "./TicketDetail";
import { ShortcutHelp } from "./ShortcutHelp";
import { useWorkshopTickets } from "@/lib/workshop/useWorkshopTickets";
import { useShortcuts, type Shortcut } from "@/lib/workshop/useShortcuts";
import { parseDeepLink } from "@/lib/workshop/deeplink";
import { logout } from "@/lib/api/client";
import { hasTicketBackend } from "@/lib/supabase/env";
import { ticketStatusMeta, TICKET_STATUSES, type TicketStatus } from "@/lib/tickets/status";

/*
  Das Dashboard.

  Es ist eine Client-Komponente, und zwar aus einem Grund: Es ist ein
  Werkzeug, kein Dokument. Alles daran – Suche, Auswahl, Rundruf – lebt im
  Browser, und ein serverseitig gerendeter erster Zustand wäre eine Zehntel-
  sekunde alt und danach im Weg. Die Seite drumherum (`app/intern/werkstatt`)
  ist eine Server-Komponente und kostet kein JavaScript.

  Die Aufteilung folgt der Bewegung einer Werkstatt: links die Liste, rechts
  die Akte. Auf dem Telefon liegt die Akte über der Liste, weil man dort
  ohnehin nur eins von beidem gleichzeitig ansieht.
*/

const SORTS = [
  { id: "bewegung", label: "Zuletzt bewegt" },
  { id: "neueste", label: "Neueste zuerst" },
  { id: "aelteste", label: "Älteste zuerst" },
  { id: "status", label: "Nach Status" },
] as const;

/** Die Voreinstellung: alles, was noch Arbeit ist. */
const OPEN_STATUSES = TICKET_STATUSES.filter((status) => status !== "completed");

export function WorkshopDashboard() {
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<TicketStatus[]>([...OPEN_STATUSES]);
  const [sort, setSort] = useState<string>("bewegung");
  const [selected, setSelected] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  /*
    Der Sprung aus der Übersicht: `#vorgang=<Code>` öffnet eine Akte,
    `#status=<Zustand>` zeigt einen Zustand allein.

    Im Fragment, nicht als Parameter: Ein Fragment schickt der Browser nie
    an einen Server, ein Parameter landet in jedem Zugriffsprotokoll. Der
    Vorgangscode ist ein Schlüssel – wer ihn hat, sieht die Statusseite des
    Kunden. Dieselbe Überlegung wie beim Reparaturzertifikat.

    Einmal beim Laden, nicht fortlaufend. Die Adresse ist hier ein
    Startwert, kein zweiter Zustandsspeicher – wer danach filtert oder
    sucht, soll nicht gegen die Adresse anarbeiten müssen. Aus demselben
    Grund wird sie auch nicht zurückgeschrieben.

    `window.location` statt `useSearchParams`: Letzteres verlangt im
    statischen Export eine Suspense-Grenze und macht die Seite zur
    Client-Bailout. Dieselbe Lösung wie im Übergabe-Assistenten.

    Bei einem Vorgang werden zusätzlich alle Zustände eingeschaltet. Die
    Voreinstellung blendet abgeschlossene aus – ein Sprung, der genau
    dorthin zeigt, liefe sonst ins Leere und die Akte schlösse sich sofort
    wieder.
  */
  useEffect(() => {
    const link = parseDeepLink(window.location.hash, TICKET_STATUSES);
    if (link.vorgang) {
      setStatuses([...TICKET_STATUSES]);
      setSearch(link.vorgang);
      setSelected(link.vorgang);
    } else if (link.status) {
      setStatuses([link.status]);
    }
  }, []);

  const query = useMemo(
    () => ({ search, statuses, sort, limit: 100 }),
    [search, statuses, sort],
  );
  const { phase, error, data, channel, applyLocal, reload } = useWorkshopTickets(query);

  /* „vor 3 Stunden" braucht eine Uhr – aber erst im Browser, sonst weicht
     das Serverbild vom ersten Clientbild ab. Eine Minute Takt genügt. */
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Über `useMemo`, damit die leere Ersatzliste nicht bei jedem Rendern eine
  // neue Kennung bekommt – sonst hinge die Auswahl-Prüfung unten in einer
  // Schleife aus Effekt und Neurendern.
  const items = useMemo(() => data?.items ?? [], [data]);

  /* Fällt der ausgewählte Vorgang aus der Liste (Filter, Suche), schließt
     sich die Akte – eine Akte ohne Zeile daneben verwirrt mehr, als sie
     nützt. */
  useEffect(() => {
    if (!selected) return;
    if (phase !== "da") return;
    if (!items.some((item) => item.ticketCode === selected)) setSelected(null);
  }, [items, selected, phase]);

  const move = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const index = items.findIndex((item) => item.ticketCode === selected);
      const next = index === -1 ? 0 : Math.min(Math.max(index + delta, 0), items.length - 1);
      setSelected(items[next]!.ticketCode);
    },
    [items, selected],
  );

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        key: "/",
        label: "Suche",
        run: () => searchRef.current?.focus(),
      },
      { key: "j", label: "Nächster Vorgang", run: () => move(1) },
      { key: "k", label: "Voriger Vorgang", run: () => move(-1) },
      { key: "Escape", display: "Esc", label: "Akte schließen", run: () => setSelected(null) },
      { key: "r", label: "Neu laden", run: () => reload() },
      {
        key: "a",
        label: "Alle Zustände zeigen",
        run: () => setStatuses([...TICKET_STATUSES]),
      },
      {
        key: "o",
        label: "Nur offene zeigen",
        run: () => setStatuses([...OPEN_STATUSES]),
      },
      { key: "?", label: "Diese Hilfe", run: () => setHelpOpen((value) => !value) },
    ],
    [move, reload],
  );

  useShortcuts(shortcuts, phase === "da");

  if (!hasTicketBackend()) return <NoBackend />;
  if (phase === "anmeldung") return <WorkshopLogin onSignedIn={reload} />;
  if (phase === "gesperrt") {
    return (
      <div className="mx-auto max-w-sm rounded-[var(--radius-l)] border border-line bg-raised p-7 text-center">
        <h1 className="text-title">Kein Zugang</h1>
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-soft">{error}</p>
        <button
          type="button"
          onClick={async () => {
            await logout();
            reload();
          }}
          className="mt-6 inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
        >
          Abmelden
        </button>
      </div>
    );
  }

  const toggleStatus = (status: TicketStatus) => {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((entry) => entry !== status)
        : [...current, status],
    );
  };

  return (
    <div>
      {/* ---- Kopfzeile ---------------------------------------------------- */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow">Intern</p>
          <h1 className="text-headline mt-2">Werkstatt</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[0.8125rem] text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                channel === "verbunden"
                  ? "bg-[color:var(--positive)] motion-safe:animate-pulse"
                  : channel === "gestoert"
                    ? "bg-[color:var(--warn)]"
                    : "bg-ink-faint"
              }`}
            />
            {channel === "verbunden" ? "live" : channel === "gestoert" ? "getrennt" : "…"}
          </span>
          {data?.staff ? (
            <span className="text-ink-faint">
              {data.staff.displayName || data.staff.email}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 transition-colors hover:border-ink-faint hover:text-ink-strong"
            title="Tastaturkürzel (?)"
          >
            <kbd className="font-mono">?</kbd>
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              reload();
            }}
            className="inline-flex h-9 items-center rounded-full border border-line px-3.5 transition-colors hover:border-ink-faint hover:text-ink-strong"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* ---- Kennzahlen ---------------------------------------------------- */}
      {data?.stats ? (
        <div className="mt-8">
          <WorkshopStats stats={data.stats} onPickStatus={(status) => setStatuses([status])} />
        </div>
      ) : null}

      {/* ---- Hinweis auf nicht eingerichtete Nachrichtenwege ---------------- */}
      {data?.notifications.missing.length ? (
        <MissingChannels missing={data.notifications.missing} />
      ) : null}

      {/* ---- Werkzeugleiste ------------------------------------------------ */}
      <div className="mt-8 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[16rem] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={16} />
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, Gerät, Vorgangsnummer, Telefon …"
            className="h-11 w-full rounded-full border border-line bg-raised pl-10 pr-4 text-[0.875rem] text-ink-strong placeholder:text-ink-faint transition-colors duration-[var(--duration-fast)] focus:border-accent"
            aria-label="Vorgänge durchsuchen"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-[0.8125rem] text-ink-soft">
          <span className="sr-only sm:not-sr-only">Sortierung</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-11 rounded-full border border-line bg-raised px-3.5 text-[0.875rem] text-ink-strong transition-colors focus:border-accent"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TICKET_STATUSES.map((status) => {
          const on = statuses.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              aria-pressed={on}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.75rem] transition-colors duration-[var(--duration-fast)] ${
                on
                  ? "border-accent bg-accent-subtle font-medium text-accent"
                  : "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong"
              }`}
            >
              {on ? <Icon name="check" size={12} /> : null}
              {ticketStatusMeta[status].label}
            </button>
          );
        })}
      </div>

      {/* ---- Liste und Akte ------------------------------------------------ */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <div className="lg:order-1">
          <div className="mb-2.5 flex items-baseline justify-between text-[0.8125rem] text-ink-faint">
            <span>
              {data ? `${items.length} von ${data.total} Vorgängen` : "…"}
            </span>
            {phase === "fehler" ? (
              <span style={{ color: "var(--danger)" }}>{error}</span>
            ) : null}
          </div>
          <TicketList
            items={items}
            selected={selected}
            onSelect={(code) => setSelected(code === selected ? null : code)}
            now={now}
            loading={phase === "laedt"}
          />
        </div>

        {selected ? (
          <div className="lg:order-2 lg:sticky lg:top-24">
            <TicketDetail
              ticketCode={selected}
              onClose={() => setSelected(null)}
              onChanged={(code, status, statusChangedAt) =>
                applyLocal(code, { status, statusChangedAt })
              }
            />
          </div>
        ) : null}
      </div>

      {helpOpen ? (
        <ShortcutHelp shortcuts={shortcuts} onClose={() => setHelpOpen(false)} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function MissingChannels({
  missing,
}: {
  missing: { channel: string; requires: readonly string[] }[];
}) {
  return (
    <p className="mt-6 flex flex-wrap items-start gap-2 rounded-[var(--radius-m)] border border-line bg-sunken px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-soft">
      <Icon name="shield" size={15} className="mt-0.5 shrink-0" />
      <span>
        Noch nicht eingerichtet:{" "}
        {missing
          .map((entry) => `${entry.channel} (${entry.requires.join(", ")})`)
          .join(" · ")}
        . Kunden mit diesem Wunsch bekommen keine Nachricht – anrufen.
      </span>
    </p>
  );
}

function NoBackend() {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-l)] border border-line bg-raised p-7 text-center">
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-soft">
        <Icon name="cpu" size={22} />
      </span>
      <h1 className="text-title mt-5">Keine Vorgangsverwaltung eingerichtet</h1>
      <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-soft">
        Diese Ansicht braucht ein Supabase-Projekt und einen Server-Build.
        Die Einrichtung steht in <span className="font-mono">supabase/README.md</span>;
        im statischen Export (GitHub Pages) gibt es sie bewusst nicht.
      </p>
    </div>
  );
}
