import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DisplayCompare } from "@/components/parts/DisplayCompare";
import { CrackTip } from "@/components/parts/CrackTip";
import { PwmDemo } from "@/components/parts/PwmDemo";
import { site } from "@/lib/site";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/ersatzteile",
  title: "Ersatzteile für Werkstätten",
  description:
    "Originalteile und geprüfte Komponenten für Werkstätten und Techniker – mit Eingangskontrolle, fairen Staffelpreisen und Versand am selben Tag.",
});

/** Garantieangaben immer aus den Stammdaten – siehe lib/site.ts. */
const warranty = `${site.warrantyMonths} Monate Garantie`;

const tiers: { name: string; description: string; features: string[] }[] = [
  {
    name: "Original",
    description: "Direkt vom Hersteller bezogen, mit voller Funktionsgarantie.",
    features: ["Herstellerqualität", "Volle Sensorik-Kompatibilität", warranty],
  },
  {
    name: "Originalqualität",
    description: "Baugleiche Komponenten aus zertifizierter Fertigung – unsere Empfehlung für die meisten Reparaturen.",
    features: ["Von uns einzeln geprüft", "Bestes Preis-Leistungs-Verhältnis", warranty],
  },
  {
    name: "Refurbished-Teile",
    description: "Aufbereitete Originalkomponenten – nachhaltig und budgetfreundlich.",
    features: ["100 % Original", "Funktionsgeprüft und dokumentiert", warranty],
  },
];

const services: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "check",
    title: "Eingangskontrolle statt Stichprobe",
    text: "Jedes Teil wird vor dem Versand einzeln geprüft – nicht chargenweise. Was die Kontrolle nicht besteht, geht zurück statt raus.",
  },
  {
    icon: "truck",
    title: "Versand am selben Tag",
    text: `Bestellungen bis 16 Uhr verlassen noch am selben Tag das Lager. In ${site.city} und Umgebung ist Abholung jederzeit während der Öffnungszeiten möglich.`,
  },
  {
    icon: "tool",
    title: "Technik-Support inklusive",
    text: "Fragen beim Einbau? Unsere Techniker helfen direkt – von Werkstatt zu Werkstatt, ohne Warteschleife.",
  },
];

export default function ErsatzteilePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Ersatzteile", path: "/ersatzteile" }])} />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Ersatzteile · B2B</p>
          <h1 className="text-display mt-4">
            Teile, denen wir selbst
            <br />
            vertrauen.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Wir verbauen täglich, was wir verkaufen. Werkstätten und Techniker
            beziehen bei uns dieselben geprüften Komponenten, mit denen wir
            unsere eigene {site.warrantyMonths}-Monats-Garantie absichern.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/kontakt" size="lg">
              Konditionen anfragen
              <Icon name="arrow-right" size={18} />
            </Button>
            <Button href={`mailto:${site.email}`} variant="secondary" size="lg">
              Teileliste senden
            </Button>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Qualitätsstufen"
            title="Drei Stufen. Keine Kompromisse."
            lede="Jede Stufe ist klar definiert und dokumentiert – Sie wissen immer exakt, was Sie verbauen."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {tiers.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 90}>
                <div className="flex h-full flex-col rounded-[var(--radius-l)] border border-line bg-page p-7">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
                    Stufe {i + 1}
                  </p>
                  <h2 className="text-title mt-2">{tier.name}</h2>
                  <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {tier.description}
                  </p>
                  <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-[0.9375rem] text-ink"
                      >
                        <Icon name="check" size={16} className="mt-1 shrink-0 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Der Unterschied, den man sonst erst nach zwei Wochen merkt */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <SectionHeading
          eyebrow="Original oder Nachbau"
          title={
            <>
              Den Unterschied sieht man nicht.
              <br />
              Man spürt ihn.
            </>
          }
          lede="Jede Werkstatt behauptet, gute Displays zu verbauen. Beweisen lässt sich das schwer – ein fremdes Panel kann Ihnen niemand auf Ihrem eigenen Bildschirm zeigen. Zwei Eigenschaften aber schon: die, die man am ersten Tag bemerkt, und die, die man erst nach zwei Wochen bemerkt."
        />
        <div className="mt-12">
          <DisplayCompare />
        </div>
        <Reveal>
          <div className="mt-6">
            <PwmDemo />
          </div>
        </Reveal>
      </section>

      {/*
        Die Spannungslinse steht bewusst auf dieser Seite und nicht bei den
        Reparaturen: Sie beantwortet, warum ein Deckglas überhaupt bricht –
        und damit auch, warum die Qualität des Glases eine Rolle spielt und
        eine Schutzfolie mehr bringt, als sie aussieht.
      */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Bruchmechanik"
            title={
              <>
                Es ist nie
                <br />
                nur ein Kratzer.
              </>
            }
            lede="Glas bricht nicht, weil es überall zu schwach wäre, sondern an einem Fehler: An dessen Spitze bündelt sich die Spannung wie Licht in einer Linse. Wie stark, hängt weniger an der Tiefe als an der Schärfe – und das erklärt, warum ein Display beim zweiten, harmloseren Sturz bricht."
          />
          <Reveal>
            <div className="mt-12">
              <CrackTip />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {services.map((service, i) => (
            <Reveal key={service.title} delay={i * 90}>
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
                  <Icon name={service.icon} size={22} />
                </span>
                <h2 className="text-title mt-5">{service.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{service.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        </div>
      </section>
    </>
  );
}
