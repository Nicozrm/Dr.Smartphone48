import { faq } from "@/lib/data/faq";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SectionHeading
        eyebrow="Fragen"
        title="Was Sie wissen möchten."
        align="center"
      />
      <div className="mt-12 divide-y divide-line border-y border-line">
        {faq.map((entry, i) => (
          <Reveal key={entry.question} delay={i * 40}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-[1.0625rem] font-medium text-ink-strong">
                  {entry.question}
                </span>
                <Icon
                  name="chevron-down"
                  size={18}
                  className="shrink-0 text-ink-faint transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] group-open:rotate-180"
                />
              </summary>
              <p className="pb-6 pr-10 leading-relaxed text-ink-soft">{entry.answer}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
