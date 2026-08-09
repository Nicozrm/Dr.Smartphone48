import { WorkshopDashboard } from "@/components/workshop/WorkshopDashboard";
import { InternNav } from "@/components/intern/InternNav";
import { pageMeta } from "@/lib/seo";

/*
  Die Werkstattansicht.

  Wie das Rechnungswerkzeug unter /intern/rechnung: nicht verlinkt, nicht in
  der Sitemap, `noindex, nofollow` per Metadaten und `Disallow: /intern/` in
  robots.ts. Der eigentliche Schutz steht allerdings nicht dort, sondern in
  der Datenbank – die Adresse zu kennen nützt niemandem ohne Anmeldung und
  ohne Eintrag in `workshop_staff`.

  Diese Datei ist eine Server-Komponente ohne Datenzugriff. Der Grund ist
  praktisch: Ein `cookies()`-Aufruf beim Rendern verträgt sich nicht mit
  `output: "export"`, und dieses Projekt baut auch statisch. Die Seite steht
  deshalb überall – und sagt im statischen Export ehrlich, dass es hier nichts
  zu bedienen gibt.
*/

export const metadata = pageMeta({
  path: "/intern/werkstatt",
  title: "Werkstatt",
  description: "Interne Vorgangsverwaltung.",
  noindex: true,
});

export default function WerkstattPage() {
  return (
    <>
      <div className="pt-28 md:pt-32">
        <InternNav current="/intern/werkstatt" />
      </div>
      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <WorkshopDashboard />
      </section>
    </>
  );
}
