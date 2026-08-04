import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { site } from "@/lib/site";

/**
 * TrustBar – die vier Zahlen direkt neben dem Handlungsaufruf.
 *
 * Sie stehen dort, weil genau an dieser Stelle die Frage aufkommt, die über
 * den Klick entscheidet: „Kann ich denen mein Gerät geben?" Ein Sternebalken
 * beantwortet sie nicht – Sterne hat jeder. Zahlen mit Bezugsgröße schon.
 *
 * REDAKTIONSREGEL (siehe CLAUDE.md): Hier steht ausschließlich, was belegbar
 * ist und was aus lib/site.ts stammt. Kein „12.483 reparierte Geräte", keine
 * „97 % in 30 Minuten" – solche Zahlen wirken stark, bis ein Besucher sie mit
 * dem Google-Profil vergleicht, das zwei Sektionen tiefer auf derselben Seite
 * steht. Dann ist nicht nur die Zahl weg, sondern das Vertrauen.
 *
 * Serverkomponente ohne Zustand: Die Zeile steht im HTML und ist damit auch
 * ohne JavaScript und im Offline-Cache vollständig da.
 */
const items: { icon: IconName; value: string; label: string; href?: string }[] = [
  {
    icon: "sparkle",
    value: site.google.rating.toLocaleString("de-DE", { minimumFractionDigits: 1 }),
    label: `bei Google · ${site.google.reviewCount} Bewertungen`,
    href: "/#bewertungen",
  },
  {
    icon: "clock",
    value: "45 Min",
    label: "Displaytausch im Schnitt",
  },
  {
    icon: "cpu",
    value: `${site.checkpoints} Punkte`,
    label: "Prüfprotokoll vor der Übergabe",
  },
  {
    icon: "shield",
    value: `${site.warrantyMonths} Monate`,
    label: "Garantie auf Teil und Arbeit",
  },
];

export function TrustBar({ className = "" }: { className?: string }) {
  return (
    /*
      Auf dem Telefon zwei Spalten, ab sm eine Zeile. Vier untereinander
      gestapelte Belege sind eine Liste, die man liest – gemeint ist ein
      Blick, der sie aufnimmt, während der Daumen schon zur Schaltfläche
      unterwegs ist.
    */
    <ul
      className={`mx-auto grid max-w-4xl grid-cols-2 justify-center gap-x-2 gap-y-3 sm:flex sm:flex-wrap sm:items-stretch sm:gap-x-1 sm:gap-y-2 ${className}`}
    >
      {items.map((item) => {
        const body = (
          <>
            <Icon
              name={item.icon}
              size={15}
              className="mt-px shrink-0 text-ink-faint"
            />
            <span className="text-left">
              <span className="block font-mono text-[0.9375rem] font-medium leading-none tracking-tight text-ink-strong">
                {item.value}
              </span>
              <span className="mt-1 block text-[0.75rem] leading-snug text-ink-soft">
                {item.label}
              </span>
            </span>
          </>
        );
        return (
          <li key={item.label} className="flex">
            {item.href ? (
              <Link
                href={item.href}
                data-ripple="ink"
                className="press flex items-start gap-2.5 rounded-[var(--radius-m)] px-3 py-2 transition-colors duration-[var(--duration-fast)] hover:bg-sunken"
              >
                {body}
              </Link>
            ) : (
              <span className="flex items-start gap-2.5 px-3 py-2">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
