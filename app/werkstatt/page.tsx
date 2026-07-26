import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Die Werkstatt",
  description:
    "Ein Blick hinter die Theke: ESD-geschützte Arbeitsplätze, Mikroskop-Löttechnik und ein 40-Punkte-Protokoll für jede Reparatur.",
};

const principles = [
  {
    title: "Jede Schraube dokumentiert",
    text: "Jedes Gerät bekommt ein digitales Protokoll: Eingangszustand, verbaute Teile, Messwerte, Endkontrolle. Auf Wunsch erhalten Sie es mit der Rechnung.",
  },
  {
    title: "ESD-geschützt, staubarm, ruhig",
    text: "Unsere Arbeitsplätze sind auf Elektronik ausgelegt – geerdet, staubarm und aufgeräumt. Präzision beginnt mit der Umgebung.",
  },
  {
    title: "Mikroskop statt Mutmaßung",
    text: "Platinenreparaturen führen wir unter dem Mikroskop durch. Was andere abschreiben, löten wir – bis auf Bauteilebene.",
  },
  {
    title: "Erst messen, dann versprechen",
    text: "Kein Kostenvoranschlag ohne Diagnose. Unser Festpreis basiert auf Messwerten, nicht auf Schätzungen – deshalb können wir ihn garantieren.",
  },
];

const protocol = [
  "Sichtprüfung & Eingangsfoto",
  "Funktionstest aller Tasten und Sensoren",
  "Display: Touch, Helligkeit, Pixelfehler",
  "Akku: Kapazität und Ladezyklen",
  "Kameras: Fokus, Bildstabilisierung",
  "Audio: Lautsprecher, Mikrofone, Hörmuschel",
  "Konnektivität: WLAN, Mobilfunk, Bluetooth, GPS",
  "Dichtigkeit & Verklebung",
  "Messwerte im Protokoll dokumentiert",
  "Endkontrolle durch zweiten Techniker",
];

export default function WerkstattPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Die Werkstatt</p>
          <h1 className="text-display mt-4">
            Handwerk,
            <br />
            auf den Mikrometer.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Seit 2019 reparieren wir in {site.city} Smartphones so, wie wir es
            uns als Kunden selbst wünschen würden: transparent, präzise und
            ohne Ausreden.
          </p>
        </Reveal>
      </section>

      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Arbeitsweise"
            title="Vier Prinzipien. Jeden Tag."
          />
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {principles.map((principle, i) => (
              <Reveal key={principle.title} delay={(i % 2) * 90}>
                <div className="border-t border-line pt-6">
                  <h2 className="text-title">{principle.title}</h2>
                  <p className="mt-3 leading-relaxed text-ink-soft">{principle.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <SectionHeading
            eyebrow={`${site.checkpoints}-Punkte-Protokoll`}
            title="Was „geprüft“ bei uns bedeutet."
            lede="Ein Auszug aus dem Protokoll, das jedes Gerät durchläuft – bei jeder Reparatur und vor jedem Refurbished-Verkauf."
          />
          <Reveal delay={100}>
            <ol className="rounded-[var(--radius-l)] border border-line bg-raised p-7 shadow-raised">
              {protocol.map((point, i) => (
                <li
                  key={point}
                  className="flex items-center gap-4 border-b border-line py-3 text-[0.9375rem] last:border-b-0"
                >
                  <span className="w-7 shrink-0 font-mono text-xs text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-ink">{point}</span>
                  <Icon name="check" size={16} className="shrink-0 text-positive" />
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center md:px-8 md:py-28">
          <Reveal>
            <h2 className="text-headline mx-auto max-w-2xl">
              Überzeugen Sie sich vor Ort.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg text-ink-soft">
              Unsere Werkstatt hat eine Glasscheibe statt einer Hintertür.
              Schauen Sie uns bei der Arbeit zu.
            </p>
            <div className="mt-9">
              <Button href="/kontakt" size="lg">
                Besuch planen
                <Icon name="arrow-right" size={18} />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
