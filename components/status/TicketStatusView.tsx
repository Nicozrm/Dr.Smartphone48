"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "./StatusBadge";
import { StatusTimeline } from "./StatusTimeline";
import { fetchPublicTicket } from "@/lib/api/client";
import { useStatusChannel } from "@/lib/realtime/useStatusChannel";
import { ticketTopic } from "@/lib/realtime/topics";
import { hasTicketBackend } from "@/lib/supabase/env";
import { formatDateTime, formatEuro, formatMinutes, formatSince } from "@/lib/format";
import {
  isClosed,
  isTicketStatus,
  statusProgress,
  ticketStatusMeta,
} from "@/lib/tickets/status";
import type { PublicTicket } from "@/lib/tickets/types";
import { site } from "@/lib/site";

/*
  Die Statusseite eines Vorgangs.

  Sie tut genau zwei Dinge: einmal laden und dann zuhören. Kein Intervall,
  kein „alle 30 Sekunden nachfragen" – die Datenbank meldet sich, wenn sich
  etwas ändert, und nur dann.

  Der Rundruf trägt vier Felder (Code, Zustand, zwei Zeitstempel), mehr nicht.
  Das reicht, um die Seite sofort umzuschalten, und ist zu wenig für die
  Zeitleiste. Deshalb der Zweischritt: erst den neuen Zustand anzeigen, dann
  im Hintergrund die Historie nachladen. Der Kunde sieht die Änderung ohne
  Verzögerung, die Einzelheiten kommen einen Wimpernschlag später.

  Das Nachladen ist entprellt. Setzt jemand in der Werkstatt drei Zustände
  hintereinander, kommen drei Rundrufe – aber nur eine Anfrage.
*/

/** Wartezeit, bevor nach einem Rundruf nachgeladen wird. */
const REVALIDATE_DELAY = 700;

type Phase = "laedt" | "da" | "unbekannt" | "fehler" | "kein-backend";

export function TicketStatusView({ ticketCode }: { ticketCode: string }) {
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [phase, setPhase] = useState<Phase>(
    hasTicketBackend() ? "laedt" : "kein-backend",
  );
  const [message, setMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);

  // Läuft gerade eine Anfrage? Verhindert, dass ein Rundruf während des
  // ersten Ladens eine zweite anstößt.
  const inFlight = useRef(false);
  const revalidateTimer = useRef<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await fetchPublicTicket(ticketCode, signal);
        if (signal?.aborted) return;

        if (result.ok) {
          setTicket(result.data.ticket);
          setPhase("da");
          setNow(Date.now());
          return;
        }
        if (result.status === 404 || result.status === 400) {
          setPhase("unbekannt");
          return;
        }
        setMessage(result.error);
        setPhase("fehler");
      } finally {
        inFlight.current = false;
      }
    },
    [ticketCode],
  );

  useEffect(() => {
    if (!hasTicketBackend()) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /* Der Rundruf: erst umschalten, dann entprellt nachladen. */
  const onBroadcast = useCallback(
    (payload: { status: string; statusChangedAt: string; updatedAt: string }) => {
      if (!isTicketStatus(payload.status)) return;

      setTicket((current) =>
        current
          ? {
              ...current,
              status: payload.status as PublicTicket["status"],
              progress: statusProgress(payload.status as PublicTicket["status"]),
              statusChangedAt: payload.statusChangedAt,
              updatedAt: payload.updatedAt,
            }
          : current,
      );
      setNow(Date.now());

      if (revalidateTimer.current !== null) {
        window.clearTimeout(revalidateTimer.current);
      }
      revalidateTimer.current = window.setTimeout(() => {
        revalidateTimer.current = null;
        void load();
      }, REVALIDATE_DELAY);
    },
    [load],
  );

  useEffect(
    () => () => {
      if (revalidateTimer.current !== null) {
        window.clearTimeout(revalidateTimer.current);
      }
    },
    [],
  );

  const channelState = useStatusChannel(
    phase === "da" ? ticketTopic(ticketCode) : null,
    onBroadcast,
  );

  if (phase === "kein-backend") return <NoBackend ticketCode={ticketCode} />;
  if (phase === "laedt") return <Skeleton />;
  if (phase === "unbekannt") return <Unknown ticketCode={ticketCode} />;
  if (phase === "fehler" || !ticket) {
    return (
      <Notice
        title="Der Vorgang lässt sich gerade nicht laden."
        text={message || "Bitte in einem Moment erneut versuchen."}
        action={
          <button
            type="button"
            onClick={() => {
              setPhase("laedt");
              void load();
            }}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            Erneut versuchen
          </button>
        }
      />
    );
  }

  const meta = ticketStatusMeta[ticket.status];
  const percent = Math.round(ticket.progress * 100);

  return (
    <div className="space-y-10 md:space-y-14">
      {/* ---- Kopf: Zustand, Fortschritt ---------------------------------- */}
      <section className="overflow-hidden rounded-[var(--radius-l)] border border-line bg-raised shadow-raised">
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-eyebrow">Vorgang {ticket.ticketCode}</p>
              <h2 className="text-headline mt-3 break-words">{ticket.device}</h2>
            </div>
            <StatusBadge status={ticket.status} />
          </div>

          <p className="mt-5 max-w-prose leading-relaxed text-ink-soft">
            {meta.customerHint}
          </p>

          {/* Der Fortschritt zählt Schritte, keine Zeit – deshalb steht die
              Zahl auch daneben, statt eine Genauigkeit vorzutäuschen. */}
          <div className="mt-8">
            <div className="flex items-baseline justify-between text-[0.8125rem] text-ink-soft">
              <span>
                Schritt {Math.round(ticket.progress * 7) + 1} von 8
              </span>
              <span className="font-mono">{percent} %</span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Fortschritt der Reparatur"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-[var(--duration-area)] ease-[var(--ease-out)]"
                style={{ width: `${Math.max(percent, 3)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-sunken px-6 py-4 text-[0.8125rem] text-ink-soft md:px-9">
          <LiveDot state={channelState} />
          <span>
            Zuletzt geändert:{" "}
            <time dateTime={ticket.statusChangedAt} className="text-ink-strong">
              {formatDateTime(ticket.statusChangedAt)}
            </time>
            {now ? (
              <span className="text-ink-faint">
                {" "}
                · {formatSince(ticket.statusChangedAt, now)}
              </span>
            ) : null}
          </span>
        </div>
      </section>

      {/* ---- Zeitleiste --------------------------------------------------- */}
      <section>
        <h3 className="text-title">Der Weg durch die Werkstatt</h3>
        <p className="mt-2.5 max-w-prose leading-relaxed text-ink-soft">
          Acht Schritte, von denen wir manche überspringen, wenn es schneller
          geht. Ein Zeitpunkt steht nur dort, wo wirklich etwas passiert ist.
        </p>
        <div className="mt-8">
          <StatusTimeline status={ticket.status} history={ticket.history} />
        </div>
      </section>

      {/* ---- Auftrag ------------------------------------------------------ */}
      <section className="rounded-[var(--radius-l)] border border-line bg-sunken p-6 md:p-8">
        <h3 className="text-title">Der Auftrag</h3>

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {ticket.repairItems.map((item) => (
            <li
              key={item.kind}
              className="flex items-baseline justify-between gap-6 py-3"
            >
              <span className="text-[0.9375rem] text-ink-strong">{item.label}</span>
              <span className="shrink-0 font-mono text-[0.9375rem] text-ink-strong">
                {item.price === 0 ? "kostenlos" : formatEuro(item.price)}
              </span>
            </li>
          ))}
          {ticket.repairItems.length === 0 ? (
            <li className="py-3 text-[0.9375rem] text-ink-soft">
              Nur Diagnose – wir melden uns mit dem Befund, bevor etwas
              geschieht.
            </li>
          ) : null}
        </ul>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-[0.9375rem] font-medium text-ink-strong">
            Festpreis
          </span>
          <span className="font-mono text-2xl font-semibold tracking-tight text-ink-strong">
            {formatEuro(ticket.totalPrice)}
          </span>
        </div>

        <dl className="mt-6 grid gap-x-10 gap-y-3 text-[0.875rem] sm:grid-cols-2">
          <Row label="Angemeldet" value={formatDateTime(ticket.createdAt)} />
          <Row
            label="Veranschlagte Arbeitszeit"
            value={formatMinutes(ticket.estimatedMinutes)}
          />
          <Row
            label="Fertigstellung"
            value={
              ticket.estimatedReadyAt
                ? formatDateTime(ticket.estimatedReadyAt)
                : "noch nicht zugesagt"
            }
          />
          <Row label="Garantie" value={`${site.warrantyMonths} Monate auf Teil und Arbeit`} />
        </dl>

        {/* Eine zugesagte Fertigstellung steht hier nur, wenn sie jemand
            gegeben hat. Eine gerechnete wäre eine erfundene Zahl. */}
        {ticket.estimatedReadyAt ? null : (
          <p className="mt-5 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
            <Icon name="clock" size={15} className="mt-0.5 shrink-0" />
            <span>
              Wir nennen einen Termin erst, wenn wir ihn halten können – in der
              Regel nach der Diagnose.
            </span>
          </p>
        )}
      </section>

      {/* ---- Fragen ------------------------------------------------------- */}
      <section className="rounded-[var(--radius-l)] border border-line bg-raised p-6 md:p-8">
        <h3 className="text-title">Etwas unklar?</h3>
        <p className="mt-2.5 max-w-prose leading-relaxed text-ink-soft">
          Nennen Sie einfach die Vorgangsnummer{" "}
          <span className="font-mono text-ink-strong">{ticket.ticketCode}</span> – dann
          haben wir Ihr Gerät sofort auf dem Schirm.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <a
            href={site.phoneHref}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            <Icon name="phone" size={16} />
            {site.phone}
          </a>
          <Link
            href="/kontakt"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            <Icon name="mail" size={16} />
            Nachricht schreiben
          </Link>
        </div>
        {isClosed(ticket.status) ? (
          <p className="mt-6 border-t border-line pt-5 text-[0.8125rem] leading-relaxed text-ink-soft">
            Dieser Vorgang ist abgeschlossen. Die Seite bleibt erreichbar,
            solange wir den Vorgang aufbewahren – für Rückfragen zur Garantie
            genügt die Nummer oben.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink-strong">{value}</dd>
    </div>
  );
}

/**
 * Der Verbindungspunkt.
 *
 * Er sagt die Wahrheit über den Kanal, statt immer „live" zu behaupten: Wer
 * im Zug sitzt und den Punkt grau sieht, weiß, dass er neu laden muss. Das
 * Pulsieren respektiert `prefers-reduced-motion` (siehe globals.css).
 */
function LiveDot({ state }: { state: "aus" | "verbindet" | "verbunden" | "gestoert" }) {
  const label =
    state === "verbunden"
      ? "Aktualisiert sich von selbst"
      : state === "verbindet"
        ? "Verbindet …"
        : state === "gestoert"
          ? "Verbindung unterbrochen"
          : "Nicht verbunden";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          state === "verbunden"
            ? "bg-[color:var(--positive)] motion-safe:animate-pulse"
            : state === "gestoert"
              ? "bg-[color:var(--warn)]"
              : "bg-ink-faint"
        }`}
      />
      <span>{label}</span>
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Vorgang wird geladen.</span>
      <div
        className="h-64 animate-pulse rounded-[var(--radius-l)] border border-line bg-sunken"
        aria-hidden="true"
      />
      <div
        className="h-80 animate-pulse rounded-[var(--radius-l)] border border-line bg-sunken"
        aria-hidden="true"
      />
    </div>
  );
}

function Notice({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-l)] border border-line bg-raised p-8 text-center md:p-12">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-soft">
        <Icon name="search" size={24} />
      </span>
      <h2 className="text-title mt-5">{title}</h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">{text}</p>
      {action}
    </div>
  );
}

function Unknown({ ticketCode }: { ticketCode: string }) {
  return (
    <Notice
      title="Zu dieser Nummer finden wir keinen Vorgang."
      text={`Bitte prüfen Sie die Schreibweise von ${ticketCode}. Die Nummer steht auf Ihrem Übergabeprotokoll und in der Bestätigung – acht Zeichen, in der Mitte getrennt.`}
      action={
        <Link
          href="/status"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
        >
          Nummer erneut eingeben
        </Link>
      }
    />
  );
}

/**
 * Ohne Backend gibt es nichts nachzuschlagen – und das sagt die Seite auch.
 * Ein Ladebalken, der nie endet, wäre die schlechtere Antwort.
 */
function NoBackend({ ticketCode }: { ticketCode: string }) {
  return (
    <Notice
      title="Die Statusverfolgung ist hier nicht eingerichtet."
      text={`Auf dieser Installation der Website gibt es keine Vorgangsverwaltung. Ihr Vorgang existiert deshalb nur auf Papier – rufen Sie uns unter ${site.phone} an und nennen Sie die Nummer ${ticketCode}.`}
      action={
        <a
          href={site.phoneHref}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          <Icon name="phone" size={16} />
          {site.phone}
        </a>
      }
    />
  );
}
