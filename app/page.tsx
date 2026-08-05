import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShaderField } from "@/components/experience/ShaderField";
import { HeroDevice } from "@/components/experience/HeroDevice";
import {
  LazyDeviceExploded,
  LazyDeviceStage,
  LazyDiagramShowcase,
  LazyXRay,
} from "@/components/experience/LazyHomeExperience";
import { RefurbishedCard } from "@/components/sections/RefurbishedCard";
import { Reviews } from "@/components/sections/Reviews";
import { TrustBar } from "@/components/sections/TrustBar";
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

const tools: {
  href: string;
  icon: IconName;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
}[] = [
  {
    href: "/notfall",
    icon: "shield",
    eyebrow: "Soforthilfe",
    title: "Die ersten Minuten entscheiden",
    text: "Wasserschaden, gebrochenes Display, aufgeblähter Akku: was Sie sofort tun sollten – und welcher Fehler am meisten kostet. Funktioniert auch offline, ohne Anmeldung, ohne dass Sie Kunde sein müssen.",
    cta: "Protokolle öffnen",
  },
  {
    href: "/check",
    icon: "cpu",
    eyebrow: "Diagnose",
    title: "Ihr Gerät prüft sich selbst",
    text: "Display, Touch, Sensoren, Mikrofon, Lautsprecher, Akku und Netz – geprüft direkt im Browser, in unter einer Minute. Jeder Test läuft auf Ihrem Gerät; nichts verlässt es.",
    cta: "Check starten",
  },
  {
    href: "/ankauf",
    icon: "leaf",
    eyebrow: "Ankauf",
    title: "Was Ihr Gerät noch wert ist",
    text: "Eine Wertschätzung mit offengelegter Rechnung statt einer Zahl aus der Blackbox. Jeder Abzug mit Betrag und Begründung – auch die, die uns nicht schmeicheln.",
    cta: "Restwert schätzen",
  },
  {
    href: "/zwilling",
    icon: "battery",
    eyebrow: "Akku-Coach",
    title: "Wie lange Ihr Akku noch mitmacht",
    text: "Stellen Sie ein, wie Sie wirklich laden – die Kurve rechnet drei Jahre voraus und nennt die eine Änderung, die am meisten bringt. Dazu die Frage, ob sich eine Reparatur überhaupt lohnt.",
    cta: "Prognose ansehen",
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
      {/*
        Hero.

        Die Überschrift verkauft keine Reparatur, sondern deren Ergebnis: Wer
        mit gesprungenem Display hier landet, sucht nicht „Displaytausch ab
        129 €" – er will wissen, wann er sein Gerät zurückbekommt. Deshalb
        steht die Antwort auf diese Frage in der größten Type der Seite und
        alles Technische eine Ebene darunter.

        Die Zeilenlänge ist in `ch` begrenzt statt in Pixeln. Das Maß wächst
        mit der Schriftgröße, der Umbruch bleibt also über alle Bildbreiten
        gleich proportioniert – ohne feste <br>, die auf einem schmalen
        Telefon über den Rand liefen.
      */}
      <section className="lightfall relative isolate overflow-hidden">
        <ShaderField />
        <div className="mx-auto max-w-[80rem] px-5 pt-28 text-center md:px-8 md:pt-36">
          <Reveal>
            <p className="text-eyebrow">Smartphone-Reparatur · {site.city}</p>
            <h1 className="text-hero mx-auto mt-6 max-w-[17ch]">
              Ihr Smartphone. Heute Abend wieder in Ihrer Hand.
            </h1>
            <p className="mx-auto mt-7 max-w-[38rem] text-lg leading-relaxed text-ink-soft">
              Die meisten Reparaturen sind fertig, bevor Ihr Kaffee kalt wird.
              Festpreis vorher, Originalteile, {site.warrantyMonths} Monate
              Garantie – bezahlt wird erst, wenn alles funktioniert.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/reparatur" size="lg">
                Sofortpreis berechnen
                <Icon name="arrow-right" size={18} />
              </Button>
              <Button href="/refurbished" variant="secondary" size="lg">
                Refurbished entdecken
              </Button>
            </div>
          </Reveal>
          {/* Die Belege stehen direkt am Handlungsaufruf, nicht erst im Fuß. */}
          <Reveal delay={200}>
            <TrustBar className="mt-9" />
          </Reveal>
        </div>

        {/*
          Das Gerät steigt von unten ins Bild und wird von der Sektionskante
          beschnitten. Der Anschnitt ist Absicht: Ein vollständig gezeigtes
          Objekt ist eine Abbildung, ein angeschnittenes ist ein Ausschnitt
          aus etwas Größerem – und er spart die halbe Bauhöhe, die ein ganzes
          Gerät hier fordern würde.
        */}
        <div className="hero-crop mt-14 md:mt-20">
          <HeroDevice />
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-20 md:grid-cols-3 md:gap-14 md:px-8 md:py-24">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 90}>
              <div className="py-6 md:py-0">
                <span className="glass-micro inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-m)] text-ink-strong shadow-raised">
                  <Icon name={pillar.icon} size={22} />
                </span>
                <h2 className="text-title mt-6">{pillar.title}</h2>
                <p className="mt-3.5 leading-relaxed text-ink-soft">{pillar.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Signature Feature */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
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
            <LazyDiagramShowcase />
          </Reveal>
        </div>
      </section>

      {/*
        Die Bühne – das Gerät in Echtzeit gerechnet.

        Bewusst randlos und ohne Kasten: Der Körper schwebt in der Seite,
        statt in einer Karte zu sitzen. Der Text steht daneben und trägt die
        Aussage allein – wer kein WebGL hat oder Bewegung abbestellt, verliert
        nichts als die Zugabe.
      */}
      <section className="relative min-h-[34rem] overflow-hidden bg-[#0a0b0e] md:min-h-[44rem]">
        <LazyDeviceStage className="absolute inset-0 h-full w-full" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-24 md:px-8 md:py-36 lg:min-h-[44rem] lg:grid-cols-[1fr_minmax(0,25rem)]">
          {/* Die Bühne ist in beiden Themes dunkel – der Text daher immer
              invers, wie im Kennzahlen-Abschnitt. */}
          <div className="lg:col-start-2">
            <Reveal>
              <p className="text-eyebrow !text-ink-inverse-soft">In Echtzeit</p>
              <h2 className="text-headline mt-4 !text-ink-inverse">
                Kein Foto.
                <br />
                Ihr Gerät, gerechnet.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-inverse-soft">
                Titan, Glas, drei Linsen – jedes Bild neu berechnet,
                sechsunddreißig Mal in der Sekunde. Kein 3D-Modell, keine
                Bibliothek, keine Bilddatei: nur Mathematik, die sich Ihrem
                Zeiger zuwendet.
              </p>
              {/* Der Hinweis verschwindet, wo er nicht stimmt: ohne WebGL,
                  ohne Zeigegerät und bei abbestellter Bewegung. Siehe
                  .stage-hint in globals.css. */}
              <p className="stage-hint mt-5 font-mono text-[0.8125rem] leading-relaxed text-ink-inverse-soft/70">
                Bewegen Sie den Zeiger über die Fläche.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Anatomie – 3D-Explosionsansicht */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
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
            <LazyDeviceExploded />
          </div>
        </div>
      </section>

      {/* Röntgenblick */}
      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
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
            <LazyXRay />
          </div>
        </div>
      </section>

      {/* Prozess */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
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
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
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

      {/* Werkzeuge – was diese Seite kann, was andere nicht können */}
      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
          <SectionHeading
            eyebrow="Werkzeuge"
            title="Vier Dinge, die Sie hier erledigen können, ohne uns zu besuchen."
            lede="Wir hätten Ihnen auch einfach eine Telefonnummer hinschreiben können. Diese Werkzeuge lösen Ihr Problem manchmal ganz ohne uns – und wenn nicht, wissen Sie vorher genau, woran Sie sind."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {tools.map((tool, i) => (
              <Reveal key={tool.href} delay={i * 80}>
                {/* Kein Ripple auf den großen Karten: Eine Lichtwelle quer
                    über einen Absatz Fließtext liest sich als Störung. Hier
                    genügen Anheben und Druckpunkt. */}
                <Link
                  href={tool.href}
                  className="lift press group flex h-full flex-col rounded-[var(--radius-xl)] border border-line bg-page p-7 hover:border-ink-faint md:p-8"
                >
                  <span className="flex items-center gap-3">
                    <span className="glass-micro inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-m)] text-ink-strong shadow-raised">
                      <Icon name={tool.icon} size={20} />
                    </span>
                    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                      {tool.eyebrow}
                    </span>
                  </span>
                  <span className="text-title mt-5 block">{tool.title}</span>
                  <span className="mt-3 block flex-1 leading-relaxed text-ink-soft">
                    {tool.text}
                  </span>
                  <span className="mt-5 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-strong">
                    {tool.cta}
                    <Icon
                      name="arrow-right"
                      size={16}
                      className="transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Echte Google-Rezensionen */}
      <Reviews />

      {/* Zahlen. Die dunkle Fläche bekommt dieselbe Lichtquelle von oben wie
          der Hero – ohne sie wirkt ein reines Schwarzfeld zwischen zwei hellen
          Sektionen wie ein Loch statt wie eine Ebene. */}
      <section className="lightfall bg-inverse">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-36">
          <SectionHeading
            eyebrow="Verlässlichkeit"
            title="Vertrauen ist messbar."
            align="center"
            inverse
          />
          <dl className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 md:gap-10">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="text-center">
                  <dd className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-ink-inverse md:text-[2.75rem]">
                    {stat.value}
                  </dd>
                  <dt className="mx-auto mt-3 max-w-[22ch] text-[0.875rem] leading-snug text-ink-inverse-soft">
                    {stat.label}
                  </dt>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Abschluss-CTA */}
      <section className="mx-auto max-w-6xl px-5 py-28 text-center md:px-8 md:py-40">
        <Reveal>
          <h2 className="text-display mx-auto max-w-[20ch]">
            Ihr Gerät verdient eine zweite Chance. Wir geben sie ihm heute.
          </h2>
          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
