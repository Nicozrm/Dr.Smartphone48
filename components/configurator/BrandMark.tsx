/**
 * BrandMark – die Gerätesignatur einer Marke.
 *
 * Bewusst **kein** Herstellerlogo. Zwei Gründe, beide praktisch:
 *
 * Erstens sind Wort- und Bildmarken geschützt. Eine Werkstatt darf sie nennen,
 * um zu sagen, was sie repariert – sie als Gestaltungselement über eine
 * Auswahlkachel zu legen, sieht dagegen nach Autorisierung aus, die es nicht
 * gibt.
 *
 * Zweitens ist es die schlechtere Zeichnung. Ein Logo sagt „Hersteller", die
 * Silhouette sagt „Ihr Gerät" – und genau darum geht es an dieser Stelle. Die
 * drei Signaturen zeigen deshalb das eine Merkmal, an dem man eine Baureihe
 * auch aus dem Augenwinkel erkennt: die Pille oben, das Loch in der Mitte,
 * der Kamerabalken quer über die Rückseite.
 */
export type BrandMarkId = "apple" | "samsung" | "google";

const stroke = "currentColor";

export function BrandMark({
  brand,
  className = "",
}: {
  brand: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 64"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {brand === "google" ? (
        <>
          {/* Rückseite mit durchgehendem Kamerabalken. */}
          <rect x="6" y="3" width="32" height="58" rx="8" />
          <rect x="6" y="14" width="32" height="9" rx="3" />
          <circle cx="15" cy="18.5" r="2.4" />
          <circle cx="23" cy="18.5" r="2.4" />
        </>
      ) : brand === "samsung" ? (
        <>
          {/* Front mit mittigem Kameraloch, flachere Ecken. */}
          <rect x="6" y="3" width="32" height="58" rx="6" />
          <circle cx="22" cy="10" r="2" />
        </>
      ) : (
        <>
          {/* Front mit Pille oben, weiche Ecken. */}
          <rect x="6" y="3" width="32" height="58" rx="9" />
          <rect x="16" y="7.5" width="12" height="5" rx="2.5" />
        </>
      )}
    </svg>
  );
}
