"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  type Gamut,
  type PanelProbe,
  coversP3,
  gamutLabel,
  gamutReading,
  megapixels,
  physicalPixels,
} from "@/lib/display/panel";

/**
 * Der Farbraum-Beweis.
 *
 * Die Begründung – warum das Sehen zählt und nicht die Auskunft des Browsers
 * – steht in lib/display/panel.ts. Hier stehen die Felder.
 *
 * ## Warum die Paare aus reinen Primärfarben bestehen
 *
 * Der Unterschied zwischen sRGB und P3 ist genau dort am größten, wo eine
 * Farbe an den Rand ihres Raums stößt: bei vollem Rot, Grün und Blau. Ein
 * abgetöntes Orange liegt in beiden Räumen und sieht in beiden gleich aus –
 * ein Paar daraus zeigte auch auf einem P3-Panel keinen Unterschied und
 * ließe den Beweis fehlschlagen, obwohl das Panel besteht.
 *
 * ## Warum die Felder aneinanderstoßen
 *
 * Ohne Fuge dazwischen. Zwei benachbarte Flächen unterscheidbar zu machen,
 * ist die leichteste Aufgabe, die das Auge kennt – mit einem weißen Steg
 * dazwischen wird daraus ein Gedächtnisvergleich, und der scheitert an
 * Unterschieden, die man nebeneinander sofort sieht.
 *
 * ## Ohne Unterstützung für color(display-p3 …)
 *
 * Ein Browser, der die Schreibweise nicht kennt, ignoriert die Regel und
 * zeigt die Rückfallfarbe – dann stehen zwei identische Felder da, und das
 * ist auch die richtige Aussage: Auf diesem Gerät kommt kein P3 an.
 */

const PAIRS: { label: string; srgb: string; p3: string }[] = [
  { label: "Rot", srgb: "rgb(255 0 0)", p3: "color(display-p3 1 0 0)" },
  { label: "Grün", srgb: "rgb(0 255 0)", p3: "color(display-p3 0 1 0)" },
  { label: "Blau", srgb: "rgb(0 0 255)", p3: "color(display-p3 0 0 1)" },
  { label: "Magenta", srgb: "rgb(255 0 255)", p3: "color(display-p3 1 0 1)" },
];

function probeBrowser(): PanelProbe {
  const ask = (q: string) => window.matchMedia(q).matches;
  let gamut: Gamut = "unbekannt";
  // Von oben nach unten: rec2020 schließt p3 ein, p3 schließt srgb ein.
  if (ask("(color-gamut: rec2020)")) gamut = "rec2020";
  else if (ask("(color-gamut: p3)")) gamut = "p3";
  else if (ask("(color-gamut: srgb)")) gamut = "srgb";

  return {
    cssWidth: window.screen?.width ?? 0,
    cssHeight: window.screen?.height ?? 0,
    dpr: window.devicePixelRatio || 1,
    gamut,
    highDynamicRange: ask("(dynamic-range: high)"),
    colorDepth: window.screen?.colorDepth ?? 0,
  };
}

export function ColorGamut() {
  const [probe, setProbe] = useState<PanelProbe | null>(null);

  const read = useCallback(() => setProbe(probeBrowser()), []);

  /* Gelesen wird beim Anzeigen, nicht auf Knopfdruck: Anders als beim
     Fingerabdruck-Nachweis auf /datenschutz ist hier nichts zu verbergen –
     die Werte beschreiben den Bildschirm, nicht die Person davor, und sie
     verlassen das Gerät ohnehin nicht. Ein Knopf davor wäre eine Zeremonie
     ohne Gegenstand. */
  useEffect(() => {
    read();
    // Ein Fensterwechsel auf einen zweiten Bildschirm ändert die Antwort.
    const media = window.matchMedia("(color-gamut: p3)");
    media.addEventListener?.("change", read);
    window.addEventListener("resize", read);
    return () => {
      media.removeEventListener?.("change", read);
      window.removeEventListener("resize", read);
    };
  }, [read]);

  const pixels = probe ? physicalPixels(probe) : null;

  return (
    <div className="gamut">
      <div className="max-w-xl">
        <h3 className="text-title">Farbraum-Beweis</h3>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Ein Original-OLED deckt in aller Regel Display P3 ab, ein günstiger
          Nachbau oft nur sRGB. Der Unterschied steht in keinem Datenblatt,
          das Sie zu sehen bekommen – aber man kann ihn sich zeigen lassen.
          Jedes Paar unten ist zweimal dieselbe Farbe: links in sRGB, rechts
          in P3.
        </p>
      </div>

      {/*
        Der eigentliche Beweis. Sehen Sie zwei Töne, kann das Panel mehr als
        sRGB; sehen Sie einen, kommt hier kein P3 an.
      */}
      <div className="gamut-strip mt-7">
        {PAIRS.map((pair) => (
          <figure key={pair.label} className="gamut-pair">
            <div className="gamut-swatch" aria-hidden="true">
              <span style={{ background: pair.srgb }} />
              <span style={{ background: pair.p3 }} />
            </div>
            <figcaption className="gamut-caption font-mono">{pair.label}</figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink">
        {probe ? gamutReading(probe) : "Wird gelesen …"}
      </p>

      <dl className="frames-readout mt-7">
        <div>
          <dt>Farbraum</dt>
          <dd className="font-mono" data-good={probe ? coversP3(probe.gamut) : false}>
            {probe ? gamutLabel(probe.gamut) : "—"}
          </dd>
        </div>
        <div>
          <dt>Bildpunkte</dt>
          <dd className="font-mono tabular-nums">
            {pixels ? `${pixels.width} × ${pixels.height}` : "—"}
          </dd>
        </div>
        <div>
          <dt>Skalierung</dt>
          <dd className="font-mono tabular-nums">
            {probe ? `${probe.dpr.toLocaleString("de-DE")}×` : "—"}
          </dd>
        </div>
        <div>
          <dt>Dynamikumfang</dt>
          <dd className="font-mono">
            {probe ? (probe.highDynamicRange ? "hoch (HDR)" : "normal") : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-7 grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-strong">
            Warum das Auge hier zählt
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Die Angabe oben ist eine Auskunft des Systems über sich selbst.
            Sie kann daneben liegen – manche Browser melden den Farbraum des
            Fensters statt den des Panels, und in einer Fernsitzung
            beschreibt sie den falschen Bildschirm. Die Felder zeigen, was
            tatsächlich ankommt. Widersprechen sich beide, gilt das Auge.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">
            {probe && pixels ? `${megapixels(probe)} Millionen Bildpunkte` : "Die Bildpunkte sind gerechnet"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Gerechnet aus CSS-Punkten mal Skalierung – der Browser nennt die
            Zahl nicht direkt. Eine Pixeldichte in ppi fehlt hier bewusst:
            Dafür bräuchte es die physische Diagonale, und die gibt kein
            Web-API preis. Sie stünde geraten da, mit zwei Nachkommastellen.
            Wie schnell dasselbe Panel schaltet, sagt Ihnen der{" "}
            {/* Echter Anker statt eines Klick-Handlers: Er funktioniert ohne
                JavaScript, lässt sich kopieren und in einem neuen Tab öffnen.
                Das Sprungziel vergibt app/check/page.tsx aus derselben Liste,
                aus der auch das Verzeichnis entsteht – es kann also nicht ins
                Leere zeigen. */}
            <a href="#bildfrequenz" className="underline underline-offset-2">
              Bildfrequenz-Schreiber
            </a>{" "}
            weiter oben.
          </p>
        </div>
      </div>

      <p className="mt-6 flex max-w-3xl items-start gap-2 text-sm leading-relaxed text-ink-faint">
        <Icon name="shield" size={15} className="mt-0.5 shrink-0" />
        <span>
          Alle Werte liest der Browser über sich selbst aus; nichts davon wird
          gesendet oder gespeichert. Was ein Browser sonst noch ungefragt
          preisgibt, zeigt der Nachweis auf{" "}
          <Link href="/datenschutz" className="underline underline-offset-2">
            /datenschutz
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
