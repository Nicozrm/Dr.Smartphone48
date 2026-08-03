import type { SVGProps } from "react";

/**
 * Fremdmarken-Zeichen (WhatsApp, Instagram) – bewusst getrennt vom eigenen
 * `Icon`-Set.
 *
 * `Icon` ist unsere Formsprache: 24er-Grid, 1.5px Strich, runde Kappen. Diese
 * beiden hier sind es nicht und dürfen es auch nicht werden. Es sind die
 * originalen Wortbildmarken von WhatsApp Inc. bzw. Instagram – wer sie in
 * unseren Strich umzeichnet, macht aus einer erkennbaren Marke ein Icon, das
 * nur so ähnlich aussieht. Erkannt wird sie dann nicht mehr in dem
 * Sekundenbruchteil, in dem der Blick über den Fuß läuft, und genau darum
 * geht es bei einem Markenzeichen.
 *
 * Deshalb: Originalpfade, gefüllt (`fill="currentColor"`), 24er-viewBox.
 * Die Farbe kommt von außen – die Marken-Töne stehen als Tokens in
 * `globals.css` (`--brand-whatsapp`, `--brand-instagram`).
 *
 * Verwendung ist nominativ: Beide Zeichen verlinken ausschließlich auf die
 * eigenen Profile des Betriebs.
 */

export type BrandName = "whatsapp" | "instagram";

const paths: Record<BrandName, React.ReactNode> = {
  /* Sprechblase mit Fahne unten links, darin der Hörer. */
  whatsapp: (
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.24-8.24Zm-3.1 4.02c-.15 0-.39.06-.59.28-.2.22-.78.76-.78 1.85s.8 2.15.91 2.3c.11.15 1.55 2.47 3.8 3.36 1.87.74 2.25.59 2.66.55.4-.04 1.3-.53 1.49-1.05.18-.51.18-.96.13-1.05-.06-.09-.2-.15-.43-.26-.22-.11-1.32-.65-1.52-.72-.21-.08-.36-.11-.5.11-.15.22-.58.72-.71.87-.13.15-.26.17-.48.06-.23-.11-.95-.35-1.81-1.12a6.8 6.8 0 0 1-1.26-1.56c-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.05-.11-.5-1.21-.68-1.66-.18-.43-.36-.37-.5-.38-.13 0-.28-.01-.43-.01Z" />
  ),
  /* Rundeck, Linse, Blitzpunkt – die Konturform der Kameramarke. */
  instagram: (
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z" />
  ),
};

export interface BrandIconProps extends SVGProps<SVGSVGElement> {
  name: BrandName;
  size?: number;
}

export function BrandIcon({ name, size = 20, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
