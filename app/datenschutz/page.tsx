import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/datenschutz",
  title: "Datenschutzerklärung",
  description: `Wie ${site.name} personenbezogene Daten verarbeitet – Kontaktformular, Hosting, Ihre Rechte nach DSGVO.`,
  noindex: true,
});

export default function DatenschutzPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <p className="text-eyebrow">Rechtliches</p>
      <h1 className="text-headline mt-4">Datenschutzerklärung</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-ink">
        <section>
          <h2 className="text-title">Datenschutz auf einen Blick</h2>
          <p className="mt-3 text-ink-soft">
            Diese Website verarbeitet so wenige Daten wie möglich: Sie setzt
            keine Tracking-Cookies, keine Analysedienste und keine
            Werbenetzwerke ein. Der Sofortpreis-Rechner arbeitet vollständig in
            Ihrem Browser – Ihre Auswahl verlässt Ihr Gerät erst, wenn Sie uns
            aktiv eine Anfrage senden.
          </p>
        </section>
        <section>
          <h2 className="text-title">Verantwortliche Stelle</h2>
          <p className="mt-3">
            {site.legalName}
            <br />
            {site.street}, {site.zip} {site.city}
            <br />
            E-Mail: {site.email}
          </p>
        </section>
        <section>
          <h2 className="text-title">Kontaktaufnahme</h2>
          <p className="mt-3 text-ink-soft">
            Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir
            Ihre Angaben ausschließlich zur Bearbeitung Ihrer Anfrage
            (Art. 6 Abs. 1 lit. b DSGVO). Die Daten werden gelöscht, sobald sie
            für diesen Zweck nicht mehr erforderlich sind und keine
            gesetzlichen Aufbewahrungspflichten bestehen.
          </p>
        </section>
        <section>
          <h2 className="text-title">Hosting und Server-Logs</h2>
          <p className="mt-3 text-ink-soft">
            Beim Aufruf der Website verarbeitet der Hosting-Anbieter technisch
            notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite), um die
            Website sicher auszuliefern (Art. 6 Abs. 1 lit. f DSGVO).
          </p>
        </section>
        <section>
          <h2 className="text-title">Ihre Rechte</h2>
          <p className="mt-3 text-ink-soft">
            Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
            Widerspruch. Wenden Sie sich dazu formlos an {site.email}. Zudem
            besteht ein Beschwerderecht bei der zuständigen Aufsichtsbehörde.
          </p>
        </section>
        <p className="border-t border-line pt-6 text-[0.875rem] text-ink-faint">
          Hinweis: Dies ist eine Platzhalter-Datenschutzerklärung. Vor
          Veröffentlichung juristisch prüfen und vervollständigen.
        </p>
      </div>
    </section>
  );
}
