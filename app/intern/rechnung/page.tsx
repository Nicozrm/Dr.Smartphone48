import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { InvoiceBuilder } from "@/components/invoice/InvoiceBuilder";

/*
  Internes Werkzeug. Nicht in der Navigation, nicht in der Sitemap, nicht im
  Index – erreichbar nur über die Adresse. Es gibt hier nichts zu holen: Alle
  Daten liegen im Browser des Geschäftsführers, der Server kennt sie nicht.
*/

export const metadata: Metadata = {
  ...pageMeta({
    path: "/intern/rechnung",
    title: "Rechnung schreiben",
    description: "Internes Werkzeug zur Rechnungsstellung.",
    noindex: true,
  }),
  // pageMeta setzt `follow: true` – richtig für öffentliche Seiten, die nur
  // nicht in den Index sollen (/offline). Ein internes Werkzeug soll ein
  // Crawler dagegen weder aufnehmen noch weiterverfolgen noch vorhalten.
  robots: { index: false, follow: false, nocache: true },
};

export default function RechnungPage() {
  return (
    <div className="inv-page pt-16">
      <InvoiceBuilder />
    </div>
  );
}
