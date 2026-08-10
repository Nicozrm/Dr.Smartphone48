import { Reveal } from "@/components/ui/Reveal";
import { DeviceCheck } from "@/components/check/DeviceCheck";
import { Distortion } from "@/components/check/Distortion";
import { ColorGamut } from "@/components/check/ColorGamut";
import { CameraBench } from "@/components/check/CameraBench";
import { Digitizer } from "@/components/check/Digitizer";
import { DropForensics } from "@/components/check/DropForensics";
import { FrameRate } from "@/components/check/FrameRate";
import { InputLatency } from "@/components/check/InputLatency";
import { PixelWake } from "@/components/check/PixelWake";
import { SpeakerEject } from "@/components/check/SpeakerEject";
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
        Elf Werkzeuge, die bewusst außerhalb des Befunds stehen.

        Der Check oben zählt zwölf Prüfpunkte zu einem Ergebnis zusammen. Diese
        elf lassen sich nicht bestehen oder nicht bestehen – sie liefern
        Messwerte, und die Deutung bleibt beim Menschen. Sie in die Liste zu
        hängen, hieße, ein Spektrum in ein Häkchen zu übersetzen, und genau
        diese Übersetzung wäre die Behauptung, die hier niemand aufstellen
        will.

        Drei sind Sonderfälle. Die Entwässerung misst gar nichts, sie tut
        etwas – ein Häkchen bei „Lautsprecher“ nach einem Ton, dessen Wirkung
        niemand nachgemessen hat, wäre die Behauptung in Reinform. Und beim
        Farbraum ist das Messgerät das Auge; die Seite kann nicht wissen, was
        jemand davor sieht. Der Kamera-Prüfstand schließlich misst durchaus,
        aber seine Aussage endet an der Bildaufbereitung des Geräts: Was der
        Sensor-Chip selbst korrigiert, sieht kein Browser. Ein Häkchen
        „Kamera in Ordnung“ behauptete mehr, als die Messung hergibt.
      */}
      <Reveal className="mt-24 max-w-2xl" printHide>
        <p className="text-eyebrow">Elf Instrumente</p>
        <h2 className="text-headline mt-4">Messen statt raten.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Diese elf geben keinen Befund und tauchen oben in der Auswertung
          nicht auf. Sie zeigen, was dieses Gerät tatsächlich hergibt – mit
          ihren Grenzen daneben. Was daraus folgt, entscheiden Sie. Sieben
          davon kommen ganz ohne Berechtigung aus: kein Mikrofon, keine
          Kamera, kein Sensor – nur Rechnen, Licht, ein Finger und ein tiefer
          Ton.
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

      <Reveal className="mt-20" printHide>
        <FrameRate />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <ColorGamut />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <Digitizer />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <InputLatency />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <CameraBench />
      </Reveal>

      <Reveal className="mt-20" printHide>
        <SpeakerEject />
      </Reveal>
    </section>
  );
}
