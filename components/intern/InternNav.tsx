import Link from "next/link";
import { INTERN_PAGES } from "@/lib/intern/pages";

/*
  Die Leiste über jeder internen Seite.

  Bis hierher waren die drei Werkzeuge Inseln: kein Weg zurück zur
  Übersicht, kein Weg zueinander. Wer nach dem Schreiben einer Rechnung ein
  Zertifikat ausstellen wollte, tippte die Adresse. Das ist der Unterschied
  zwischen vier Seiten und einem internen Bereich.

  **Server-Komponente, kein JavaScript.** Der aktuelle Pfad käme sonst über
  `usePathname`, und das macht aus jeder Seite, die die Leiste trägt, eine
  Client-Komponente. Stattdessen sagt jede Seite selbst, wo sie steht – sie
  weiß es ohnehin, und es kostet nichts.

  Die Leiste ist bewusst schmal und grau. Sie ist Wegweiser, nicht Werkzeug;
  auf einer Seite, auf der jemand arbeitet, darf die Navigation nicht um
  Aufmerksamkeit konkurrieren.
*/

export function InternNav({
  current,
  hasBackend = true,
}: {
  /** Pfad dieser Seite – für die Markierung. */
  current: string;
  /**
   * Gibt es eine Datenbank? Ohne sie entfällt die Werkstatt, statt auf eine
   * Seite zu zeigen, die nichts kann.
   */
  hasBackend?: boolean;
}) {
  const pages = INTERN_PAGES.filter((page) => hasBackend || !page.needsBackend);

  return (
    <nav
      aria-label="Interner Bereich"
      className="mx-auto mb-10 max-w-5xl px-6"
    >
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-line pb-3 text-[0.9375rem]">
        {pages.map((page) => {
          const active = page.href === current;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                // aria-current statt nur Farbe: Die Markierung muss auch
                // ankommen, wenn jemand die Seite vorgelesen bekommt.
                aria-current={active ? "page" : undefined}
                className={`inline-block rounded-[var(--radius-s)] px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-sunken font-medium text-ink-strong"
                    : "text-ink-soft hover:text-ink-strong"
                }`}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
