import { Configurator } from "@/components/configurator/Configurator";
import { RepairProcedure } from "@/components/procedure/RepairProcedure";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Faq } from "@/components/sections/Faq";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { faqJsonLd } from "@/lib/data/faq";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  path: "/reparatur",
  title: "Reparatur mit Sofortpreis",
  description: `Gerät wählen, Schaden wählen, Festpreis sehen – in Sekunden. Originalteile, ${site.warrantyMonths} Monate Garantie, die meisten Reparaturen in unter einer Stunde.`,
});

export default function ReparaturPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Reparatur", path: "/reparatur" }])} />
      {/* Die FAQ steht sichtbar auf dieser Seite – Voraussetzung dafür, dass
          Google sie als Rich Result ausspielen darf. */}
      <JsonLd data={faqJsonLd} />
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

      {/* Was hinter der Dauer steckt, die oben auf dem Preisschild steht */}
      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Der Ablauf"
            title={
              <>
                45 Minuten.
                <br />
                Hier ist, was darin passiert.
              </>
            }
            lede="Jede Werkstatt schreibt eine Dauer auf das Preisschild, und überall ist es eine Zahl, die man glauben muss. Spielen Sie sie ab: echte Arbeitsschritte, deren Einzelzeiten in der Summe genau die zugesagte Zeit ergeben."
          />
          <div className="mt-12">
            <RepairProcedure />
          </div>
        </div>
      </section>

      <Faq />
    </>
  );
}
