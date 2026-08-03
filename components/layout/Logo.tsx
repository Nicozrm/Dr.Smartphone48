import { site } from "@/lib/site";

interface LogoProps {
  inverse?: boolean;
  /** Nur die Bildmarke, ohne Wortmarke (z. B. für enge Kontexte). */
  markOnly?: boolean;
}

/**
 * Bildmarke: ein Kreuz aus dem medizinischen Kontext, eingeschrieben in die
 * Silhouette eines Geräts. „Dr" und „Smartphone" in einer Form – gefräst,
 * 90°-Terminals, kein Container-Badge. Funktioniert graviert, einfarbig und
 * bei 16 px.
 */
export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      fill="none"
    >
      {/* Gerätesilhouette. Maße wie im Favicon (app/icon.svg): 0,658 breit zu
          hoch, Ecken 32 % der Breite, Strich 10 % – damit Kopfzeile und
          Browser-Tab dieselbe Marke zeigen und nicht zwei Verwandte. */}
      <rect
        x="7"
        y="2.3"
        width="18"
        height="27.4"
        rx="5.8"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* Diagnose-Kreuz. Es füllt das Gerät fast aus – genau das macht die
          Marke bei 16 px noch erkennbar. */}
      <path
        d="M16 5.5v21M8.8 16h14.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ inverse = false, markOnly = false }: LogoProps) {
  const tone = inverse ? "text-ink-inverse" : "text-ink-strong";
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 select-none">
      <LogoMark className={`shrink-0 ${tone}`} />
      {markOnly ? null : (
        <span
          className={`whitespace-nowrap text-[1.0625rem] font-semibold tracking-[-0.025em] ${tone}`}
        >
          {site.name}
        </span>
      )}
    </span>
  );
}
