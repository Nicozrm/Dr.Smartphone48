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
      {/* Gerätesilhouette */}
      <rect
        x="7.25"
        y="2.25"
        width="17.5"
        height="27.5"
        rx="4.25"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      {/* Diagnose-Kreuz, gestufte Enden */}
      <path
        d="M16 9.5v13M9.5 16h13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="square"
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
