import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "AGB",
  description: `Allgemeine Geschäftsbedingungen von ${site.name} für Reparaturaufträge.`,
  robots: { index: false, follow: true },
};

const sections = [
  {
    title: "1. Geltungsbereich",
    body: `Diese Bedingungen gelten für alle Reparaturaufträge zwischen ${site.legalName}, ${site.street}, ${site.zip} ${site.city} (nachfolgend „wir") und dem Auftraggeber. Abweichende Bedingungen des Auftraggebers gelten nur, wenn wir ihnen ausdrücklich schriftlich zustimmen.`,
  },
  {
    title: "2. Kostenvoranschlag und Festpreis",
    body: "Der über den Sofortpreis-Rechner ermittelte Preis ist ein Festpreis für den beschriebenen Schaden. Zeigt die Eingangsprüfung einen abweichenden oder zusätzlichen Defekt, informieren wir vor Ausführung und holen die Freigabe ein. Ohne Freigabe entstehen keine Kosten. Die Fehlerdiagnose selbst ist kostenlos.",
  },
  {
    title: "3. Auftragserteilung",
    body: "Der Auftrag kommt mit Übergabe des Geräts und Bestätigung des Leistungsumfangs zustande. Der Auftraggeber versichert, verfügungsberechtigt zu sein. Sperrcodes bzw. Entsperrinformationen sind bereitzustellen, soweit sie für Prüfung und Funktionstest erforderlich sind.",
  },
  {
    title: "4. Daten und Datensicherung",
    body: "Der Auftraggeber ist für die Sicherung seiner Daten vor Übergabe selbst verantwortlich. Wir greifen nur auf Daten zu, soweit dies für die Reparatur zwingend erforderlich ist. Für Datenverluste haften wir nur bei Vorsatz oder grober Fahrlässigkeit.",
  },
  {
    title: "5. Ersatzteile",
    body: "Wir verwenden Originalteile oder qualitativ gleichwertige Teile. Die verbaute Teilequalität wird auf Nachfrage vor Auftragsausführung benannt. Ausgetauschte Teile verbleiben bei uns, sofern nicht ausdrücklich anders vereinbart.",
  },
  {
    title: "6. Gewährleistung und Garantie",
    body: `Es gilt die gesetzliche Gewährleistung. Zusätzlich gewähren wir ${site.warrantyMonths} Monate Garantie auf das eingebaute Ersatzteil und unsere Arbeitsleistung. Ausgenommen sind neue Sturz-, Druck- und Feuchtigkeitsschäden sowie Eingriffe Dritter nach unserer Reparatur.`,
  },
  {
    title: "7. Geräte mit Vorschaden",
    body: "Bei Geräten mit Wasserschaden, Sturzschaden oder vorangegangenen Fremdreparaturen kann ein Reparaturerfolg nicht zugesichert werden. Auf solche Fälle weisen wir vor Auftragsausführung hin; die Garantie nach Ziffer 6 kann in diesen Fällen eingeschränkt sein.",
  },
  {
    title: "8. Abholung und Zahlung",
    body: "Die Zahlung ist nach abgeschlossener Reparatur bei Abholung fällig. Nicht abgeholte Geräte lagern wir kostenfrei drei Monate ab Fertigstellungsmitteilung; danach kann ein angemessenes Lagerentgelt anfallen.",
  },
  {
    title: "9. Haftung",
    body: "Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei der Verletzung von Leben, Körper und Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung ausgeschlossen.",
  },
  {
    title: "10. Widerruf",
    body: "Bei Verträgen, die außerhalb unserer Geschäftsräume oder im Fernabsatz geschlossen werden, steht Verbrauchern ein gesetzliches Widerrufsrecht zu. Bei einer auf ausdrücklichen Wunsch vorzeitig vollständig erbrachten Dienstleistung erlischt das Widerrufsrecht nach § 356 Abs. 4 BGB.",
  },
  {
    title: "11. Schlussbestimmungen",
    body: "Es gilt das Recht der Bundesrepublik Deutschland. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
  },
];

export default function AgbPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <p className="text-eyebrow">Rechtliches</p>
      <h1 className="text-headline mt-4">Allgemeine Geschäftsbedingungen</h1>
      <p className="mt-5 leading-relaxed text-ink-soft">
        Für Reparaturaufträge bei {site.legalName}. Fair, kurz und ohne
        Kleingedrucktes.
      </p>

      <div className="mt-10 space-y-8 leading-relaxed text-ink">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-title">{s.title}</h2>
            <p className="mt-3 text-ink-soft">{s.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
