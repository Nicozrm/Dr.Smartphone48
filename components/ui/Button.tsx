import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "lg";

/*
  Die Schaltfläche trägt drei Ebenen Reaktion, die nacheinander greifen:

  – Hover: Der Schatten wächst, die Fläche bleibt an Ort und Stelle. Nur der
    Lichtwurf verrät, dass sie ansprechbar ist.
  – Druck: `.press` staucht auf 0.985 (globals.css) und federt zurück.
  – Loslassen: Der Ripple läuft vom Druckpunkt aus (Ripple.tsx).

  `.press` und `[data-ripple]` stehen im Basis-String, damit keine
  Schaltfläche der Seite sie versehentlich auslässt – eine, die nicht
  reagiert, fällt mehr auf als zehn, die es tun.
*/
const base =
  "press relative inline-flex items-center justify-center font-medium whitespace-nowrap rounded-full transition-[background-color,color,border-color,box-shadow,scale] duration-[var(--duration-base)] ease-[var(--ease-out)] disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // `breathe` färbt die Fläche selbst und lässt sie über 24 Sekunden zwischen
  // zwei kaum unterscheidbaren Blautönen wandern. `bg-accent` bleibt als
  // Rückfall stehen, falls color-mix fehlt; beim Überfahren übernimmt
  // `hover:bg-accent-hover`, weil eine Utility-Klasse in der Kaskade nach
  // `.breathe` ausgegeben wird.
  primary:
    "breathe bg-accent text-accent-contrast hover:bg-accent-hover shadow-button hover:shadow-[var(--shadow-button-hover)]",
  secondary:
    "bg-transparent text-ink-strong border border-line-strong hover:border-ink-strong hover:shadow-raised",
  ghost: "bg-transparent text-ink-strong hover:bg-sunken",
  inverse: "bg-white text-[#141517] hover:bg-[#e9e9e6] shadow-raised hover:shadow-floating",
};

/** Auf hellen Flächen braucht der Ripple Graphit statt Weiß. */
const rippleTint: Record<Variant, string> = {
  primary: "",
  secondary: "ink",
  ghost: "ink",
  inverse: "ink",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Leichte magnetische Anziehung zum Zeiger (nur feiner Pointer). */
  magnetic?: boolean;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & { href: string };

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  magnetic,
  children,
  ...rest
}: ButtonAsButton | ButtonAsLink) {
  // Primäre und inverse CTAs sind standardmäßig magnetisch.
  const isMagnetic = magnetic ?? (variant === "primary" || variant === "inverse");
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  /*
    Die magnetische Anziehung schreibt --mag-x/--mag-y, der Druckpunkt
    animiert `scale`. Beide laufen über getrennte CSS-Eigenschaften und
    brauchen deshalb keine Sonderbehandlung mehr an der Schaltfläche selbst –
    früher stand hier ein style-Override, das `transform` aus der Transition
    nehmen musste, damit die Anziehung nicht nachschleppt.
  */
  const extra = {
    "data-ripple": rippleTint[variant],
    ...(isMagnetic ? { "data-magnetic": "" } : {}),
  };

  /*
    Der Inhalt steckt in einer eigenen positionierten Ebene.

    Grund ist die Malreihenfolge: Ein positioniertes Element – und der Ripple
    muss positioniert sein – wird immer nach dem gewöhnlichen Textfluss
    gezeichnet, unabhängig von der Reihenfolge im DOM. Ohne diese Ebene liefe
    die Lichtwelle also über der Beschriftung statt darunter und ließe sie für
    einen Moment aufblitzen.
  */
  const label = (
    <span className="relative z-[1] inline-flex items-center justify-center gap-2">
      {children}
    </span>
  );

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link href={rest.href} className={cls} {...extra}>
        {label}
      </Link>
    );
  }

  return (
    <button
      className={cls}
      {...extra}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {label}
    </button>
  );
}
