"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/status/StatusBadge";
import { StatusControl } from "./StatusControl";
import { fetchWorkshopTicket, patchTicket, type TicketPatch } from "@/lib/api/client";
import { formatDateTime, formatEuro, formatMinutes } from "@/lib/format";
import { certHref, invoiceHref } from "@/lib/intern/prefill";
import { maskImei, publicNote } from "@/lib/tickets/public-view";
import { statusPath, statusUrl } from "@/lib/tickets/links";
import { ticketStatusMeta, type TicketStatus } from "@/lib/tickets/status";
import type { RepairTicket, TicketHistoryEntry } from "@/lib/tickets/types";

/*
  Die Akte.

  Hier steht alles, was gespeichert ist – und nur hier. Die Liste daneben
  kommt ohne Kontaktdaten und ohne Vermerke aus; wer sie sehen will, öffnet
  ausdrücklich einen Vorgang.

  Die IMEI steht auch hier verkürzt. Die letzten vier Stellen genügen, um ein
  Gerät zuzuordnen; die vollständige Nummer braucht man beim Gerät in der
  Hand, und wer sie doch braucht, klappt sie auf. Ein Bildschirm, auf dem
  ständig eine vollständige IMEI steht, wird irgendwann fotografiert.
*/

export function TicketDetail({
  ticketCode,
  onChanged,
  onClose,
}: {
  ticketCode: string;
  /** Meldet einen Statuswechsel nach oben, damit die Liste sofort umspringt. */
  onChanged: (ticketCode: string, status: TicketStatus, statusChangedAt: string) => void;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [phase, setPhase] = useState<"laedt" | "da" | "fehler">("laedt");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [notes, setNotes] = useState("");
  const [showImei, setShowImei] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  /* Laden – abgebrochen, wenn schnell weitergeklickt wird. */
  useEffect(() => {
    const controller = new AbortController();
    setPhase("laedt");
    setShowImei(false);

    void (async () => {
      const result = await fetchWorkshopTicket(ticketCode, controller.signal);
      if (controller.signal.aborted) return;

      if (result.ok) {
        setTicket(result.data.ticket);
        setHistory(result.data.history);
        setNotes(result.data.ticket.internalNotes ?? "");
        setPhase("da");
        return;
      }
      setError(result.error);
      setPhase("fehler");
    })();

    return () => controller.abort();
  }, [ticketCode]);

  const send = async (patch: TicketPatch, successText: string) => {
    setBusy(true);
    setError("");
    const result = await patchTicket(ticketCode, patch);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTicket(result.data.ticket);
    setHistory(result.data.history);
    setNotes(result.data.ticket.internalNotes ?? "");
    onChanged(
      ticketCode,
      result.data.ticket.status,
      result.data.ticket.statusChangedAt,
    );

    const notified = result.data.notified;
    setFlash(
      notified
        ? notified.startsWith("fehlgeschlagen")
          ? `${successText} · Nachricht ${notified}`
          : `${successText} · Nachricht per ${notified} verschickt`
        : successText,
    );
    window.setTimeout(() => setFlash(""), 4000);
  };

  if (phase === "laedt") {
    return (
      <div
        className="h-[28rem] animate-pulse rounded-[var(--radius-m)] border border-line bg-sunken"
        aria-busy="true"
      />
    );
  }

  if (phase === "fehler" || !ticket) {
    return (
      <div className="rounded-[var(--radius-m)] border border-line bg-raised p-6">
        <p className="text-[0.9375rem] text-ink-strong">Die Akte lässt sich nicht laden.</p>
        <p className="mt-2 text-[0.875rem] text-ink-soft">{error}</p>
      </div>
    );
  }

  const notesChanged = (ticket.internalNotes ?? "") !== notes;

  return (
    <div className="rounded-[var(--radius-m)] border border-line bg-raised">
      {/* Kopf */}
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <p className="font-mono text-[0.8125rem] text-ink-faint">{ticket.ticketCode}</p>
          <h2 className="text-title mt-1 truncate">{ticket.customer}</h2>
          <p className="mt-1 truncate text-[0.875rem] text-ink-soft">{ticket.device}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={ticket.status} size="s" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Akte schließen"
            title="Schließen (Esc)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink-strong"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-7 p-5">
        {flash ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-[var(--radius-s)] border border-[color:var(--positive)]/25 bg-[color:var(--positive-subtle)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[color:var(--positive)]"
          >
            <Icon name="check" size={15} className="mt-0.5 shrink-0" />
            <span>{flash}</span>
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[var(--radius-s)] border border-[color:var(--danger)]/30 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed"
            style={{ color: "var(--danger)" }}
          >
            <Icon name="close" size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        {/* Statuswechsel */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">Nächster Schritt</h3>
          <div className="mt-3">
            <StatusControl
              status={ticket.status}
              contactChannel={ticket.contactChannel}
              busy={busy}
              onApply={(next, note) =>
                send(
                  { status: next, ...(note ? { note } : {}) },
                  `Auf „${ticketStatusMeta[next].label}" gesetzt`,
                )
              }
            />
          </div>
        </section>

        {/* Auftrag */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">Auftrag</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {ticket.repairItems.map((item) => (
              <li key={item.kind} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="text-[0.875rem] text-ink-strong">{item.label}</span>
                <span className="shrink-0 font-mono text-[0.875rem] text-ink-soft">
                  {formatEuro(item.price)} · {formatMinutes(item.minutes)}
                </span>
              </li>
            ))}
            {ticket.repairItems.length === 0 ? (
              <li className="py-2.5 text-[0.875rem] text-ink-soft">Nur Diagnose.</li>
            ) : null}
          </ul>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[0.875rem] font-medium text-ink-strong">Festpreis</span>
            <span className="font-mono text-lg font-semibold text-ink-strong">
              {formatEuro(ticket.totalPrice)}
            </span>
          </div>
        </section>

        {/* Weiter im Arbeitsweg */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">Weiter</h3>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-faint">
            Kunde, Gerät und IMEI werden übernommen – abgetippte Daten sind
            falsch getippte Daten. Was im Ziel schon ausgefüllt ist, bleibt
            stehen.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={invoiceHref({
                customer: ticket.customer,
                model: ticket.device,
                imei: ticket.imei ?? undefined,
              })}
              className="press inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[0.875rem] font-medium text-ink-strong"
            >
              Rechnung schreiben
            </Link>
            <Link
              href={certHref({ model: ticket.device, batch: ticket.ticketCode })}
              className="press inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[0.875rem] font-medium text-ink-strong"
            >
              Zertifikat ausstellen
            </Link>
          </div>
        </section>

        {/* Kunde */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">Kunde</h3>
          <dl className="mt-3 space-y-2 text-[0.875rem]">
            <Field label="Telefon">
              {ticket.phone ? (
                <a href={`tel:${ticket.phone.replace(/\s/g, "")}`} className="text-accent hover:underline">
                  {ticket.phone}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="E-Mail">
              {ticket.email ? (
                <a href={`mailto:${ticket.email}`} className="text-accent hover:underline">
                  {ticket.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Nachrichten">
              {ticket.contactChannel === "none"
                ? "nicht gewünscht"
                : ticket.contactChannel}
            </Field>
            <Field label="IMEI">
              {ticket.imei ? (
                <button
                  type="button"
                  onClick={() => setShowImei((value) => !value)}
                  className="font-mono text-ink-strong underline decoration-line underline-offset-4 hover:decoration-ink-faint"
                  title={showImei ? "Verbergen" : "Vollständig anzeigen"}
                >
                  {showImei ? ticket.imei : maskImei(ticket.imei)}
                </button>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Angemeldet">{formatDateTime(ticket.createdAt)}</Field>
            <Field label="Einwilligung">{formatDateTime(ticket.consentAt)}</Field>
          </dl>

          {ticket.customerNote ? (
            <p className="mt-3 whitespace-pre-wrap rounded-[var(--radius-s)] border border-line bg-sunken px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-ink">
              {ticket.customerNote}
            </p>
          ) : null}

          <p className="mt-3 break-all text-[0.75rem] text-ink-faint">
            Statusseite:{" "}
            <a
              href={statusPath(ticket.ticketCode)}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {statusUrl(ticket.ticketCode, origin)}
            </a>
          </p>
        </section>

        {/* Interne Vermerke */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">
            Interne Vermerke
            <span className="ml-1.5 font-normal text-ink-faint">sieht kein Kunde</span>
          </h3>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Was der nächste Kollege wissen muss."
            className="mt-3 w-full rounded-[var(--radius-s)] border border-line bg-page px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-ink-strong placeholder:text-ink-faint transition-colors focus:border-accent"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !notesChanged}
              onClick={() => send({ internalNotes: notes }, "Vermerk gespeichert")}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.8125rem] font-medium text-ink-strong transition-colors hover:border-ink-strong disabled:opacity-40"
            >
              Speichern
            </button>
            {notesChanged ? (
              <span className="text-[0.75rem] text-ink-faint">nicht gespeichert</span>
            ) : null}
          </div>
        </section>

        {/* Zugesagte Fertigstellung */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">
            Fertigstellung zusagen
            <span className="ml-1.5 font-normal text-ink-faint">
              steht dann beim Kunden
            </span>
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              defaultValue={toLocalInput(ticket.estimatedReadyAt)}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                void send(
                  { estimatedReadyAt: new Date(value).toISOString() },
                  "Termin zugesagt",
                );
              }}
              className="h-10 rounded-[var(--radius-s)] border border-line bg-page px-3 text-[0.875rem] text-ink-strong transition-colors focus:border-accent"
            />
            {ticket.estimatedReadyAt ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => send({ estimatedReadyAt: null }, "Zusage zurückgenommen")}
                className="inline-flex h-10 items-center rounded-full border border-line px-3.5 text-[0.8125rem] text-ink-soft transition-colors hover:border-ink-faint hover:text-ink-strong disabled:opacity-40"
              >
                Zurücknehmen
              </button>
            ) : null}
          </div>
        </section>

        {/* Historie */}
        <section>
          <h3 className="text-[0.875rem] font-medium text-ink-strong">Verlauf</h3>
          <ol className="mt-3 space-y-2.5">
            {[...history].reverse().map((entry) => (
              <li key={entry.id} className="flex gap-3 text-[0.8125rem]">
                <time
                  dateTime={entry.createdAt}
                  className="w-[9.5rem] shrink-0 font-mono text-ink-faint"
                >
                  {formatDateTime(entry.createdAt)}
                </time>
                <span className="min-w-0">
                  <span className="text-ink-strong">
                    {entry.oldStatus
                      ? `${ticketStatusMeta[entry.oldStatus].label} → ${ticketStatusMeta[entry.newStatus].label}`
                      : ticketStatusMeta[entry.newStatus].label}
                  </span>
                  {entry.changedBy ? (
                    <span className="text-ink-faint"> · {entry.changedBy}</span>
                  ) : null}
                  {entry.note ? (
                    <span className="mt-0.5 block text-ink-soft">
                      {entry.note}
                      {publicNote(entry.note) ? (
                        <span className="ml-1.5 text-accent">(beim Kunden sichtbar)</span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right text-ink-strong">{children}</dd>
    </div>
  );
}

/**
 * ISO → Wert für `datetime-local`.
 *
 * Das Feld erwartet Ortszeit ohne Zone. `toISOString()` liefert UTC – daraus
 * entstünde im Sommer eine Zusage zwei Stunden zu früh.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
