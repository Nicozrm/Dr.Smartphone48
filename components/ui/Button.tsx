import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-full transition-[background-color,color,border-color,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-button",
  secondary:
    "bg-transparent text-ink-strong border border-line-strong hover:border-ink-strong",
  ghost: "bg-transparent text-ink-strong hover:bg-sunken",
  inverse: "bg-white text-[#141517] hover:bg-[#e9e9e6] shadow-raised",
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
  // Bei magnetischen Buttons steuert JS die Transform-Ebene – die CSS-Transition
  // darf transform daher nicht mitanimieren, sonst schleppt die Bewegung nach.
  const magProps = isMagnetic
    ? { "data-magnetic": "", style: { transitionProperty: "background-color, color, border-color, box-shadow" } }
    : {};

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link href={rest.href} className={cls} {...magProps}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={cls}
      {...magProps}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
