import { Icon } from "@/components/ui/Icon";
import { ticketStatusMeta, type TicketStatus } from "@/lib/tickets/status";

/*
  Das Abzeichen für einen Zustand.

  Die Farbrolle steht in `ticketStatusMeta` und wird hier auf die Tokens aus
  `app/globals.css` abgebildet – keine Ad-hoc-Farben, keine Ausnahmen. Die
  Töne sind zurückhaltend gewählt: Ein Reparaturvorgang ist kein Alarm, und
  eine Werkstattliste, in der alles leuchtet, zeigt nichts.

  Die Farbe steht nie allein. Jeder Zustand trägt seinen Namen im Klartext
  daneben – wer Rot und Grün nicht unterscheidet, liest dasselbe wie alle
  anderen.
*/

const tones = {
  neutral: "border-line bg-sunken text-ink-soft",
  accent: "border-accent/25 bg-accent-subtle text-accent",
  warn: "border-[color:var(--warn)]/25 bg-[color:var(--warn-subtle)] text-[color:var(--warn)]",
  positive:
    "border-[color:var(--positive)]/25 bg-[color:var(--positive-subtle)] text-[color:var(--positive)]",
} as const;

export function StatusBadge({
  status,
  size = "m",
  className = "",
}: {
  status: TicketStatus;
  size?: "s" | "m";
  className?: string;
}) {
  const meta = ticketStatusMeta[status];
  const metrics =
    size === "s"
      ? "h-7 gap-1.5 px-2.5 text-[0.75rem]"
      : "h-9 gap-2 px-3.5 text-[0.8125rem]";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border font-medium ${metrics} ${tones[meta.tone]} ${className}`}
    >
      <Icon name={meta.icon} size={size === "s" ? 13 : 15} />
      {meta.label}
    </span>
  );
}
