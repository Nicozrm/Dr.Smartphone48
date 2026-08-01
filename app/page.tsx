import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DiagramShowcase } from "@/components/sections/DiagramShowcase";
import { ShaderField } from "@/components/experience/ShaderField";
import { DeviceExploded } from "@/components/experience/DeviceExploded";
import { XRay } from "@/components/experience/XRay";
import { RefurbishedCard } from "@/components/sections/RefurbishedCard";
import { Reviews } from "@/components/sections/Reviews";
import { refurbishedDevices } from "@/lib/data/refurbished";
import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/",
  title: `${site.name} – Handy-Reparatur in ${site.city}`,
  description: site.description,
  absoluteTitle: true,
});

const pillars: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "cpu",
    title: "Originalteile, geprüft",
    text: "Jedes Ersatzteil durchläuft vor dem Einbau unsere Eingangskontrolle. Was nicht unseren Maßstab erfüllt, wird nicht verbaut.",
  },
  {
    icon: "shield",
    title: `${site.warrantyMonths} Monate Garantie`,
    text: "Auf jede Reparatur, auf jedes Teil, auf unsere Arbeit. Tritt derselbe Fehler erneut auf, beheben wir ihn kostenfrei.",
  },
  {
    icon: "clock",
    title: "Fertig, während Sie warten",
    text: "Ein Displaytausch dauert bei uns im Schnitt 45 Minuten. Mit Termin kommt Ihr Gerät sofort auf den Werktisch.",
  },
];

const steps = [
  {
    title: "Preis berechnen",
    text: "Gerät und Schaden wählen – Ihr Festpreis erscheint sofort. Online, ohne Anruf, ohne Wartezeit.",
  },
  {
    title: "Vorbeikommen",
    text: "Mit Termin oder spontan. Ihr Gerät bleibt bei uns nie länger als nötig – und Ihre Daten bleiben unangetastet.",
  },
  {
    title: "Weiterleben",
    text: "Reparatur in Werkstattqualität, geprüft nach 40 Punkten. Bezahlt wird erst, wenn alles funktioniert.",
  },
];

/**
 * Kennzahlen der Startseite.
 *
 * Regel: Hier steht ausschließlich, was belegbar ist – dieselbe Redaktions-
 * regel wie in lib/data/reviews.ts. Zuvor standen an dieser Stelle „4,9 / 5 aus
 * über 2.100 Bewertungen“ und „12.480 Reparaturen seit 2019“. Das widersprach
 * dem echten Google-Aggregat, das zwei Sektionen weiter unten auf derselben
 * Seite steht (und das auch im JSON-LD ausgeliefert wird). Ein Besucher, der
 * beides sieht, glaubt keiner der beiden Zahlen mehr – und Google wertet die
 * Abweichung zwischen sichtbarem Text und strukturierten Daten ab.
 *
 * Die Bewertungszahl kommt daher aus denselben Stammdaten wie die
 * Bewertungssektion; die übrigen Werte sind Zusagen, die der Betrieb selbst
 * kontrolliert.
 */
const stats = [
  { value: "45 Min", label: "durchschnittlicher Displaytausch" },
  {
    value: site.google.rating.toLocaleString("de-DE", { minimumFractionDigits: 1 }),
    label: `von 5 Sternen bei Google – aus ${site.google.reviewCount} Bewertungen`,
  },
  { value: `${site.checkpoints}`, label: "Prüfpunkte vor jeder Übergabe" },
  { value: `${site.warrantyMonths} Mon.`, label: "Garantie auf Teil und Arbeit" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <ShaderField />
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-32 text-center md:px-8 md:pb-28 md:pt-44">
        <Reveal>
          <p className="text-eyebrow">Smartphone-Reparatur · {site.city}</p>
          <h1 className="text-display mx-auto mt-5 max-w-3xl">
            Reparatur, wie sie
            <br />
            sein sollte.
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
            Festpreis in Sekunden. Originalteile. {site.warrantyMonths} Monate
            Garantie. Die meisten Reparaturen erledigen wir, während Sie einen
            Kaffee trinken.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/reparatur" size="lg">
              Sofortpreis berechnen
              <Icon name="arrow-right" size={18} />
            </Button>
            <Button href="/refurbished" variant="secondary" size="lg">
              Refurbished entdecken
            </Button>
          </div>
        </Reveal>
        <Reveal delay={220}>
          <p className="mt-12 font-mono text-[0.8125rem] tracking-wide text-ink-faint">
            Kostenlose Diagnose · Festpreisgarantie · Zahlung erst nach der Reparatur
          </p>
        </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-16 md:grid-cols-3 md:gap-12 md:px-8 md:py-20">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 90}>
              <div className="py-6 md:py-0">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
                  <Icon name={pillar.icon} size={22} />
                </span>
                <h2 className="text-title mt-5">{pillar.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{pillar.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Signature Feature */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Sofortpreis-Rechner"
              title={
                <>
                  Sie sehen den Preis,
                  <br />
                  bevor wir Ihr Gerät sehen.
                </>
              }
              lede="Wählen Sie Modell und Schaden – und sehen Sie live, welches Bauteil wir tauschen und was es kostet. Auf den Euro genau, inklusive Einbau und Garantie."
            />
            <Reveal delay={150}>
              <div className="mt-8">
                <Button href="/reparatur">
                  Preis für Ihr Gerät
                  <Icon name="arrow-right" size={16} />
                </Button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <DiagramShowcase />
          </Reveal>
        </div>
      </section>

      {/* Anatomie – 3D-Explosionsansicht */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Anatomie"
            title={
              <>
                Jede Schicht ein Handgriff.
                <br />
                Jeder Handgriff ein Festpreis.
              </>
            }
            lede="Sehen Sie Ihr Gerät so, wie wir es sehen – Schicht für Schicht. Ein Klick auf ein Bauteil öffnet den Befund: was es tut, warum es ausfällt, was die Reparatur kostet und wie lange sie dauert."
          />
          <div className="mt-14">
            <DeviceExploded />
          </div>
        </div>
      </section>

      {/* Röntgenblick */}
      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Röntgenblick"
            title={
              <>
                Wir sehen durch Ihr Gerät,
                <br />
                bevor wir es öffnen.
              </>
            }
            lede="Jede Diagnose beginnt mit dem Blick nach innen. Führen Sie die Linse über das Gehäuse – Board, Akku, Kamera und Antrieb liegen genau dort, wo wir sie ansteuern."
          />
          <div className="mt-14">
            <XRay />
          </div>
        </div>
      </section>

      {/* Prozess */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="So funktioniert es"
            title="Drei Schritte. Kein Kleingedrucktes."
            align="center"
          />
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 90} as="li">
                <div className="relative">
                  <span className="font-mono text-[0.8125rem] text-ink-faint">
                    0{i + 1}
                  </span>
                  <div className="mt-3 h-px w-full bg-line" aria-hidden="true" />
                  <h3 className="text-title mt-5">{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-ink-soft">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Refurbished Teaser */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Refurbished"
            title="Geprüft wie neu. Nur ehrlicher im Preis."
            lede={`Jedes Gerät durchläuft unser ${site.checkpoints}-Punkte-Prüfprotokoll und kommt mit ${site.warrantyMonths} Monaten Garantie.`}
          />
          <Reveal delay={120}>
            <Link
              href="/refurbished"
              className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-strong"
            >
              Alle Geräte
              <Icon
                name="arrow-right"
                size={16}
                className="transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {refurbishedDevices.slice(0, 3).map((device, i) => (
            <Reveal key={device.id} delay={i * 90}>
              <RefurbishedCard device={device} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Echte Google-Rezensionen */}
      <Reviews />

      {/* Zahlen */}
      <section className="bg-inverse">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Verlässlichkeit"
            title="Vertrauen ist messbar."
            align="center"
            inverse
          />
          <dl className="mt-14 grid grid-cols-2 gap-10 md:grid-cols-4">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="text-center">
                  <dd className="font-mono text-3xl font-semibold tracking-tight text-ink-inverse md:text-4xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-2.5 text-[0.875rem] leading-snug text-ink-inverse-soft">
                    {stat.label}
                  </dt>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Abschluss-CTA */}
      <section className="mx-auto max-w-6xl px-5 py-24 text-center md:px-8 md:py-32">
        <Reveal>
          <h2 className="text-headline mx-auto max-w-2xl">
            Ihr Gerät verdient eine zweite Chance.
            <br />
            Wir geben sie ihm heute.
          </h2>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/reparatur" size="lg">
              Sofortpreis berechnen
              <Icon name="arrow-right" size={18} />
            </Button>
            <Button href="/kontakt" variant="secondary" size="lg">
              Termin vereinbaren
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
