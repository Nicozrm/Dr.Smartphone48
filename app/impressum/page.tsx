import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false, follow: true },
};

export default function ImpressumPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <p className="text-eyebrow">Rechtliches</p>
      <h1 className="text-headline mt-4">Impressum</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-ink">
        <section>
          <h2 className="text-title">Angaben gemäß § 5 DDG</h2>
          <p className="mt-3">
            {site.legalName}
            <br />
            {site.street}
            <br />
            {site.zip} {site.city}
            <br />
            {site.country}
          </p>
        </section>

        <section>
          <h2 className="text-title">Kontakt</h2>
          <p className="mt-3">
            Telefon:{" "}
            <a href={site.phoneHref} className="text-accent hover:underline">
              {site.phone}
            </a>
            <br />
            E-Mail:{" "}
            <a href={`mailto:${site.email}`} className="text-accent hover:underline">
              {site.email}
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-title">Umsatzsteuer-Identifikationsnummer</h2>
          <p className="mt-3">
            Gemäß § 27a Umsatzsteuergesetz: {site.vatId}
          </p>
        </section>

        <section>
          <h2 className="text-title">Verantwortlich für den Inhalt</h2>
          <p className="mt-3">
            {site.legalName}
            <br />
            {site.street}, {site.zip} {site.city}
          </p>
        </section>

        <section>
          <h2 className="text-title">Streitbeilegung</h2>
          <p className="mt-3 text-ink-soft">
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>
        </section>

        <section>
          <h2 className="text-title">Haftung für Inhalte und Links</h2>
          <p className="mt-3 text-ink-soft">
            Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Für Inhalte externer
            Links ist ausschließlich deren Betreiber verantwortlich. Zum
            Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar.
            Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Links
            umgehend.
          </p>
        </section>

        <section>
          <h2 className="text-title">Urheberrecht</h2>
          <p className="mt-3 text-ink-soft">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke
            unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als
            solche gekennzeichnet.
          </p>
        </section>
      </div>
    </section>
  );
}
