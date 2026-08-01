import { Reveal } from "@/components/ui/Reveal";
import { DigitalTwin } from "@/components/twin/DigitalTwin";
import { RepairOrReplace } from "@/components/twin/RepairOrReplace";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/zwilling",
  title: "Digitaler Zwilling – Zustand und Lebensdauer",
  description:
    "Der digitale Zwilling Ihres Smartphones: Akkuzustand, betroffene Bauteile, empfohlene Wartung und verbleibende Nutzungsdauer – in Sekunden berechnet.",
});

export default function ZwillingPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <JsonLd data={breadcrumbJsonLd([{ name: "Digitaler Zwilling", path: "/zwilling" }])} />
      <Reveal className="max-w-2xl">
        <p className="text-eyebrow">Digitaler Zwilling</p>
        <h1 className="text-display mt-4">
          Ihr Gerät,
          <br />
          einmal durchgerechnet.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Wir bauen ein Modell Ihres Smartphones: Wie alt es ist, wie Sie es
          nutzen, was Ihnen auffällt. Daraus entsteht ein ehrlicher Zustand –
          inklusive der Frage, ob sich eine Reparatur überhaupt noch lohnt.
        </p>
      </Reveal>

      <div className="mt-14 md:mt-16">
        <DigitalTwin />
      </div>

      {/* Die unbequeme Frage – bewusst hier, nicht versteckt. */}
      <div className="mt-24 border-t border-line pt-16 md:mt-32 md:pt-20">
        <SectionHeading
          eyebrow="Reparieren oder neu?"
          title="Manchmal ist die ehrliche Antwort: neu kaufen."
          lede="Wir rechnen es mit Ihnen durch, statt Ihnen eine Reparatur zu verkaufen, die sich nicht lohnt. Den Preis des Neugeräts geben Sie ein – so ist es Ihre Rechnung."
        />
        <div className="mt-12">
          <RepairOrReplace />
        </div>
      </div>
    </section>
  );
}
