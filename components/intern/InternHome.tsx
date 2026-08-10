"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { WorkshopLogin } from "@/components/workshop/WorkshopLogin";
import { useWorkshopTickets } from "@/lib/workshop/useWorkshopTickets";
import { hasTicketBackend } from "@/lib/supabase/env";
import { formatEuro } from "@/lib/format";
import {
  PICKUP_DAYS,
  STALE_DAYS,
  attentionItems,
  countByStatus,
  valueInProgress,
  type AttentionReason,
} from "@/lib/workshop/attention";
import { workshopHref } from "@/lib/workshop/deeplink";
import { INTERN_TOOLS } from "@/lib/intern/pages";
import { certKeys } from "@/lib/cert/keys";
import { SUPPORT_CHECKED } from "@/lib/data/support";
import { site } from "@/lib/site";
import { MANUELL, readiness, type ReadinessItem } from "@/lib/intern/readiness";
import { loadProfile } from "@/lib/invoice/store";
import {
  TICKET_STATUSES,
  ticketStatusMeta,
  type TicketStatus,
} from "@/lib/tickets/status";

/*
  Der Einstieg für den Betrieb.

  Bis hierher gab es drei interne Werkzeuge und keine Tür: Wer eine Rechnung
  schreiben wollte, musste `/intern/rechnung` auswendig können. Nicht
  verlinkt zu sein ist Absicht – nicht auffindbar zu sein war keine.

  Diese Seite ersetzt keines der drei, und sie ist ausdrücklich keine
  zweite Fassung des Dashboards. Das Dashboard beantwortet die Frage des
  Arbeitstages – was liegt an, was kann heute raus. Diese Seite stellt die
  Gegenfrage: **was geht nicht von selbst weiter.**

  Der Unterschied ist der Grund, warum es sie gibt. Eine Zahl je Zustand
  zeigt nicht, dass ein Vorgang seit elf Tagen auf ein Ersatzteil wartet –
  er steht in derselben Zahl wie einer von gestern und fällt niemandem auf,
  bis der Kunde anruft. Oben stehen deshalb die Vorgänge mit Namen, die
  Zählung darunter ist nur noch Lagebild.

  Drei Dinge, die dabei zusammenpassen mussten:

  – **Kein Zugriff beim Rendern.** Die Seite drumherum ist eine
    Server-Komponente ohne Datenzugriff, weil `cookies()` sich nicht mit
    `output: "export"` verträgt. Alles Angebundene lebt deshalb hier.
  – **Ohne Backend bleibt die Seite nützlich.** Ohne
    `NEXT_PUBLIC_SUPABASE_URL` gibt es keine Vorgänge – aber die Werkzeuge
    und die Einrichtungsliste stehen trotzdem, statt dass die Seite leer
    ist oder in einen Ladebalken läuft.
  – **Die Anmeldung ist dieselbe.** Kein zweiter Weg hinein: derselbe
    `WorkshopLogin`, dieselbe Prüfung gegen `workshop_staff`. Eine eigene
    Tür wäre eine zweite Stelle, an der man sie offen lassen kann.
*/

/** Was „offen" heißt: alles, was noch Arbeit ist. */
const OPEN_STATUSES = TICKET_STATUSES.filter((status) => status !== "completed");

/**
 * Wie viele offene Vorgänge geholt werden.
 *
 * Reichlich für eine Werkstatt. Wird die Zahl doch erreicht, sagt die Seite
 * das – eine Auswertung, die stillschweigend nur die ersten 200 Vorgänge
 * kennt, meldete „nichts liegt quer" und meinte „ich habe nicht überall
 * nachgesehen".
 */
const LIMIT = 200;

/**
 * Der Satz zu einem Befund.
 *
 * Steht hier und nicht in `lib/workshop/attention.ts`: Dort wird
 * entschieden, **was** auffällt, hier steht, wie es heißt – und hier liegt
 * ohnehin schon die Beschriftung der Zustände.
 *
 * Die Mehrzahl wird ausgeschrieben, nicht angehängt („Tag"/„Tagen"). Die
 * Redaktionsprüfung im Prüfstand schlägt bei angehängten Umlaut-Endungen
 * an, und der Grund gilt hier genauso.
 */
function satzZu(reason: AttentionReason, days: number, status: TicketStatus): string {
  const tage = `${days} ${days === 1 ? "Tag" : "Tagen"}`;
  if (reason === "ueberfaellig") {
    return days === 0
      ? "Zugesagter Termin ist heute verstrichen"
      : `Zugesagter Termin seit ${tage} vorbei`;
  }
  if (reason === "abholung") return `Abholbereit seit ${tage}`;
  return `Seit ${tage} unverändert auf „${ticketStatusMeta[status].label}“`;
}

/* ---- Livegang: was noch fehlt ------------------------------------------- */

/**
 * Dieselbe Liste, die `npm run livegang` im Terminal zeigt.
 *
 * Erst nach dem ersten Rendern: Das Rechnungsprofil liegt im
 * Browserspeicher, und ein serverseitig anderes Ergebnis als im Browser
 * ergäbe eine Abweichung beim Hydrieren.
 */
function useLivegang(): ReadinessItem[] {
  const [items, setItems] = useState<ReadinessItem[]>([]);

  useEffect(() => {
    const profil = loadProfile();
    setItems(
      readiness({
        certKeyCount: certKeys.length,
        profile: {
          iban: profil.iban,
          bic: profil.bic,
          taxNumber: profil.taxNumber,
        },
        supportChecked: SUPPORT_CHECKED,
        site: {
          street: site.street,
          zip: site.zip,
          city: site.city,
          phone: site.phone,
          email: site.email,
          vatId: site.vatId,
        },
        now: Date.now(),
      }),
    );
  }, []);

  return items;
}

/* ---- Die Seite ---------------------------------------------------------- */

export function InternHome() {
  // Aufgerufen, nicht abgefragt: `hasTicketBackend` ist eine Funktion, und
  // eine Funktionsreferenz ist immer wahr. `!hasTicketBackend` wäre damit
  // stets falsch – der Zweig darunter liefe nie, und der statische Export
  // zeigte statt der ehrlichen Auskunft einen Anmeldeversuch ins Leere.
  if (!hasTicketBackend()) return <OhneBackend />;
  return <MitBackend />;
}

function Rahmen({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-6 pb-24">
      <header>
        <p className="text-eyebrow">Intern · nicht verlinkt</p>
        <h1 className="text-headline mt-4">Übersicht</h1>
      </header>
      {children}
    </div>
  );
}

/** Ohne Datenbank: die Werkzeuge stehen, die Vorgänge gibt es nicht. */
function OhneBackend() {
  const livegang = useLivegang();
  return (
    <Rahmen>
      <p className="max-w-2xl text-lg leading-relaxed text-ink-soft">
        Für diese Installation ist keine Datenbank hinterlegt. Vorgänge
        werden deshalb nicht geführt – der Sofortpreis-Rechner, das
        Übergabeprotokoll und die beiden Werkzeuge unten arbeiten wie
        gewohnt weiter, sie brauchen keinen Server.
      </p>
      <Werkzeuge ohneWerkstatt />
      <Livegang items={livegang} />
    </Rahmen>
  );
}

/** Mit Datenbank: erst anmelden, dann nachsehen, was quer liegt. */
function MitBackend() {
  const livegang = useLivegang();

  /* Die Uhr erst im Browser stellen, und danach im Minutentakt: „seit 4
     Tagen" darf sich nicht zwischen Server- und Clientbild unterscheiden. */
  const [jetzt, setJetzt] = useState<number | null>(null);
  useEffect(() => {
    setJetzt(Date.now());
    const timer = window.setInterval(() => setJetzt(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  /*
    Alle offenen Vorgänge holen, aber keine Liste daraus machen: Gezeigt
    werden nur die, die auffallen. Die vollständige Liste steht im
    Dashboard – hier wäre sie eine zweite Fassung derselben Ansicht.

    Die Sortierung ist hier nicht gleichgültig, anders als beim Dashboard.
    „bewegung" ordnet absteigend nach der letzten Änderung, stellt also die
    frischesten Vorgänge nach vorn – und schnitte beim Limit ausgerechnet
    die ab, die am längsten liegen. Also „aelteste": Was zuerst angemeldet
    wurde, kommt zuerst, und die Liegengebliebenen sind sicher dabei.
  */
  const query = useMemo(
    () => ({ search: "", statuses: [...OPEN_STATUSES], sort: "aelteste", limit: LIMIT }),
    [],
  );
  const { phase, error, data, reload } = useWorkshopTickets(query);

  if (phase === "anmeldung") {
    return (
      <Rahmen>
        <WorkshopLogin onSignedIn={reload} />
      </Rahmen>
    );
  }

  const items = data?.items ?? [];
  const zaehlung = countByStatus(items);
  const offen = items.length;
  const abholbereit = zaehlung.get("ready_for_pickup") ?? 0;
  // Erst im Browser: Ein serverseitig gerechnetes „seit 4 Tagen" wäre auf
  // dem Zeitpunkt des Builds eingefroren – dieselbe Überlegung wie beim
  // Update-Horizont auf /versorgung.
  const quer = jetzt === null ? [] : attentionItems(items, jetzt);
  const wert = valueInProgress(items);

  const bereit = phase === "da";
  const abgeschnitten = (data?.total ?? 0) > items.length;

  return (
    <Rahmen>
      {/* Was quer liegt – steht oben, weil es das einzige ist, das etwas
          von einem verlangt. Die Zählung darunter ist Lagebild. */}
      {bereit ? (
        <section>
          <h2 className="text-title">Braucht Aufmerksamkeit</h2>
          {abgeschnitten ? (
            <p className="mt-3 text-[0.875rem] text-warn">
              Es gibt {data?.total ?? 0} offene Vorgänge, ausgewertet wurden
              die ersten {LIMIT}. Diese Liste ist deshalb möglicherweise
              unvollständig.
            </p>
          ) : null}
          {quer.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-m)] border border-line bg-raised px-5 py-6">
              <p className="text-lg text-ink-strong">Nichts liegt quer.</p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
                Kein überfälliger Termin, nichts seit über {PICKUP_DAYS} Tagen
                abholbereit, nichts seit über {STALE_DAYS} Tagen unbewegt.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-[0.9375rem] text-ink-soft">
                {quer.length === 1
                  ? "Ein Vorgang geht nicht von selbst weiter."
                  : `${quer.length} Vorgänge gehen nicht von selbst weiter.`}
              </p>
              <ul className="mt-5 space-y-2">
                {quer.map(({ ticket, reason, days }) => (
                  <li key={ticket.ticketCode}>
                    <Link
                      href={workshopHref({ vorgang: ticket.ticketCode })}
                      className="press group flex items-start gap-4 overflow-hidden rounded-[var(--radius-m)] border border-line bg-raised p-4 transition-colors hover:border-line-strong"
                    >
                      {/* Die Kante trägt den Grund. Farbe statt Symbol: ein
                          Ausrufezeichen neben jeder Zeile schriee, und die
                          Liste soll ruhig bleiben, auch wenn sie lang wird. */}
                      <span
                        aria-hidden="true"
                        className="-my-4 -ml-4 w-1 self-stretch"
                        style={{
                          background:
                            reason === "ueberfaellig"
                              ? "var(--danger)"
                              : "var(--warn)",
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span className="truncate font-medium text-ink-strong">
                            {ticket.device}
                          </span>
                          <span className="truncate text-[0.875rem] text-ink-soft">
                            {ticket.customer}
                          </span>
                          <span className="font-mono text-[0.8125rem] text-ink-faint">
                            {ticket.ticketCode}
                          </span>
                        </span>
                        <span
                          className={`mt-1 block text-[0.875rem] ${
                            reason === "ueberfaellig" ? "text-danger" : "text-warn"
                          }`}
                        >
                          {satzZu(reason, days, ticket.status)}
                        </span>
                      </span>
                      <span className="mt-0.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5">
                        <Icon name="arrow-right" size={16} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-faint">
                Die Schwellen ({PICKUP_DAYS} Tage bis zur Abholerinnerung,{" "}
                {STALE_DAYS} Tage ohne Bewegung) sind gesetzt, nicht gemessen –
                sie stehen in <code>lib/workshop/attention.ts</code>.
              </p>
            </>
          )}
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-title">Offene Vorgänge</h2>
          <Link
            href="/intern/werkstatt"
            className="text-[0.9375rem] font-medium text-accent underline-offset-4 hover:underline"
          >
            Im Dashboard bearbeiten
          </Link>
        </div>

        {phase === "laedt" ? (
          <p className="mt-4 text-sm text-ink-soft">Wird geladen …</p>
        ) : phase === "gesperrt" ? (
          <p className="mt-4 text-sm text-danger">
            {error || "Dieses Konto ist nicht für die Werkstatt freigeschaltet."}
          </p>
        ) : phase === "fehler" ? (
          <div className="mt-4">
            <p className="text-sm text-danger">{error || "Die Liste ließ sich nicht laden."}</p>
            <button
              type="button"
              onClick={reload}
              className="press mt-3 inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[0.9375rem] font-medium text-ink-strong"
            >
              Noch einmal versuchen
            </button>
          </div>
        ) : offen === 0 ? (
          <p className="mt-4 text-lg text-ink-soft">
            Nichts offen. Alle Vorgänge sind abgeschlossen.
          </p>
        ) : (
          <>
            {/* Drei Kacheln, mehr nicht – dieselbe Zurückhaltung wie im
                Dashboard. Ein Feld mit zwölf Kennzahlen wird gelesen wie
                eine Tapete. */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kachel label="In Arbeit" wert={String(offen)} />
              <Kachel
                label="Abholbereit"
                wert={String(abholbereit)}
                hinweis={abholbereit > 0 ? "wartet auf den Kunden" : undefined}
                betont={abholbereit > 0}
              />
              <Kachel
                label="Wert in Arbeit"
                wert={formatEuro(wert)}
                hinweis="kein Umsatz – nichts davon ist bezahlt"
              />
            </div>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {OPEN_STATUSES.filter((status) => (zaehlung.get(status) ?? 0) > 0).map(
                (status) => {
                  const meta = ticketStatusMeta[status];
                  const anzahl = zaehlung.get(status) ?? 0;
                  return (
                    <li key={status}>
                    <Link
                      href={workshopHref({ status })}
                      className="flex items-center gap-4 py-3 transition-colors hover:text-accent"
                    >
                      <Icon name={meta.icon} size={18} />
                      <span className="flex-1 text-ink-strong">{meta.label}</span>
                      {status === "ready_for_pickup" ? (
                        <span className="text-[0.8125rem] text-ink-faint">
                          wartet auf Abholung
                        </span>
                      ) : null}
                      <span className="font-mono text-lg tabular-nums text-ink-strong">
                        {anzahl}
                      </span>
                    </Link>
                    </li>
                  );
                },
              )}
            </ul>
          </>
        )}
      </section>

      <Werkzeuge />
      <Livegang items={livegang} />
    </Rahmen>
  );
}

/**
 * Eine Kennzahl.
 *
 * Die Zahl steht in Tabellenziffern (`tabular-nums`), damit die Kacheln
 * beim Aktualisieren nicht zucken – eine Ziffer, die schmaler ist als die
 * andere, verschiebt sonst die ganze Zeile.
 */
function Kachel({
  label,
  wert,
  hinweis,
  betont = false,
}: {
  label: string;
  wert: string;
  hinweis?: string;
  betont?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-m)] border border-line bg-raised px-4 py-3.5">
      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </p>
      <p
        className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight ${
          betont ? "text-accent" : "text-ink-strong"
        }`}
      >
        {wert}
      </p>
      {hinweis ? (
        <p className="mt-0.5 text-[0.75rem] leading-snug text-ink-faint">{hinweis}</p>
      ) : null}
    </div>
  );
}

function Werkzeuge({ ohneWerkstatt = false }: { ohneWerkstatt?: boolean }) {
  const liste = ohneWerkstatt
    ? INTERN_TOOLS.filter((w) => !w.needsBackend)
    : INTERN_TOOLS;

  return (
    <section>
      <h2 className="text-title">Werkzeuge</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {liste.map((w) => (
          <Link
            key={w.href}
            href={w.href}
            className="press group rounded-[var(--radius-l)] border border-line bg-raised p-5 transition-colors hover:border-line-strong"
          >
            <span className="flex items-center gap-2 font-medium text-ink-strong">
              {w.title}
              <span className="text-ink-faint transition-transform group-hover:translate-x-0.5">
                <Icon name="arrow-right" size={15} />
              </span>
            </span>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">{w.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Livegang({ items }: { items: ReadinessItem[] }) {
  const blocker = items.filter((i) => i.schwere === "blocker");
  const hinweise = items.filter((i) => i.schwere === "hinweis");

  return (
    <section>
      <h2 className="text-title">Vor dem Livegang</h2>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
        {blocker.length === 0
          ? "Maschinell prüfbar ist nichts mehr offen. Die drei Punkte unten kann nur ein Mensch bestätigen."
          : "Was hier steht, fällt im Betrieb erst auf, wenn ein Kunde davorsteht."}
      </p>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {[...blocker, ...hinweise].map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-4 overflow-hidden rounded-[var(--radius-m)] border border-line bg-sunken p-4"
            >
              {/* Dieselbe Kante wie bei den Befunden oben: Was etwas von
                  einem will, sieht gleich aus, egal woher es kommt. */}
              <span
                aria-hidden="true"
                className="-my-4 -ml-4 w-1 self-stretch"
                style={{
                  background:
                    item.schwere === "blocker" ? "var(--danger)" : "var(--warn)",
                }}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block font-medium ${
                    item.schwere === "blocker" ? "text-danger" : "text-warn"
                  }`}
                >
                  {item.titel}
                </span>
                <span className="mt-1 block text-[0.875rem] leading-relaxed text-ink-soft">
                  {item.hinweis}
                </span>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-2 inline-block text-[0.875rem] font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Jetzt erledigen
                  </Link>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/*
        Ohne Häkchen, und das ist Absicht: Ein Häkchen, das sich selbst
        setzt, wäre gelogen. Keine Maschine kann sehen, ob vor dem Worker
        eine Zugangsbeschränkung steht oder ob die Preise gegengelesen sind.
      */}
      <div className="mt-6 rounded-[var(--radius-m)] border border-line bg-raised p-5">
        <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
          Nur von Hand zu bestätigen
        </p>
        <ul className="mt-3 space-y-3">
          {MANUELL.map((punkt) => (
            <li key={punkt.titel}>
              <p className="text-[0.9375rem] font-medium text-ink-strong">
                {punkt.titel}
              </p>
              <p className="mt-0.5 text-[0.875rem] leading-relaxed text-ink-soft">
                {punkt.hinweis}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-faint">
        Dieselbe Liste im Terminal: <code>npm run livegang</code>.
      </p>
    </section>
  );
}
