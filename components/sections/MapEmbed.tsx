"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { site, fullAddress } from "@/lib/site";

/*
  Karte auf Klick.

  Vorher stand hier ein Google-Maps-iframe mit loading="lazy". Das klingt
  zurückhaltend, ist es aber nicht: „lazy" verzögert den Abruf nur, bis die
  Karte in die Nähe des sichtbaren Bereichs kommt. Wer bis hierher scrollt,
  baut also eine Verbindung zu Google auf, ohne je danach gefragt worden zu
  sein – während die Datenschutzerklärung nebenan behauptete, das geschehe
  erst beim Anklicken.

  Von zwei Wegen, den Widerspruch aufzulösen, ist das hier der bessere: nicht
  die Erklärung an das Verhalten anpassen, sondern das Verhalten an das
  Versprechen. Bis zum Klick verlässt nichts das Gerät; die Vorschau ist
  selbst gezeichnet, und wer nur die Adresse braucht, liest sie ohnehin
  darüber.
*/

export function MapEmbed() {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-l)] border border-line shadow-raised">
        <iframe
          src={site.google.embedUrl}
          title={`Standort von ${site.name} auf Google Maps`}
          referrerPolicy="no-referrer-when-downgrade"
          className="h-[360px] w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-l)] border border-line bg-sunken shadow-raised">
      {/* Selbst gezeichnete Vorschau – kein fremder Abruf, kein fremdes Bild */}
      <svg
        viewBox="0 0 800 360"
        className="h-[360px] w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M40 0H0v40"
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="800" height="360" fill="var(--surface-sunken)" />
        <rect width="800" height="360" fill="url(#map-grid)" />
        {/* Angedeutete Straßenzüge, rein dekorativ */}
        <path
          d="M-20 250 L300 250 L340 210 L620 210 L820 190"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M180 -20 L180 160 L220 200 L220 380"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M540 -20 L540 380"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle cx="400" cy="180" r="52" fill="var(--accent)" opacity="0.08" />
        <circle cx="400" cy="180" r="26" fill="var(--accent)" opacity="0.12" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-raised">
          <Icon name="pin" size={21} />
        </span>
        <p className="mt-4 font-mono text-[0.8125rem] text-ink-strong">
          {fullAddress}
        </p>
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink-strong px-5 text-[0.9375rem] font-medium text-[var(--surface-page)] transition-opacity duration-[var(--duration-fast)] hover:opacity-90"
        >
          Karte von Google laden
          <Icon name="arrow-right" size={16} />
        </button>
        <p className="mt-3 max-w-sm text-[0.8125rem] leading-relaxed text-ink-soft">
          Erst mit diesem Klick wird eine Verbindung zu Google hergestellt und
          Ihre IP-Adresse dorthin übertragen. Bis dahin verlässt nichts Ihr
          Gerät.
        </p>
      </div>
    </div>
  );
}
