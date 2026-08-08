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
import { certKeys } from "@/lib/cert/keys";
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

interface Werkzeug {
  href: string;
  title: string;
  desc: string;
}

/*
  Ohne Symbole, und das ist kein Auslassen.

  Der Satz in components/ui/Icon.tsx kennt kein Werkzeug für „Rechnung" –
  und die naheliegenden Ersatzgriffe (ein Brief, ein Haken) bedeuten etwas
  anderes. Ein Symbol, das man erst erklären muss, trägt weniger als das
  Wort, das darunter ohnehin steht. Also nur das Wort und der Pfeil.
*/
const WERKZEUGE: Werkzeug[] = [
  {
    href: "/intern/werkstatt",
    title: "Werkstatt",
    desc: "Vorgänge ansehen, Status setzen, Vermerke schreiben.",
  },
  {
    href: "/intern/rechnung",
    title: "Rechnung",
    desc: "Beleg schreiben, drucken, als E-Rechnung ausgeben.",
  },
  {
    href: "/intern/zertifikat",
    title: "Zertifikat",
    desc: "Reparatur unterschreiben und als QR-Code mitgeben.",
  },
];

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

/* ---- Einrichtung: was fehlt, bevor es losgeht --------------------------- */

interface Mangel {
  text: string;
  href: string;
  hinweis: string;
}

/**
 * Die offenen Punkte, aber nur die maschinell feststellbaren.
 *
 * Beide sind still: Ohne Schlüssel stellt `/intern/zertifikat` weiter
 * Belege aus – sie sind nur außerhalb dieses einen Browsers nicht prüfbar.
 * Ohne Bankverbindung druckt das Rechnungswerkzeug weiter, nur eben ohne
 * GiroCode und ohne Pflichtangaben. Beides fällt erst auf, wenn ein Kunde
 * davorsteht.
 */
function useEinrichtung(): Mangel[] {
  const [maengel, setMaengel] = useState<Mangel[]>([]);

  useEffect(() => {
    const gefunden: Mangel[] = [];

    if (certKeys.length === 0) {
      gefunden.push({
        text: "Signaturschlüssel fehlt",
        href: "/intern/zertifikat",
        hinweis:
          "Ausgestellte Zertifikate lassen sich außerhalb dieses Browsers nicht prüfen.",
      });
    }

    // localStorage nur im Browser, und nur nach dem ersten Rendern – sonst
    // weicht das Serverbild vom ersten Clientbild ab.
    const profil = loadProfile();
    const fehlend = [
      !profil.iban && "IBAN",
      !profil.bic && "BIC",
      !profil.taxNumber && "Steuernummer",
    ].filter(Boolean) as string[];

    if (fehlend.length > 0) {
      gefunden.push({
        text: `${fehlend.join(", ")} ${fehlend.length === 1 ? "fehlt" : "fehlen"}`,
        href: "/intern/rechnung",
        hinweis:
          "Ohne diese Angaben bleibt der GiroCode aus und die Rechnung ist unvollständig.",
      });
    }

    setMaengel(gefunden);
  }, []);

  return maengel;
}

/* ---- Die Seite ---------------------------------------------------------- */

export function InternHome() {
  if (!hasTicketBackend) return <OhneBackend />;
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
  const maengel = useEinrichtung();
  return (
    <Rahmen>
      <p className="max-w-2xl text-lg leading-relaxed text-ink-soft">
        Für diese Installation ist keine Datenbank hinterlegt. Vorgänge
        werden deshalb nicht geführt – der Sofortpreis-Rechner, das
        Übergabeprotokoll und die beiden Werkzeuge unten arbeiten wie
        gewohnt weiter, sie brauchen keinen Server.
      </p>
      <Werkzeuge ohneWerkstatt />
      <Einrichtung maengel={maengel} />
    </Rahmen>
  );
}

/** Mit Datenbank: erst anmelden, dann nachsehen, was quer liegt. */
function MitBackend() {
  const maengel = useEinrichtung();

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
            <p className="mt-4 text-lg text-ink-soft">
              Nichts liegt quer. Kein überfälliger Termin, nichts seit über{" "}
              {PICKUP_DAYS} Tagen abholbereit, nichts seit über {STALE_DAYS}{" "}
              Tagen unbewegt.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[0.9375rem] text-ink-soft">
                {quer.length === 1
                  ? "Ein Vorgang geht nicht von selbst weiter."
                  : `${quer.length} Vorgänge gehen nicht von selbst weiter.`}
              </p>
              <ul className="mt-5 space-y-2">
                {quer.map(({ ticket, reason, days }) => (
                  <li
                    key={ticket.ticketCode}
                    className="rounded-[var(--radius-m)] border border-line bg-raised p-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-[0.9375rem] text-ink-strong">
                        {ticket.ticketCode}
                      </span>
                      <span className="text-ink-strong">{ticket.device}</span>
                      <span className="text-[0.875rem] text-ink-faint">
                        {ticket.customer}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-[0.875rem] ${
                        reason === "ueberfaellig" ? "text-danger" : "text-warn"
                      }`}
                    >
                      {satzZu(reason, days, ticket.status)}
                    </p>
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
            <p className="mt-4 text-lg text-ink-soft">
              {offen === 1 ? "Ein Vorgang" : `${offen} Vorgänge`} in Arbeit
              {abholbereit > 0 ? `, davon ${abholbereit} abholbereit` : ""}
              {wert > 0 ? ` · ${formatEuro(wert)} in Arbeit` : ""}.
            </p>
            {wert > 0 ? (
              <p className="mt-1 text-[0.8125rem] text-ink-faint">
                Kein Umsatz: nichts davon ist bezahlt, und manches wird nach
                der Diagnose abgelehnt.
              </p>
            ) : null}
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {OPEN_STATUSES.filter((status) => (zaehlung.get(status) ?? 0) > 0).map(
                (status) => {
                  const meta = ticketStatusMeta[status];
                  const anzahl = zaehlung.get(status) ?? 0;
                  return (
                    <li key={status} className="flex items-center gap-4 py-3">
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
                    </li>
                  );
                },
              )}
            </ul>
          </>
        )}
      </section>

      <Werkzeuge />
      <Einrichtung maengel={maengel} />
    </Rahmen>
  );
}

function Werkzeuge({ ohneWerkstatt = false }: { ohneWerkstatt?: boolean }) {
  const liste = ohneWerkstatt
    ? WERKZEUGE.filter((w) => w.href !== "/intern/werkstatt")
    : WERKZEUGE;

  return (
    <section>
      <h2 className="text-title">Werkzeuge</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {liste.map((w) => (
          <Link
            key={w.href}
            href={w.href}
            className="press rounded-[var(--radius-l)] border border-line bg-raised p-5 transition-colors hover:border-line-strong"
          >
            <span className="flex items-center gap-2 font-medium text-ink-strong">
              {w.title}
              <Icon name="arrow-right" size={15} />
            </span>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">{w.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Einrichtung({ maengel }: { maengel: Mangel[] }) {
  if (maengel.length === 0) return null;
  return (
    <section>
      <h2 className="text-title">Einrichtung</h2>
      <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
        Beides fällt im Betrieb erst auf, wenn ein Kunde davorsteht – deshalb
        steht es hier.
      </p>
      <ul className="mt-5 space-y-3">
        {maengel.map((m) => (
          <li
            key={m.href + m.text}
            className="rounded-[var(--radius-m)] border border-line bg-sunken p-4"
          >
            <p className="font-medium text-warn">{m.text}</p>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
              {m.hinweis}
            </p>
            <Link
              href={m.href}
              className="mt-2 inline-block text-[0.875rem] font-medium text-accent underline-offset-4 hover:underline"
            >
              Jetzt nachholen
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
