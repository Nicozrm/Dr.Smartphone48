import type { Metadata } from "next";
import { RefurbishedGrid } from "@/components/sections/RefurbishedGrid";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { grades } from "@/lib/data/refurbished";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refurbished Smartphones",
  description: `Geprüfte Smartphones mit ${site.checkpoints}-Punkte-Protokoll, transparenten Zustandsgraden und ${site.warrantyMonths} Monaten Garantie – bis zu 60 % unter Neupreis.`,
};

const promises: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "check",
    title: `${site.checkpoints}-Punkte-Prüfprotokoll`,
    text: "Display, Akku, Kameras, Sensoren, Funk – jedes Gerät wird vollständig durchgemessen und dokumentiert.",
  },
  {
    icon: "shield",
    title: `${site.warrantyMonths} Monate Garantie`,
    text: "Dieselbe Garantie wie auf jede Reparatur. Refurbished heißt bei uns nicht Risiko, sondern Standard.",
  },
  {
    icon: "leaf",
    title: "Besser für alle",
    text: "Ein aufbereitetes Gerät spart rund 80 % der Emissionen eines Neugeräts – und leistet dasselbe.",
  },
];

export default function RefurbishedPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Refurbished</p>
          <h1 className="text-display mt-4">
            Wie neu.
            <br />
            Nur ehrlicher.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Jedes Gerät wird in unserer Werkstatt aufbereitet, nach{" "}
            {site.checkpoints} Punkten geprüft und mit transparentem
            Zustandsgrad verkauft. Was wir nicht selbst kaufen würden,
            verkaufen wir nicht.
          </p>
        </Reveal>

        <div className="mt-14 md:mt-16">
          <RefurbishedGrid />
        </div>
      </section>

      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Unser Versprechen"
            title="Refurbished ohne Fragezeichen."
            align="center"
          />
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
            {promises.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-strong">
                    <Icon name={p.icon} size={22} />
                  </span>
                  <h2 className="text-title mt-5">{p.title}</h2>
                  <p className="mt-3 leading-relaxed text-ink-soft">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {grades.map((g, i) => (
              <Reveal key={g.id} delay={i * 80}>
                <div className="rounded-[var(--radius-m)] border border-line bg-page p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
                    Zustand
                  </p>
                  <h3 className="text-title mt-2">{g.label}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {g.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
