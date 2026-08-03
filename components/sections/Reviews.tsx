"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { reviews, reviewSummary, formatReviewDate, type Review } from "@/lib/data/reviews";

/**
 * Review Experience – kein 08/15-Slider.
 *
 * Die Bewertung wird als Kennzahl inszeniert (Aggregat aus dem Google-Profil),
 * die einzelnen Stimmen liegen als schwebende Karten darunter und lassen sich
 * zu einem ruhigen Overlay öffnen. Quelle ist immer sichtbar: Google, mit
 * Direktlink zum Original.
 *
 * Es werden ausschließlich echte Rezensionen gerendert (siehe
 * lib/data/reviews.ts). Ist noch keine übertragen, zeigt die Sektion das
 * verifizierte Aggregat und führt zu den Originalen – statt Lücken mit
 * erfundenen Stimmen zu füllen.
 */

function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size}>
          <path
            d="m12 2.6 2.82 5.72 6.31.92-4.57 4.45 1.08 6.29L12 17.03 6.36 19.98l1.08-6.29L2.87 9.24l6.31-.92L12 2.6Z"
            fill={i < Math.round(value) ? "#FBBC05" : "var(--line-strong)"}
          />
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review, onOpen, index }: { review: Review; onOpen: () => void; index: number }) {
  const long = review.text.length > 190;
  return (
    <Reveal delay={index * 60}>
      <article
        className="review-card glass group flex h-full cursor-pointer flex-col rounded-[var(--radius-l)] p-5 text-left md:p-6"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Rezension von ${review.author} lesen`}
      >
        <div className="flex items-center justify-between gap-3">
          <Stars value={review.rating} />
          <GoogleG />
        </div>
        <p className="mt-3.5 flex-1 leading-relaxed text-ink">
          {long ? `${review.text.slice(0, 190).trimEnd()}…` : review.text}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <span className="min-w-0">
            <span className="block truncate text-[0.875rem] font-medium text-ink-strong">
              {review.author}
            </span>
            <span className="block font-mono text-[0.75rem] text-ink-faint">
              {formatReviewDate(review.date)}
              {review.device ? ` · ${review.device}` : ""}
            </span>
          </span>
          {long ? (
            <span className="shrink-0 text-[0.8125rem] font-medium text-accent">Lesen</span>
          ) : null}
        </div>
      </article>
    </Reveal>
  );
}

function ReviewOverlay({ review, onClose }: { review: Review; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    // Fokus in den Dialog holen und beim Schließen dorthin zurückgeben, wo er
    // herkam. Ohne das bleibt der Fokus hinter dem Overlay auf der Karte
    // stehen: Ein Screenreader liest weiter die Seite darunter vor, und die
    // Tabulatortaste wandert durch Inhalte, die niemand sieht.
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Rezension von ${review.author}`}
    >
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="cmdk-scrim absolute inset-0 bg-ink-strong/30 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="cmdk-panel glass-strong relative w-full max-w-lg rounded-[var(--radius-l)] p-6 shadow-floating outline-none md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <GoogleG size={18} />
            <span className="text-[0.8125rem] font-medium text-ink-soft">Google-Rezension</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="-mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink-strong"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mt-5">
          <Stars value={review.rating} size={17} />
        </div>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-strong">{review.text}</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="text-[0.9375rem] font-medium text-ink-strong">{review.author}</p>
            <p className="font-mono text-[0.75rem] text-ink-faint">
              {formatReviewDate(review.date)}
              {review.device ? ` · ${review.device}` : ""}
            </p>
          </div>
          <a
            href={reviewSummary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.875rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            Original bei Google
            <Icon name="arrow-up-right" size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

export function Reviews() {
  const [open, setOpen] = useState<Review | null>(null);
  const hasReviews = reviews.length > 0;

  return (
    <section className="border-y border-line bg-raised" id="bewertungen">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        {/* Kennzahl statt Slider-Kopf */}
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <span className="text-eyebrow">Bewertungen</span>
            <div className="mt-6 flex items-baseline gap-4">
              <span className="font-mono text-[4rem] font-semibold leading-none tracking-tight text-ink-strong md:text-[5.5rem]">
                {reviewSummary.rating.toLocaleString("de-DE", { minimumFractionDigits: 1 })}
              </span>
              <span className="text-left">
                <Stars value={reviewSummary.rating} size={19} />
                <span className="mt-1 block font-mono text-[0.8125rem] text-ink-soft">
                  {reviewSummary.count} Bewertungen
                </span>
              </span>
            </div>

            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-page px-3.5 py-1.5 text-[0.8125rem] text-ink-soft">
              <GoogleG size={15} />
              100 % echte Google-Rezensionen — ungefiltert
            </p>

            <h2 className="text-headline mt-8 max-w-2xl">
              Wir schreiben unsere Bewertungen nicht selbst.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
              Jede Stimme hier stammt aus dem Google-Unternehmensprofil und ist dort
              im Original nachlesbar. Keine Stockfotos, keine ausgedachten Namen,
              keine ausgewählten Rosinen.
            </p>
          </div>
        </Reveal>

        {hasReviews ? (
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <ReviewCard key={r.id} review={r} index={i} onOpen={() => setOpen(r)} />
            ))}
          </div>
        ) : (
          <Reveal delay={120}>
            {/* Ehrlicher Zustand: das verifizierte Aggregat trägt die Sektion,
                die Originale sind einen Klick entfernt. */}
            <div className="glass mx-auto mt-14 max-w-2xl rounded-[var(--radius-l)] p-8 text-center">
              <p className="leading-relaxed text-ink">
                Alle {reviewSummary.count} Rezensionen liegen im Google-Profil –
                dort sehen Sie jede Stimme im Original, mit Datum und Verlauf.
              </p>
              <a
                href={reviewSummary.url}
                target="_blank"
                rel="noopener noreferrer"
                data-magnetic=""
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-medium text-accent-contrast shadow-button transition-colors hover:bg-accent-hover"
                style={{ transitionProperty: "background-color" }}
              >
                Alle {reviewSummary.count} Rezensionen bei Google
                <Icon name="arrow-up-right" size={16} />
              </a>
            </div>
          </Reveal>
        )}

        {hasReviews ? (
          <Reveal delay={200}>
            <div className="mt-10 text-center">
              <a
                href={reviewSummary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
              >
                Alle {reviewSummary.count} Rezensionen bei Google ansehen
                <Icon name="arrow-up-right" size={16} />
              </a>
            </div>
          </Reveal>
        ) : null}
      </div>

      {open ? <ReviewOverlay review={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}
