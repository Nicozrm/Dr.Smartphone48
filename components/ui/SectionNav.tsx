"use client";

import { useEffect, useRef, useState } from "react";

/*
  Die Sprungleiste.

  Auf /check stehen elf Instrumente untereinander, jedes mit eigener
  Bedienung und eigenem Befund. Wer das dritte sucht, scrollt daran vorbei;
  wer beim neunten steht, weiß nicht mehr, was es außerdem gibt. Eine Seite,
  deren Inhalt man nur sequenziell erreicht, ist ein Band, kein Werkzeugkasten.

  Die Leiste macht daraus einen Kasten: Sie zeigt **alles**, was da ist, und
  wo man gerade steht.

  Vier Entscheidungen:

  – **Sie klebt unter der Kopfzeile, nicht darüber.** `top-16` ist exakt deren
    Höhe. Zwei schwebende Leisten übereinander wären eine Wand; so ist es
    eine Zeile, die mitläuft.
  – **Ohne JavaScript funktioniert sie trotzdem.** Es sind Sprungmarken –
    also Verweise auf Anker im selben Dokument. Der Browser kann das seit
    1993. JavaScript fügt nur hinzu, welcher davon gerade gilt.
  – **Der aktive Punkt fährt ins Bild.** Auf einem Telefon passen drei von
    zwölf Punkten nebeneinander; ohne Nachführung stünde die Markierung
    zuverlässig außerhalb des Sichtbaren, und die Leiste zeigte alles außer
    dem, wo man ist. Nachgeführt wird nur waagerecht (`block: "nearest"`) –
    ein `scrollIntoView` ohne diese Einschränkung nimmt die ganze Seite mit
    und macht aus dem Nachführen einen Sprung.
  – **`aria-current="location"`, nicht `page`.** Der Punkt führt nicht auf
    eine andere Seite; er benennt die Stelle innerhalb dieser. Vorlesehilfen
    unterscheiden das, und `page` wäre an dieser Stelle schlicht falsch.

  Der Beobachter arbeitet mit einem schmalen Band statt einer Schwelle: Das
  Fenster wird oben um die Kopfzeile plus Leiste und unten auf ein Drittel
  eingezogen. Ohne den unteren Einzug gilt jeder Abschnitt als aktiv, sobald
  er irgendwo im Bild auftaucht – und bei elf hohen Werkzeugen wären das
  ständig zwei gleichzeitig.
*/

export type SectionNavItem = {
  /** Ankername ohne #. Muss als id im Dokument stehen. */
  id: string;
  label: string;
};

export function SectionNav({
  items,
  label = "Abschnitte dieser Seite",
}: {
  items: SectionNavItem[];
  label?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    /*
      Der oberste Abschnitt im Band gewinnt.

      `entry.isIntersecting` allein reicht nicht: Bei elf Werkzeugen liegen
      regelmäßig zwei im Band, und welcher davon zuletzt gemeldet wurde,
      entscheidet die Reihenfolge der Einträge – nicht die Position. Also
      wird bei jedem Anstoß die ganze Liste befragt und der oberste
      sichtbare genommen.
    */
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = items.find((item) => visible.has(item.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-140px 0px -66% 0px" },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  // Den aktiven Punkt waagerecht nachführen – siehe oben.
  useEffect(() => {
    if (!active || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-for="${active}"]`);
    el?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <nav
      className="section-nav glass-sheet sticky top-16 z-30 -mx-5 md:-mx-8"
      aria-label={label}
      data-print="hide"
    >
      <ul
        ref={listRef}
        className="section-nav-list mx-auto flex max-w-3xl gap-1 overflow-x-auto px-5 py-2 md:px-8"
      >
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              data-for={item.id}
              data-active={active === item.id ? "true" : undefined}
              aria-current={active === item.id ? "location" : undefined}
              className="section-nav-item"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
