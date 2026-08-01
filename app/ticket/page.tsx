import type { Metadata } from "next";
import { Suspense } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { RepairTicket } from "@/components/ticket/RepairTicket";

export const metadata: Metadata = {
  title: "Reparatur-Ticket & Übergabeprotokoll",
  description:
    "Ihr Kostenvoranschlag als Dokument: Vorgangsnummer, QR-Code zum Vorzeigen, Schadenskarte und druckbares Übergabeprotokoll. Ohne Konto, ohne gespeicherte Daten.",
  // Ein Ticket ohne Parameter ist eine leere Hülle – nichts, was in einem
  // Suchergebnis stehen sollte.
  robots: { index: false, follow: true },
};

export default function TicketPage() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <Reveal className="max-w-2xl" printHide>
        <p className="text-eyebrow">Reparatur-Ticket</p>
        <h1 className="text-display mt-4">
          Alles geklärt,
          <br />
          bevor Sie hereinkommen.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Ihr Voranschlag mit eigener Vorgangsnummer, einem QR-Code zum
          Vorzeigen und einem Übergabeprotokoll, das Sie ausdrucken können.
          Kein Konto, keine Anmeldung, keine gespeicherten Daten.
        </p>
      </Reveal>

      <div className="mt-14 md:mt-16">
        {/* useSearchParams braucht im statischen Export eine Grenze, hinter
            der der Server nicht mehr rendert. */}
        <Suspense
          fallback={
            <div
              className="h-72 animate-pulse rounded-[var(--radius-l)] border border-line bg-sunken"
              aria-hidden="true"
            />
          }
        >
          <RepairTicket />
        </Suspense>
      </div>
    </section>
  );
}
