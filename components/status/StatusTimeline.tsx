import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/lib/format";
import {
  TICKET_STATUSES,
  statusIndex,
  ticketStatusMeta,
  type TicketStatus,
} from "@/lib/tickets/status";
import type { PublicHistoryEntry } from "@/lib/tickets/types";

/*
  Die Zeitleiste – acht Schritte, und ehrlich darüber, welche davon schon
  stattgefunden haben.

  Zwei Entscheidungen, die den Unterschied machen:

  – **Alle acht Schritte stehen da, auch die künftigen.** Ein Fortschritt, der
    nur zeigt, wo man ist, beantwortet die eigentliche Frage nicht: Was kommt
    noch? Wer sieht, dass nach der Diagnose noch drei Schritte folgen, ruft
    nicht nach zwei Stunden an.
  – **Ein Zeitpunkt steht nur dort, wo er belegt ist.** Die Werkstatt kann
    Schritte überspringen (ein Gerät am Tresen geht direkt in die Reparatur).
    Übersprungene Schritte bekommen deshalb keinen erfundenen Zeitstempel,
    sondern gar keinen.

  Die Zeitangaben sind absolut, nicht relativ („vor 3 Stunden"). Eine relative
  Angabe müsste im Browser gerechnet werden und wäre beim ersten Rendern
  entweder falsch oder leer. Absolut steht sie sofort und bleibt richtig.
*/

interface Step {
  status: TicketStatus;
  reached: boolean;
  current: boolean;
  at: string | null;
  note: string | null;
}

function buildSteps(
  status: TicketStatus,
  history: PublicHistoryEntry[],
): Step[] {
  const current = statusIndex(status);

  // Der jeweils **letzte** Eintrag je Zustand: Wurde ein Schritt korrigiert
  // und erneut gesetzt, gilt der zweite Zeitpunkt.
  const seen = new Map<TicketStatus, PublicHistoryEntry>();
  for (const entry of history) {
    seen.set(entry.newStatus, entry);
  }

  return TICKET_STATUSES.map((step, index) => {
    const entry = seen.get(step);
    return {
      status: step,
      reached: index <= current,
      current: index === current,
      at: entry?.createdAt ?? null,
      note: entry?.note ?? null,
    };
  });
}

export function StatusTimeline({
  status,
  history,
}: {
  status: TicketStatus;
  history: PublicHistoryEntry[];
}) {
  const steps = buildSteps(status, history);

  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const meta = ticketStatusMeta[step.status];
        const last = index === steps.length - 1;

        return (
          <li key={step.status} className="relative flex gap-4 pb-7 last:pb-0">
            {/* Die Linie zum nächsten Schritt. Sie endet am letzten Punkt,
                statt ins Leere zu laufen. */}
            {last ? null : (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px ${
                  step.reached && !step.current ? "bg-accent/35" : "bg-line"
                }`}
              />
            )}

            <span
              aria-hidden="true"
              className={`relative z-10 mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border transition-colors duration-[var(--duration-base)] ${
                step.current
                  ? "border-accent bg-accent text-accent-contrast"
                  : step.reached
                    ? "border-accent/40 bg-accent-subtle text-accent"
                    : "border-line bg-raised text-ink-faint"
              }`}
            >
              {step.reached && !step.current ? (
                <Icon name="check" size={14} />
              ) : (
                <Icon name={meta.icon} size={14} />
              )}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p
                  className={`text-[0.9375rem] font-medium ${
                    step.reached ? "text-ink-strong" : "text-ink-faint"
                  }`}
                >
                  {meta.label}
                  {step.current ? (
                    <span className="ml-2 align-middle text-[0.75rem] font-normal text-accent">
                      jetzt
                    </span>
                  ) : null}
                </p>
                {step.at ? (
                  <time
                    dateTime={step.at}
                    className="font-mono text-[0.75rem] text-ink-faint"
                  >
                    {formatDateTime(step.at)}
                  </time>
                ) : null}
              </div>

              {step.current ? (
                <p className="mt-1.5 max-w-prose text-[0.875rem] leading-relaxed text-ink-soft">
                  {meta.customerHint}
                </p>
              ) : null}

              {step.note ? (
                <p className="mt-2 max-w-prose rounded-[var(--radius-s)] border border-line bg-sunken px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-ink">
                  {step.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
