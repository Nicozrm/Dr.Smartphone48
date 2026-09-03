"use client";

import { Icon } from "@/components/ui/Icon";
import { openingColor, useOpeningState } from "@/lib/opening";
import { site } from "@/lib/site";

/*
  Live-Verfügbarkeit – beantwortet die Frage, die jeder Besucher zuerst hat:
  „Kann ich jetzt hin?"

  Gerechnet wird in `lib/opening.ts`, und zwar nur einmal: Dieselbe Auskunft
  steht in der Aktionsleiste am unteren Bildschirmrand. Zwei Fassungen
  derselben Öffnungszeiten driften auseinander, und dann widerspricht die
  Seite sich selbst – auf demselben Bildschirm.

  Läuft rein clientseitig in der Zeitzone des Besuchers und aktualisiert sich
  jede Minute.
*/

export function LiveStatus({ className = "" }: { className?: string }) {
  const state = useOpeningState();

  // Vor der Hydration nichts behaupten – die Uhrzeit kennt nur der Client.
  if (!state) {
    return (
      <div className={`glass-pane p-5 ${className}`} data-depth="2">
        <p className="font-mono text-[0.8125rem] text-ink-faint">
          {site.openingHoursShort}
        </p>
      </div>
    );
  }

  const color = openingColor(state.tone);

  return (
    <div className={`glass-pane p-5 md:p-6 ${className}`} data-depth="2" data-sheen>
      <div className="flex items-start gap-4">
        <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
          {state.open ? (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{
                background: color,
                animation: "op-pulse 2.4s var(--ease-inout) infinite",
              }}
            />
          ) : null}
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-title" style={{ color: state.open ? undefined : "var(--ink-soft)" }}>
            {state.headline}
          </p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{state.detail}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={site.phoneHref}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[0.8125rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
            >
              <Icon name="phone" size={14} />
              {site.phone}
            </a>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[0.8125rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
