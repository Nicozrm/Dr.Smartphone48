"use client";

import { ticketStatusMeta, TICKET_STATUSES } from "@/lib/tickets/status";
import type { TicketStats } from "@/lib/tickets/types";
import type { TicketStatus } from "@/lib/tickets/status";

/*
  Die Zahlen über der Liste.

  Vier Kacheln, mehr nicht. Ein Dashboard, das zwölf Kennzahlen zeigt, wird
  gelesen wie eine Tapete. Diese vier beantworten die Fragen, die eine
  Werkstatt morgens tatsächlich hat: Wie viel liegt an? Was kann heute raus?
  Was ist neu? Wie lange dauert es bei uns eigentlich?

  Die Durchlaufzeit ist ein **Median** über die letzten fünfzig abgeschlossenen
  Vorgänge – und sie fehlt, solange es keinen einzigen gibt. Eine Kennzahl aus
  null Werten wäre erfunden, und erfundene Zahlen gibt es auf dieser Website
  nicht, auch nicht intern.
*/

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "accent" | "positive";
}) {
  const valueColor =
    tone === "accent"
      ? "text-accent"
      : tone === "positive"
        ? "text-[color:var(--positive)]"
        : "text-ink-strong";

  return (
    <div className="rounded-[var(--radius-m)] border border-line bg-raised px-4 py-3.5">
      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </p>
      <p className={`mt-1.5 font-mono text-2xl font-semibold tracking-tight ${valueColor}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[0.75rem] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function WorkshopStats({
  stats,
  onPickStatus,
}: {
  stats: TicketStats;
  onPickStatus: (status: TicketStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="In Arbeit"
          value={String(stats.active)}
          hint="noch nicht abholbereit"
          tone="accent"
        />
        <Tile
          label="Abholbereit"
          value={String(stats.readyForPickup)}
          hint="wartet auf den Kunden"
          tone="positive"
        />
        <Tile label="Heute angemeldet" value={String(stats.today)} />
        <Tile
          label="Durchlaufzeit"
          value={
            stats.medianTurnaroundHours === null
              ? "—"
              : stats.medianTurnaroundHours < 48
                ? `${stats.medianTurnaroundHours} h`
                : `${Math.round(stats.medianTurnaroundHours / 24)} Tage`
          }
          hint={
            stats.medianTurnaroundHours === null
              ? "noch kein abgeschlossener Vorgang"
              : "Median der letzten 50"
          }
        />
      </div>

      {/* Die Verteilung als Filterleiste: Wer eine Zahl sieht, will meistens
          genau diese Vorgänge sehen. */}
      <div className="flex flex-wrap gap-1.5">
        {TICKET_STATUSES.filter((status) => stats.byStatus[status] > 0).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onPickStatus(status)}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-line px-3 text-[0.75rem] text-ink-soft transition-colors duration-[var(--duration-fast)] hover:border-ink-faint hover:text-ink-strong"
          >
            {ticketStatusMeta[status].label}
            <span className="font-mono text-ink-strong">{stats.byStatus[status]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
