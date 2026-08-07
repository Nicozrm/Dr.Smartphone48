import { signatureGlyph } from "@/lib/cert/glyph";

type Tone = "neutral" | "valid" | "invalid";

const tones: Record<Tone, { spokes: string; hull: string; inner: string }> = {
  neutral: {
    spokes: "var(--ink-faint)",
    hull: "var(--ink-soft)",
    inner: "var(--line-strong)",
  },
  // Ein Ton je Zustand, die zweite Linie bleibt Graphit – Begründung im
  // Seitenstück `CertificateSeal.tsx`.
  valid: {
    spokes: "var(--accent)",
    hull: "var(--accent)",
    inner: "var(--ink-faint)",
  },
  invalid: {
    spokes: "var(--danger)",
    hull: "var(--danger)",
    inner: "var(--line-strong)",
  },
};

/**
 * Die Signatur als Figur.
 *
 * Reine Darstellung, keine Aussage: Das Bild sagt nicht, ob die Unterschrift
 * gilt – es zeigt nur, welche es ist. Der Farbton kommt von außen, weil
 * dort das Urteil gefällt wird.
 *
 * Die Speichen laufen beim Erscheinen von innen nach außen (CSS,
 * `.glyph-spokes`), die Hüllkurve zeichnet sich danach. Das dauert
 * zusammen unter einer Sekunde und ist bei `prefers-reduced-motion` sofort
 * fertig – die Figur ist die Information, die Bewegung nur ihre Ankunft.
 */
export function SignatureGlyph({
  signature,
  tone = "neutral",
  size = 220,
  className = "",
  animate = false,
}: {
  signature: Uint8Array;
  tone?: Tone;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const glyph = signatureGlyph(signature);
  const color = tones[tone];
  if (!glyph.spokes) return null;

  return (
    <svg
      viewBox={`0 0 ${glyph.extent} ${glyph.extent}`}
      width={size}
      height={size}
      className={`${animate ? "glyph-animate" : ""} ${className}`}
      role="img"
      aria-label="Bildliche Darstellung der Unterschrift"
      fill="none"
    >
      {/* Fläche zuerst, damit die Striche darüber liegen. Sie trägt keine
          eigene Aussage, sondern nur das Gewicht eines Siegels. */}
      <path d={glyph.hull} fill={color.hull} fillOpacity="0.09" className="glyph-fill" />
      <path
        d={glyph.inner}
        stroke={color.inner}
        strokeWidth="0.8"
        pathLength={100}
        className="glyph-inner"
      />
      <path
        d={glyph.spokes}
        stroke={color.spokes}
        strokeWidth="1.4"
        strokeLinecap="round"
        className="glyph-spokes"
      />
      <path
        d={glyph.hull}
        stroke={color.hull}
        strokeWidth="1.6"
        pathLength={100}
        className="glyph-hull"
      />
    </svg>
  );
}
