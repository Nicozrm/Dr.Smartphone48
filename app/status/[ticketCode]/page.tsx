import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { TicketStatusView } from "@/components/status/TicketStatusView";
import { normalizeTicketCode } from "@/lib/tickets/code";
import { pageMeta } from "@/lib/seo";

/*
  Die Seite hinter dem QR-Code.

  Sie ist bewusst dünn: Rahmen, Überschrift, und darunter eine
  Client-Komponente, die lädt und zuhört. Alles, was sich nicht ändert, ist
  eine Server-Komponente und kostet kein einziges Byte JavaScript – nur der
  lebende Teil ist ein Client-Bündel.

  Ohne `generateStaticParams`: Zur Bauzeit gibt es keinen Vorgang, und ein zur
  Bauzeit eingefrorener Zustand wäre das Gegenteil einer Statusseite. Die
  Seite entsteht bei Aufruf.

  Im statischen Export gibt es sie deshalb gar nicht – `output: "export"`
  verlangt für jedes dynamische Segment eine vollständige Liste, und eine
  leere lehnt Next.js ausdrücklich ab. `scripts/build-static.mjs` legt diesen
  Ordner darum beiseite, genau wie `app/api`. Ohne Server gäbe es hier ohnehin
  nichts abzufragen, und `/status` sagt das dort auch.
*/

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticketCode: string }>;
}) {
  const { ticketCode } = await params;
  const code = normalizeTicketCode(decodeURIComponent(ticketCode)) ?? "";

  return pageMeta({
    path: `/status/${code}`,
    title: code ? `Vorgang ${code}` : "Vorgang",
    description:
      "Der aktuelle Stand Ihrer Reparatur: Zustand, Zeitleiste und Auftrag. Aktualisiert sich von selbst.",
    // Ein Vorgang ist die Sache eines Menschen. Er hat in keinem
    // Suchergebnis etwas verloren – auch nicht in einem, das niemand liest.
    noindex: true,
  });
}

export default async function TicketStatusPage({
  params,
}: {
  params: Promise<{ ticketCode: string }>;
}) {
  const { ticketCode } = await params;
  const code = normalizeTicketCode(decodeURIComponent(ticketCode));

  // Eine Adresse, die keine Vorgangsnummer sein kann, ist keine Seite. Das
  // spart die Anfrage an den Server und ist die ehrlichere Antwort als eine
  // Statusseite, die „nicht gefunden" zeigt.
  if (!code) notFound();

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <Reveal className="max-w-2xl">
        <p className="text-eyebrow">Reparaturstatus</p>
        <h1 className="text-display mt-4">
          Ihr Gerät,
          <br />
          in Echtzeit.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Diese Seite zeigt, wo Ihre Reparatur gerade steht. Sie aktualisiert
          sich von selbst, sobald sich in der Werkstatt etwas ändert – ohne
          Neuladen, ohne Konto.
        </p>
      </Reveal>

      <div className="mt-14 md:mt-16">
        <Suspense
          fallback={
            <div
              className="h-72 animate-pulse rounded-[var(--radius-l)] border border-line bg-sunken"
              aria-hidden="true"
            />
          }
        >
          <TicketStatusView ticketCode={code} />
        </Suspense>
      </div>
    </section>
  );
}
