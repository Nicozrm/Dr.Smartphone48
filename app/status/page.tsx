import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { TicketLookup } from "@/components/status/TicketLookup";
import { pageMeta } from "@/lib/seo";
import { hasTicketBackend } from "@/lib/supabase/env";
import { site } from "@/lib/site";

/*
  Der Eingang zur Statusverfolgung – für alle, die den Link nicht mehr haben.

  Diese Seite ist eine Server-Komponente ohne jede Datenabfrage. Sie steht
  auch dann, wenn kein Backend eingerichtet ist, und sie steht im statischen
  Export. Nur das Eingabefeld ist ein kleines Client-Bündel.

  Ohne Vorgangsverwaltung bleibt das Eingabefeld weg. Ein Formular, das eine
  Nummer entgegennimmt und dann auf eine Seite führt, die es in diesem Build
  gar nicht gibt, wäre schlimmer als der ehrliche Satz „gibt es hier nicht,
  rufen Sie an“.
*/

export const metadata = pageMeta({
  path: "/status",
  title: "Reparaturstatus verfolgen",
  description:
    "Vorgangsnummer eingeben und sehen, wo Ihre Reparatur steht – Zustand, Zeitleiste und Auftrag, ohne Konto.",
  // Nichts zu indexieren: ohne Nummer ist die Seite ein leeres Formular.
  noindex: true,
});

const steps = [
  {
    icon: "search" as const,
    title: "Nummer eingeben",
    text: "Acht Zeichen, in der Mitte getrennt. Sie steht auf dem Übergabeprotokoll und in der Bestätigung.",
  },
  {
    icon: "waveform" as const,
    title: "Zustand sehen",
    text: "Wo das Gerät steht, was schon passiert ist und was noch kommt – mit Zeitpunkten, keine Schätzungen.",
  },
  {
    icon: "sparkle" as const,
    title: "Nachricht bekommen",
    text: "Wenn Sie bei der Anmeldung einen Weg gewählt haben, melden wir uns – spätestens, wenn das Gerät fertig ist.",
  },
];

export default function StatusPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <Reveal className="max-w-2xl">
        <p className="text-eyebrow">Reparaturstatus</p>
        <h1 className="text-display mt-4">
          Wo steht
          <br />
          mein Gerät?
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Geben Sie Ihre Vorgangsnummer ein. Sie sehen dieselbe Zeitleiste, die
          bei uns in der Werkstatt hängt – nur ohne die internen Vermerke.
        </p>
      </Reveal>

      <Reveal className="mt-12" delay={80}>
        {hasTicketBackend() ? (
          <TicketLookup />
        ) : (
          <div className="max-w-xl rounded-[var(--radius-m)] border border-line bg-sunken p-5">
            <p className="text-[0.9375rem] font-medium text-ink-strong">
              Die Statusverfolgung ist hier nicht eingerichtet.
            </p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
              Auf dieser Installation der Website gibt es keine
              Vorgangsverwaltung. Rufen Sie uns an – mit Namen und Gerät finden
              wir Ihre Reparatur in Sekunden.
            </p>
          </div>
        )}
      </Reveal>

      <Reveal className="mt-16 md:mt-20" delay={140}>
        <ul className="grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.title}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-soft">
                <Icon name={step.icon} size={20} />
              </span>
              <p className="mt-4 text-[0.9375rem] font-medium text-ink-strong">
                {step.title}
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">
                {step.text}
              </p>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="mt-16" delay={200}>
        <div className="rounded-[var(--radius-l)] border border-line bg-sunken p-6 md:p-8">
          <h2 className="text-title">Nummer verlegt?</h2>
          <p className="mt-2.5 max-w-prose leading-relaxed text-ink-soft">
            Rufen Sie an – mit Namen und Gerät finden wir den Vorgang in
            Sekunden. Ein neues Ticket brauchen Sie dafür nicht.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href={site.phoneHref}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              <Icon name="phone" size={16} />
              {site.phone}
            </a>
            <Link
              href="/reparatur"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
            >
              Neuen Vorgang anlegen
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
