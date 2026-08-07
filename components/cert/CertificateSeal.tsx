"use client";

import { useId } from "react";
import { signatureGlyph } from "@/lib/cert/glyph";
import { site } from "@/lib/site";

type Tone = "valid" | "invalid" | "unknown";

/*
  Eine Farbe je Zustand, dazu Graphit – nicht zwei.

  Der erste Entwurf zeichnete die Hüllkurve im Grün der Statusfarben und die
  Speichen im Blau des Akzents. Das sah nach Ampel aus und widerspricht dem
  Kern dieser Designsprache: ein Ton, alles andere Ton-in-Ton. Ein gültiges
  Zertifikat ist außerdem der Normalfall und kein Erfolg – gefeiert wird hier
  nichts. Den Befund trägt der Satz daneben, nicht die Farbe.

  Die zweite Linie (`inner`) bleibt deshalb überall graphitgrau: Sie gibt der
  Figur Tiefe und sagt nichts.
*/
const palette: Record<
  Tone,
  { ring: string; glyph: string; hull: string; inner: string; text: string }
> = {
  valid: {
    ring: "var(--accent)",
    glyph: "var(--accent)",
    hull: "var(--accent)",
    inner: "var(--ink-faint)",
    text: "var(--accent)",
  },
  invalid: {
    ring: "var(--danger)",
    glyph: "var(--danger)",
    hull: "var(--danger)",
    inner: "var(--ink-faint)",
    text: "var(--danger)",
  },
  unknown: {
    ring: "var(--line-strong)",
    glyph: "var(--ink-faint)",
    hull: "var(--ink-soft)",
    inner: "var(--line-strong)",
    text: "var(--ink-faint)",
  },
};

/**
 * Das Siegel.
 *
 * Drei Ringe, wie sie im Wertpapierdruck üblich sind: außen eine Umschrift
 * in Mikroschrift, innen der Rand, in der Mitte das Signaturbild. Die
 * Umschrift ist gestaltete Wahrheit – sie nennt das Verfahren, mit dem
 * geprüft wurde, und nicht ein Wort mehr.
 *
 * Alles ist Vektor. Kein Bild, keine Schriftdatei, keine Ladelast; das
 * Siegel skaliert vom Kassenbon bis zum Plakat und druckt sich sauber.
 */
export function CertificateSeal({
  signature,
  tone,
  size = 260,
  animate = true,
}: {
  signature: Uint8Array;
  tone: Tone;
  size?: number;
  animate?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const glyph = signatureGlyph(signature);
  const color = palette[tone];

  /*
    Die Umschrift läuft genau zweimal um den Ring und wird per `textLength`
    auf dessen Umfang gedehnt (2π × 114 ≈ 716).

    Der erste Anlauf ließ den Text dreimal wiederholen und beschnitt ihn am
    Ende – dort stießen dann „ECDSA P-256" und „DR SMARTPHONE48" ohne
    Trennzeichen aufeinander, weil SVG die Leerzeichen an der Schnittstelle
    zusammenzieht. Eine Umschrift mit einer Stoßstelle sieht nach Fehldruck
    aus, und genau das darf ein Siegel nicht.

    Mit `textLength` gibt es keine Schnittstelle mehr: Der Text füllt den
    Kreis exakt, der Browser verteilt die Differenz auf die Zwischenräume.
  */
  const legend = `${site.name.toUpperCase()} · REPARATURZERTIFIKAT · ECDSA P-256 · SHA-256 · `;
  const RING_LENGTH = 716;

  return (
    <svg
      viewBox="0 0 260 260"
      width={size}
      height={size}
      className={`cert-seal ${animate ? "glyph-animate" : ""}`}
      role="img"
      aria-label="Siegel mit der bildlichen Darstellung der Unterschrift"
      fill="none"
    >
      <defs>
        {/* Innen laufender Kreis: Der Text steht dann aufrecht lesbar. */}
        <path
          id={`${id}-ring`}
          d="M130 130 m0 -114 a114 114 0 1 1 -0.01 0"
        />
      </defs>

      <text className="cert-seal-legend" fill={color.text} fontSize="6.8">
        <textPath
          href={`#${id}-ring`}
          textLength={RING_LENGTH}
          lengthAdjust="spacing"
        >
          {legend.repeat(2)}
        </textPath>
      </text>

      <circle cx="130" cy="130" r="104" stroke={color.ring} strokeWidth="0.6" />
      <circle cx="130" cy="130" r="101" stroke={color.ring} strokeWidth="1.6" />

      <g transform="translate(20 20)">
        {/* Die Fläche unter der Hüllkurve. Sie trägt keine eigene Information –
            sie gibt der Figur Gewicht, damit sie als Siegel liest und nicht
            als Diagramm. Deshalb sehr blass und ohne Kontur. */}
        <path
          d={glyph.hull}
          fill={color.hull}
          fillOpacity="0.09"
          className="glyph-fill"
        />
        <circle
          cx="110"
          cy="110"
          r={glyph.hub}
          fill={color.hull}
          fillOpacity="0.05"
          className="glyph-fill"
        />
        <path
          d={glyph.inner}
          stroke={color.inner}
          strokeWidth="0.7"
          opacity="0.55"
          pathLength={100}
          className="glyph-inner"
        />
        <path
          d={glyph.spokes}
          stroke={color.glyph}
          strokeWidth="1.3"
          strokeLinecap="round"
          className="glyph-spokes"
        />
        <path
          d={glyph.hull}
          stroke={color.hull}
          strokeWidth="1.5"
          pathLength={100}
          className="glyph-hull"
        />
      </g>
    </svg>
  );
}
