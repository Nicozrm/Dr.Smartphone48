import { Reveal } from "@/components/ui/Reveal";
import { DeviceCheck } from "@/components/check/DeviceCheck";
import { DropForensics } from "@/components/check/DropForensics";
import { Stethoscope } from "@/components/check/Stethoscope";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/check",
  title: "Geräte-Check – Diagnose in 60 Sekunden",
  description:
    "Prüfen Sie Ihr Smartphone direkt im Browser: Display, Touch, Sensoren, Mikrofon, Lautsprecher, Akku und Netz. Ehrlicher Befund in unter einer Minute – ohne App, ohne Anmeldung.",
});

export default function CheckPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <JsonLd data={breadcrumbJsonLd([{ name: "Geräte-Check", path: "/check" }])} />
      <Reveal className="max-w-2xl" printHide>
        <p className="text-eyebrow">Geräte-Check</p>
        <h1 className="text-display mt-4">
          Was Ihr Gerät
          <br />
          Ihnen sagen will.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Eine ehrliche Diagnose – live in Ihrem Browser, ohne App und ohne
          Anmeldung. Jeder Test läuft auf Ihrem Gerät; nichts verlässt es. Am
          Ende steht ein klarer Befund und, falls nötig, der passende Festpreis.
        </p>
      </Reveal>

      <div className="mt-14 md:mt-16">
        <DeviceCheck />
      </div>

      {/*
        Zwei Werkzeuge, die bewusst außerhalb des Befunds stehen.

        Der Check oben zählt zwölf Prüfpunkte zu einem Ergebnis zusammen. Diese
        beiden lassen sich nicht bestehen oder nicht bestehen – sie liefern
        Messwerte, und die Deutung bleibt beim Menschen. Sie in die Liste zu
        hängen, hieße, ein Spektrum in ein Häkchen zu übersetzen, und genau
        diese Übersetzung wäre die Behauptung, die hier niemand aufstellen
        will.
      */}
      <Reveal className="mt-24 max-w-2xl" printHide>
        <p className="text-eyebrow">Zwei Instrumente</p>
        <h2 className="text-headline mt-4">Messen statt raten.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Diese beiden geben keinen Befund und tauchen oben in der Auswertung
          nicht auf. Sie zeigen, was die Sensoren dieses Geräts tatsächlich
          hergeben – mit ihren Grenzen daneben. Was daraus folgt, entscheiden
          Sie.
        </p>
      </Reveal>

      <Reveal className="mt-12" printHide>
        <Stethoscope />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <DropForensics />
      </Reveal>
    </section>
  );
}
