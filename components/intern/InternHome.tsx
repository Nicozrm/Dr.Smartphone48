"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { WorkshopLogin } from "@/components/workshop/WorkshopLogin";
import { useWorkshopTickets } from "@/lib/workshop/useWorkshopTickets";
import { hasTicketBackend } from "@/lib/supabase/env";
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

  Diese Seite ersetzt keines der drei. Sie beantwortet die Frage, die man
  morgens zuerst hat („was liegt an?"), und führt dann dorthin, wo man sie
  bearbeitet. Das Werkstatt-Dashboard bleibt der Ort, an dem Vorgänge
  bewegt werden; hier wird nur gezählt und verwiesen.

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

/** Mit Datenbank: erst anmelden, dann zählen. */
function MitBackend() {
  const maengel = useEinrichtung();

  // Nur zählen, nicht anzeigen: Es geht um die Zahl je Status, nicht um die
  // Liste. Die steht im Dashboard – hier wäre sie eine zweite Fassung
  // derselben Ansicht, die auseinanderläuft.
  const query = useMemo(
    () => ({ search: "", statuses: [...OPEN_STATUSES], sort: "bewegung", limit: 200 }),
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
  const zaehlung = new Map<TicketStatus, number>();
  for (const item of items) {
    zaehlung.set(item.status, (zaehlung.get(item.status) ?? 0) + 1);
  }
  const offen = items.length;
  const abholbereit = zaehlung.get("ready_for_pickup") ?? 0;

  return (
    <Rahmen>
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
              {abholbereit > 0
                ? `, davon ${abholbereit} abholbereit`
                : ""}
              .
            </p>
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
