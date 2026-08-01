import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ResaleCalculator } from "@/components/resale/ResaleCalculator";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ankauf – was Ihr Gerät noch wert ist",
  description:
    "Sofortige Wertschätzung für Ihr Smartphone – mit offengelegter Rechnung statt Blackbox. Jeder Abzug mit Betrag und Begründung. Auszahlung nach Prüfung vor Ort.",
};

const promises = [
  {
    icon: "check" as const,
    title: "Die Rechnung, nicht nur die Zahl",
    text: "Jeder Posten steht einzeln da – Basiswert, Alter, Zustand, Speicher, Akku, Defekte. Sie können nachrechnen, und Sie sollen es auch.",
  },
  {
    icon: "shield" as const,
    title: "Ihre Daten löschen wir vor Ihren Augen",
    text: "Zurücksetzen und Kontotrennung passieren am Tresen, während Sie zusehen. Erst danach wechselt das Gerät den Besitzer.",
  },
  {
    icon: "leaf" as const,
    title: "Auch defekt hat einen Wert",
    text: "Geräte, deren Reparatur sich nicht mehr lohnt, nehmen wir zur fachgerechten Verwertung an. Kostenlos, auch ohne Ankauf.",
  },
];

export default function AnkaufPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Ankauf</p>
          <h1 className="text-display mt-4">
            Was Ihr Gerät
            <br />
            noch wert ist.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Andere Ankaufsrechner nennen eine Zahl und schweigen darüber, wie
            sie entstanden ist. Dieser zeigt die Rechnung – jeden Posten, jeden
            Abzug, mit Begründung. Auch die, die uns nicht schmeicheln.
          </p>
        </Reveal>

        <div className="mt-14 md:mt-20">
          <ResaleCalculator />
        </div>
      </section>

      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 md:grid-cols-3 md:gap-12">
            {promises.map((promise, i) => (
              <Reveal key={promise.title} delay={i * 90}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
                  <Icon name={promise.icon} size={22} />
                </span>
                <h2 className="text-title mt-5">{promise.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{promise.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeading
          eyebrow="Vor dem Termin"
          title="Drei Dinge, die den Ankauf in zehn Minuten erledigen."
          lede="Nichts davon ist Pflicht – wir machen es sonst gemeinsam vor Ort. Es geht nur schneller, wenn es schon erledigt ist."
        />
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              title: "Konto trennen",
              text: "Am Gerät abmelden und auf Werkseinstellungen zurücksetzen. Solange die Aktivierungssperre aktiv ist, kann niemand das Gerät ankaufen – auch wir nicht.",
            },
            {
              title: "Karten entnehmen",
              text: "SIM- und Speicherkarte gehören Ihnen und werden nicht mitverkauft. Prüfen Sie beide Schächte, bevor Sie losfahren.",
            },
            {
              title: "Ausweis einstecken",
              text: `Wir sind verpflichtet, jeden Ankauf zu dokumentieren. Ohne Ausweis dürfen wir nicht ankaufen – das ist keine Schikane, sondern die Regel, die den Handel mit gestohlenen Geräten unattraktiv macht.`,
            },
          ].map((step, i) => (
            <Reveal key={step.title} delay={i * 90} as="li">
              <span className="font-mono text-[0.8125rem] text-ink-faint">
                0{i + 1}
              </span>
              <div className="mt-3 h-px w-full bg-line" aria-hidden="true" />
              <h3 className="text-title mt-5">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{step.text}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120}>
          <p className="mt-14 max-w-2xl border-t border-line pt-8 leading-relaxed text-ink-soft">
            Alle Beträge auf dieser Seite sind Schätzungen aus unseren eigenen
            Ankaufswerten, keine Marktpreise und kein Angebot im rechtlichen
            Sinn. Was wir tatsächlich zahlen, sagen wir nach der Prüfung –
            und wenn wir weniger bieten als hier steht, erklären wir warum.
            Fragen vorab gern telefonisch unter{" "}
            <a
              href={site.phoneHref}
              className="font-medium text-ink-strong underline underline-offset-4"
            >
              {site.phone}
            </a>
            .
          </p>
        </Reveal>
      </section>
    </>
  );
}
