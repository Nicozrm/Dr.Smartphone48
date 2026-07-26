import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  inverse?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  inverse = false,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <p className={`text-eyebrow ${inverse ? "text-ink-inverse-soft" : ""}`}>{eyebrow}</p>
      <h2 className={`text-headline mt-4 ${inverse ? "text-ink-inverse" : ""}`}>{title}</h2>
      {lede ? (
        <p
          className={`mt-5 text-lg leading-relaxed ${
            inverse ? "text-ink-inverse-soft" : "text-ink-soft"
          }`}
        >
          {lede}
        </p>
      ) : null}
    </Reveal>
  );
}
