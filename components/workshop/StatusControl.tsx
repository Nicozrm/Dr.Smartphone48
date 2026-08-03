"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  TICKET_STATUSES,
  canTransition,
  nextStatus,
  ticketStatusMeta,
  NOTIFYING_STATUSES,
  type TicketStatus,
} from "@/lib/tickets/status";
import { PUBLIC_NOTE_PREFIX } from "@/lib/tickets/public-view";
import type { ContactChannel } from "@/lib/tickets/types";

/*
  Der Statuswechsel.

  Der nächste Schritt ist ein großer Knopf, alles andere steht darunter. Das
  ist keine Bequemlichkeit, sondern die Fehlervermeidung: In neun von zehn
  Fällen ist der nächste Schritt gemeint, und eine Auswahlliste mit acht
  gleich aussehenden Einträgen lädt zum Verklicken ein.

  Zwei Dinge stehen sichtbar dabei, bevor gedrückt wird:

  – **ob eine Nachricht rausgeht.** Ein Statuswechsel, der ungefragt eine
    E-Mail auslöst, ist eine böse Überraschung – einmal pro Werkstattleben,
    und danach traut niemand mehr dem Dashboard.
  – **wer den Vermerk liest.** Ein Vermerk ist intern, außer er beginnt mit
    einem Pluszeichen. Das steht als Hinweis am Feld, nicht in einer
    Dokumentation.
*/

export function StatusControl({
  status,
  contactChannel,
  busy,
  onApply,
}: {
  status: TicketStatus;
  contactChannel: ContactChannel;
  busy: boolean;
  onApply: (next: TicketStatus, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const next = nextStatus(status);
  const others = TICKET_STATUSES.filter(
    (candidate) => candidate !== next && canTransition(status, candidate),
  );

  const willNotify = (target: TicketStatus) =>
    contactChannel !== "none" && NOTIFYING_STATUSES.includes(target);

  const apply = (target: TicketStatus) => {
    onApply(target, note.trim());
    setNote("");
    setOpen(false);
  };

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
          Vermerk zum Wechsel
          <span className="ml-1.5 font-normal text-ink-faint">optional</span>
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={`intern · mit ${PUBLIC_NOTE_PREFIX} am Anfang sieht ihn der Kunde`}
          maxLength={500}
          className="h-11 w-full rounded-[var(--radius-s)] border border-line bg-raised px-3.5 text-[0.875rem] text-ink-strong placeholder:text-ink-faint transition-colors duration-[var(--duration-fast)] focus:border-accent"
        />
      </label>

      {note.trim().startsWith(PUBLIC_NOTE_PREFIX) ? (
        <p className="mt-2 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-accent">
          <Icon name="check" size={14} className="mt-0.5 shrink-0" />
          <span>Dieser Vermerk steht auf der Statusseite des Kunden.</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {next ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => apply(next)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <Icon name={ticketStatusMeta[next].icon} size={16} />
            {ticketStatusMeta[next].label}
            {willNotify(next) ? (
              <span className="ml-1 rounded-full bg-[color:var(--accent-contrast)]/20 px-2 py-0.5 text-[0.6875rem]">
                sendet Nachricht
              </span>
            ) : null}
          </button>
        ) : (
          <p className="text-[0.875rem] text-ink-soft">
            Der Vorgang ist abgeschlossen – weiter geht es nicht.
          </p>
        )}

        {others.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.875rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            Anderer Schritt
            <Icon
              name="chevron-down"
              size={15}
              className={`transition-transform duration-[var(--duration-fast)] ${open ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul className="mt-3 grid gap-1.5">
          {others.map((candidate) => (
            <li key={candidate}>
              <button
                type="button"
                disabled={busy}
                onClick={() => apply(candidate)}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-s)] border border-line bg-raised px-3.5 py-2.5 text-left transition-colors duration-[var(--duration-fast)] hover:border-ink-faint disabled:opacity-60"
              >
                <span className="flex items-center gap-2.5 text-[0.875rem] text-ink-strong">
                  <Icon name={ticketStatusMeta[candidate].icon} size={15} />
                  {ticketStatusMeta[candidate].label}
                </span>
                <span className="text-[0.75rem] text-ink-faint">
                  {willNotify(candidate) ? "sendet Nachricht" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
