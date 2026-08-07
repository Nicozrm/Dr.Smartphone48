import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { RescueClock } from "@/components/emergency/RescueClock";
import { LiveStatus } from "@/components/sections/LiveStatus";
import { OfflineStock } from "@/components/pwa/OfflineStock";
import { emergencyScenarios } from "@/lib/data/emergency";
import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/notfall",
  title: "Notfall – die ersten Minuten",
  description:
    "Wasserschaden, gebrochenes Display, Gerät startet nicht, aufgeblähter Akku: was Sie sofort tun sollten und welche Fehler am meisten kosten. Ohne Anmeldung, auch offline lesbar.",
});

/*
  Notfall-Seite.

  Sie ist die einzige Seite dieses Auftritts, die keinen Verkauf im Sinn hat.
  Wer nachts sein Telefon aus der Spüle fischt, sucht keinen Anbieter,
  sondern eine Anweisung. Wenn er sie hier findet und nie zu uns kommt, hat
  die Seite trotzdem ihre Aufgabe erfüllt.

  Daraus folgen drei Entscheidungen gegen den üblichen Reflex:

  – Alle vier Protokolle stehen vollständig im HTML. Kein Umschalter, kein
    Zustand, keine Hydration nötig: Die Seite funktioniert ohne JavaScript,
    bei jedem Netz, und der Service Worker hält sie offline vor.
  – Die Verbote stehen vor den Geboten, weil der teuerste Fehler zuerst
    passiert.
  – Keine Panikfarben, kein Blinken. Wer erschrickt, liest schlechter.
*/

/*
  Strukturierte Daten: Jedes Protokoll ist eine HowTo mit nummerierten
  Schritten. Damit kann eine Suchmaschine die Anleitung direkt ausspielen –
  und wer im Notfall sucht, bekommt die ersten Schritte womöglich, ohne die
  Seite überhaupt zu öffnen. Das ist der Sinn der Sache.
*/
const howToJsonLd = {
  "@context": "https://schema.org",
  "@graph": emergencyScenarios.map((scenario) => ({
    "@type": "HowTo",
    "@id": `${site.url}/notfall#${scenario.id}-howto`,
    name: `${scenario.label}: ${scenario.headline}`,
    description: scenario.lede,
    inLanguage: "de-DE",
    step: scenario.doThis.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.detail,
      url: `${site.url}/notfall#${scenario.id}`,
    })),
  })),
};

export default function NotfallPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Soforthilfe</p>
          <h1 className="text-display mt-4">
            Erst durchatmen.
            <br />
            Dann das hier.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Vier Notfälle, vier Protokolle. Jeweils zuerst das, was Sie lassen
            sollten – denn der teuerste Fehler passiert meist in der ersten
            Minute. Sie brauchen dafür kein Konto und müssen nichts kaufen.
          </p>
        </Reveal>

        {/* Direktwahl – ohne Umweg über die Auswahl unten */}
        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap gap-2.5">
            <a
              href={site.phoneHref}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-ink-strong px-5 text-[0.9375rem] font-medium text-[var(--surface-page)] transition-opacity duration-[var(--duration-fast)] hover:opacity-90"
            >
              <Icon name="phone" size={17} />
              {site.phone}
            </a>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong"
            >
              WhatsApp
            </a>
            <a
              href={site.google.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong"
            >
              <Icon name="pin" size={17} />
              Route
            </a>
          </div>
        </Reveal>

        {/* Sprungmarken statt Umschalter: funktioniert ohne JavaScript */}
        <Reveal delay={160}>
          <nav
            aria-label="Notfälle"
            className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {emergencyScenarios.map((scenario) => (
              <a
                key={scenario.id}
                href={`#${scenario.id}`}
                className="group rounded-[var(--radius-m)] border border-line bg-raised p-5 transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-ink-faint hover:shadow-raised"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
                  <Icon name={scenario.icon} size={20} />
                </span>
                <span className="mt-4 block font-medium text-ink-strong">
                  {scenario.label}
                </span>
                <span className="mt-1 block text-[0.875rem] leading-snug text-ink-soft">
                  {scenario.teaser}
                </span>
              </a>
            ))}
          </nav>
        </Reveal>
      </section>

      {emergencyScenarios.map((scenario, index) => (
        <section
          key={scenario.id}
          id={scenario.id}
          className={`scroll-mt-20 border-t border-line ${
            index % 2 === 1 ? "bg-raised" : ""
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <Reveal className="max-w-2xl">
              <p className="flex items-center gap-2.5 text-eyebrow">
                <Icon name={scenario.icon} size={16} />
                {scenario.label}
              </p>
              <h2 className="text-headline mt-4">{scenario.headline}</h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                {scenario.lede}
              </p>
            </Reveal>

            <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
              {/* Zuerst die Verbote – der teuerste Fehler kommt zuerst */}
              <Reveal>
                <h3 className="flex items-center gap-2.5 text-title">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--danger-subtle)] text-[var(--danger)]">
                    <Icon name="close" size={15} />
                  </span>
                  Auf keinen Fall
                </h3>
                <ul className="mt-5 space-y-4">
                  {scenario.avoid.map((step) => (
                    <li
                      key={step.title}
                      className="border-l-2 border-[var(--danger)] pl-4"
                    >
                      <p className="font-medium text-ink-strong">{step.title}</p>
                      <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                        {step.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={80}>
                <h3 className="flex items-center gap-2.5 text-title">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-positive-subtle text-positive">
                    <Icon name="check" size={15} />
                  </span>
                  In dieser Reihenfolge
                </h3>
                <ol className="mt-5 space-y-4">
                  {scenario.doThis.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="mt-0.5 font-mono text-[0.8125rem] text-ink-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink-strong">
                          {step.title}
                        </span>
                        <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-soft">
                          {step.detail}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>

                {scenario.clock ? (
                  <div className="mt-8">
                    <RescueClock />
                  </div>
                ) : null}
              </Reveal>
            </div>

            <Reveal delay={120}>
              <p className="mt-12 max-w-3xl border-t border-line pt-6 leading-relaxed text-ink-soft">
                {scenario.outlook}
              </p>
            </Reveal>
          </div>
        </section>
      ))}

      {/*
        Der Offline-Vorrat, nachgesehen statt zugesagt.

        Diese Seite verspricht, ohne Netz zu funktionieren – die wichtigste
        Zusage der ganzen Website, weil jemand mit einem nassen Telefon oft
        kein Netz mehr hat. Und zugleich die einzige, die niemand glauben
        kann: Man merkt es erst, wenn es zu spät ist, sie zu prüfen.

        Deshalb steht hier ein Kassensturz aus dem echten Browserspeicher.
      */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <OfflineStock />
          </Reveal>
        </div>
      </section>

      {/* Abschluss: Verfügbarkeit und der Weg zu uns */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <Reveal>
              <h2 className="text-headline">Und wenn Sie unsicher sind?</h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Dann rufen Sie an. Ein Anruf kostet nichts und dauert zwei
                Minuten – und oft ist die Antwort, dass Sie gar nichts weiter
                tun müssen. Auch außerhalb der Öffnungszeiten können Sie uns
                schreiben; wir antworten als Erstes, wenn wir aufmachen.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link
                  href="/reparatur"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4.5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
                >
                  Festpreis nachsehen
                  <Icon name="arrow-right" size={16} />
                </Link>
                <Link
                  href="/check"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4.5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
                >
                  Gerät selbst prüfen
                </Link>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <LiveStatus />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
