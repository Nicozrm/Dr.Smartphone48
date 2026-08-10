import type { ComponentType } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { DeviceCheck } from "@/components/check/DeviceCheck";
import { Distortion } from "@/components/check/Distortion";
import { ColorGamut } from "@/components/check/ColorGamut";
import { Digitizer } from "@/components/check/Digitizer";
import { DropForensics } from "@/components/check/DropForensics";
import { FrameRate } from "@/components/check/FrameRate";
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

/**
 * Die Instrumente – **eine** Liste, aus der sowohl das Verzeichnis als auch
 * die Abschnitte entstehen.
 *
 * Das ist keine Formsache. Neun Instrumente ergeben auf dem Telefon knapp
 * zwanzig Bildschirme Bauhöhe; ohne Verzeichnis findet niemand das eine,
 * das er sucht. Ein von Hand gepflegtes Verzeichnis daneben wäre aber
 * dieselbe Falle wie beim Offline-Vorrat: Zwei Fassungen derselben Liste
 * driften auseinander, und dann zeigt das Verzeichnis auf einen Anker, den
 * es nicht mehr gibt. Hier kann das nicht passieren – beide Seiten lesen
 * dasselbe Array.
 *
 * `needs` ist die Berechtigung, die das Instrument braucht. Sie steht im
 * Verzeichnis, weil sie die Frage beantwortet, die man vor dem Klick hat:
 * Sechs der neun kommen ohne aus, und das ist ein Merkmal, kein Zufall.
 */
const instruments: {
  id: string;
  name: string;
  what: string;
  needs: string | null;
  group: string;
  Component: ComponentType;
}[] = [
  {
    id: "bildfrequenz",
    name: "Bildfrequenz-Schreiber",
    what: "Wie schnell und wie gleichmäßig das Panel liefert",
    needs: null,
    group: "Bildschirm",
    Component: FrameRate,
  },
  {
    id: "farbraum",
    name: "Farbraum-Beweis",
    what: "sRGB gegen P3 – nebeneinandergestellt",
    needs: null,
    group: "Bildschirm",
    Component: ColorGamut,
  },
  {
    id: "digitizer",
    name: "Digitizer-Prüfstand",
    what: "Stellen, die den Finger nicht mehr melden",
    needs: null,
    group: "Bildschirm",
    Component: Digitizer,
  },
  {
    id: "pixel-wecker",
    name: "Pixel-Wecker",
    what: "Hängende Bildpunkte lösen – manchmal",
    needs: null,
    group: "Bildschirm",
    Component: PixelWake,
  },
  {
    id: "stethoskop",
    name: "Stethoskop",
    what: "Spulenfiepen und Brummen als Spektrum",
    needs: "Mikrofon",
    group: "Ton",
    Component: Stethoscope,
  },
  {
    id: "klirrfaktor",
    name: "Klirrfaktor",
    what: "Verzerrung über fünf Lautstärkestufen",
    needs: "Mikrofon",
    group: "Ton",
    Component: Distortion,
  },
  {
    id: "entwaesserung",
    name: "Lautsprecher entwässern",
    what: "Wasser mit einem tiefen Ton austreiben",
    needs: null,
    group: "Ton",
    Component: SpeakerEject,
  },
  {
    id: "sturz",
    name: "Beschleunigungsschreiber",
    what: "Freier Fall, Aufprall, Bremsweg",
    needs: "Bewegungssensor",
    group: "Gerät",
    Component: DropForensics,
  },
  {
    id: "drossel",
    name: "Drosselschreiber",
    what: "Wie schnell das Gerät unter Last müde wird",
    needs: null,
    group: "Gerät",
    Component: ThermalTrace,
  },
];

const groups = ["Bildschirm", "Ton", "Gerät"];

export default function CheckPage() {
  const free = instruments.filter((i) => !i.needs).length;

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
        Neun Werkzeuge, die bewusst außerhalb des Befunds stehen.

        Der Check oben zählt zwölf Prüfpunkte zu einem Ergebnis zusammen. Diese
        neun lassen sich nicht bestehen oder nicht bestehen – sie liefern
        Messwerte, und die Deutung bleibt beim Menschen. Sie in die Liste zu
        hängen, hieße, ein Spektrum in ein Häkchen zu übersetzen, und genau
        diese Übersetzung wäre die Behauptung, die hier niemand aufstellen
        will.

        Zwei sind Sonderfälle. Die Entwässerung misst gar nichts, sie tut
        etwas – ein Häkchen bei „Lautsprecher“ nach einem Ton, dessen Wirkung
        niemand nachgemessen hat, wäre die Behauptung in Reinform. Und beim
        Farbraum ist das Messgerät das Auge; die Seite kann nicht wissen, was
        jemand davor sieht.
      */}
      <Reveal className="mt-24 max-w-2xl" printHide>
        <p className="text-eyebrow">{instruments.length} Instrumente</p>
        <h2 className="text-headline mt-4">Messen statt raten.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Diese {instruments.length} geben keinen Befund und tauchen oben in
          der Auswertung nicht auf. Sie zeigen, was dieses Gerät tatsächlich
          hergibt – mit ihren Grenzen daneben. Was daraus folgt, entscheiden
          Sie. {free} davon kommen ganz ohne Berechtigung aus: kein Mikrofon,
          kein Sensor, nur Rechnen, Licht und ein tiefer Ton.
        </p>
      </Reveal>

      {/* Das Verzeichnis. Entsteht aus derselben Liste wie die Abschnitte
          darunter und kann deshalb nicht auf einen Anker zeigen, den es
          nicht gibt. */}
      <Reveal className="mt-10" printHide>
        <nav className="instr-index" aria-label="Instrumente">
          {groups.map((group) => (
            <div key={group}>
              <p className="instr-index__group">{group}</p>
              <ul className="mt-3 space-y-2.5">
                {instruments
                  .filter((i) => i.group === group)
                  .map((i) => (
                    <li key={i.id}>
                      <a href={`#${i.id}`} className="instr-link">
                        <span className="instr-link__name">{i.name}</span>
                        <span className="instr-link__what">{i.what}</span>
                        {i.needs ? (
                          <span className="instr-link__needs">{i.needs}</span>
                        ) : null}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </Reveal>

      {instruments.map(({ id, Component }, index) => (
        <Reveal key={id} className={index === 0 ? "mt-16" : "mt-20"} printHide>
          {/* scroll-mt hält die Überschrift unter dem klebenden Kopf frei –
              ohne sie landet ein Sprungziel hinter der Leiste. */}
          <div id={id} className="scroll-mt-24">
            <Component />
          </div>
        </Reveal>
      ))}
    </section>
  );
}
