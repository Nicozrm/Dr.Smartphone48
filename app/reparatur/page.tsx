import type { Metadata } from "next";
import { Configurator } from "@/components/configurator/Configurator";
import { Faq } from "@/components/sections/Faq";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reparatur mit Sofortpreis",
  description: `Gerät wählen, Schaden wählen, Festpreis sehen – in Sekunden. Originalteile, ${site.warrantyMonths} Monate Garantie, die meisten Reparaturen in unter einer Stunde.`,
};

export default function ReparaturPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Sofortpreis-Rechner</p>
          <h1 className="text-display mt-4">
            Ihr Preis.
            <br />
            Bevor Sie uns besuchen.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Drei Klicks bis zum Festpreis. Was Sie hier sehen, zahlen Sie –
            keine Überraschungen, keine Aufschläge, keine Kleingedrucktes.
          </p>
        </Reveal>

        <div className="mt-14 md:mt-20">
          <Configurator />
        </div>
      </section>

      <Faq />
    </>
  );
}
