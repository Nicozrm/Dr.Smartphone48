import { Reveal } from "@/components/ui/Reveal";
import { DeviceCheck } from "@/components/check/DeviceCheck";
import { Distortion } from "@/components/check/Distortion";
import { DropForensics } from "@/components/check/DropForensics";
import { PixelWake } from "@/components/check/PixelWake";
import { Stethoscope } from "@/components/check/Stethoscope";
import { ThermalTrace } from "@/components/check/ThermalTrace";
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
        Fünf Werkzeuge, die bewusst außerhalb des Befunds stehen.

        Der Check oben zählt zwölf Prüfpunkte zu einem Ergebnis zusammen. Diese
        fünf lassen sich nicht bestehen oder nicht bestehen – sie liefern
        Messwerte, und die Deutung bleibt beim Menschen. Sie in die Liste zu
        hängen, hieße, ein Spektrum in ein Häkchen zu übersetzen, und genau
        diese Übersetzung wäre die Behauptung, die hier niemand aufstellen
        will.
      */}
      <Reveal className="mt-24 max-w-2xl" printHide>
        <p className="text-eyebrow">Fünf Instrumente</p>
        <h2 className="text-headline mt-4">Messen statt raten.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Diese fünf geben keinen Befund und tauchen oben in der Auswertung
          nicht auf. Sie zeigen, was dieses Gerät tatsächlich hergibt – mit
          ihren Grenzen daneben. Was daraus folgt, entscheiden Sie. Das
          letzte Paar kommt sogar ganz ohne Berechtigung aus: kein Mikrofon,
          kein Sensor, nur Rechnen und Licht.
        </p>
      </Reveal>

      <Reveal className="mt-12" printHide>
        <Stethoscope />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <Distortion />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <DropForensics />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <ThermalTrace />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <PixelWake />
      </Reveal>
    </section>
  );
}
