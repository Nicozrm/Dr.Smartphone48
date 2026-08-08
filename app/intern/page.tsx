import { InternHome } from "@/components/intern/InternHome";
import { pageMeta } from "@/lib/seo";

/*
  Der Einstieg für den Betrieb.

  Wie die drei Werkzeuge darunter: nicht verlinkt, nicht in der Sitemap,
  `noindex, nofollow` per Metadaten und `Disallow: /intern/` in robots.ts.
  Der eigentliche Schutz steht auch hier nicht dort, sondern in der
  Datenbank – die Adresse zu kennen nützt niemandem ohne Anmeldung und ohne
  Eintrag in `workshop_staff`.

  Server-Komponente ohne Datenzugriff, aus demselben Grund wie bei
  /intern/werkstatt: Ein `cookies()`-Aufruf beim Rendern verträgt sich nicht
  mit `output: "export"`, und dieses Projekt baut auch statisch. Alles
  Angebundene lebt deshalb in der Client-Komponente.
*/

export const metadata = {
  ...pageMeta({
    path: "/intern",
    title: "Intern",
    description: "Einstieg für den Betrieb.",
    noindex: true,
  }),
  /*
    Wie beim Rechnungswerkzeug: `pageMeta` setzt `follow: true`, richtig für
    öffentliche Seiten, die nur nicht in den Index sollen (/offline). Hier
    wiegt das schwerer als dort, denn diese Seite ist die einzige, die alle
    drei internen Werkzeuge **verlinkt** – sie einem Crawler zum
    Weiterverfolgen anzubieten wäre genau das Gegenteil ihres Zwecks.
  */
  robots: { index: false, follow: false, nocache: true },
};

export default function InternPage() {
  return (
    <section className="pb-24 pt-28 md:pt-32">
      <InternHome />
    </section>
  );
}
