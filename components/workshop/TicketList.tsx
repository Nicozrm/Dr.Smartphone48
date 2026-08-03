"use client";

import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/status/StatusBadge";
import { formatEuro, formatSince } from "@/lib/format";
import type { TicketListItem } from "@/lib/tickets/types";

/*
  Die Liste.

  Eine Zeile ist ein Knopf, kein Verweis: Sie öffnet die Akte daneben, sie
  wechselt nicht die Seite. Die Tastaturbedienung läuft trotzdem – ein `button`
  ist fokussierbar, und die Auswahl steht in `aria-current`.

  Was in der Zeile steht, ist genau das, was am Tresen gefragt wird: Wer, was,
  wie weit, seit wann. Kontaktdaten und IMEI stehen bewusst **nicht** hier –
  eine Liste, die den halben Tag offen auf dem Tresen liegt, muss nicht die
  Telefonnummern aller Kunden zeigen.
*/

export function TicketList({
  items,
  selected,
  onSelect,
  now,
  loading,
}: {
  items: TicketListItem[];
  selected: string | null;
  onSelect: (ticketCode: string) => void;
  /** Zeitbezug für „seit"-Angaben. Kommt von außen, damit alle Zeilen ihn teilen. */
  now: number | null;
  loading: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-m)] border border-dashed border-line px-6 py-14 text-center">
        <p className="text-[0.9375rem] text-ink-soft">
          {loading ? "Wird geladen …" : "Kein Vorgang passt zu dieser Auswahl."}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-m)] border border-line bg-raised">
      {items.map((item) => {
        const active = item.ticketCode === selected;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.ticketCode)}
              aria-current={active ? "true" : undefined}
              className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors duration-[var(--duration-fast)] ${
                active ? "bg-accent-subtle" : "hover:bg-sunken"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-[0.8125rem] text-ink-faint">
                    {item.ticketCode}
                  </span>
                  <span className="truncate text-[0.9375rem] font-medium text-ink-strong">
                    {item.customer}
                  </span>
                  {item.hasInternalNotes ? (
                    <span
                      title="Interner Vermerk vorhanden"
                      className="inline-flex items-center text-ink-faint"
                    >
                      <Icon name="mail" size={13} />
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-soft">
                  {item.device}
                  {item.repairItems.length > 0
                    ? ` · ${item.repairItems.map((repair) => repair.label).join(", ")}`
                    : " · Diagnose"}
                </span>
              </span>

              <span className="hidden shrink-0 text-right sm:block">
                <span className="block font-mono text-[0.875rem] text-ink-strong">
                  {formatEuro(item.totalPrice)}
                </span>
                <span className="mt-0.5 block text-[0.75rem] text-ink-faint">
                  {now ? formatSince(item.statusChangedAt, now) : " "}
                </span>
              </span>

              <StatusBadge status={item.status} size="s" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
