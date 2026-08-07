import { Reveal } from "@/components/ui/Reveal";
import { HandoverAssistant } from "@/components/handover/HandoverAssistant";
import { HandoverReference } from "@/components/handover/HandoverReference";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  path: "/vorbereitung",
  title: "Vor der Abgabe – was Sie vorher erledigen sollten",
  description:
    "Backup, Aktivierungssperre, Sperrcode, SIM: Was vor einer Reparatur zu tun ist – mit dem konkreten Weg im Gerät und der ehrlichen Folge, wenn ein Schritt ausbleibt. Ohne Konto, nichts wird gespeichert.",
});

/*
  Vorbereitungsseite.

  Sie schließt die Lücke zwischen Angst und Auftrag. Die häufigste unausge-
  sprochene Frage vor einem Werkstattbesuch ist nicht „was kostet das", sondern
  „was passiert mit meinen Daten" – und darauf antwortet die Branche
  üblicherweise mit einem Satz über Vertrauen. Hier steht stattdessen, was
  konkret zu tun ist, warum, und was entfällt, wenn man es lässt.

  Abgrenzung zum Reparatur-Ticket: /ticket **protokolliert** bei der Übergabe,
  dass Backup und Gerätesuche erledigt sind. Diese Seite erklärt, **wie** das
  geht – und wird zu Hause gelesen, nicht am Tresen.
*/

/**
 * Die Schritte zusätzlich als HowTo. Wer „iPhone vor Reparatur vorbereiten"
 * sucht, soll die Anleitung finden – auch ohne die Seite zu öffnen.
 */
const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "@id": `${site.url}/vorbereitung#howto`,
  name: "Smartphone vor der Reparatur vorbereiten",
  description:
    "Datensicherung anlegen, Aktivierungssperre lösen, Sperrcode-Umgang klären und SIM entnehmen – bevor das Gerät in die Werkstatt geht.",
  inLanguage: "de-DE",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Datensicherung anlegen und prüfen",
      text: "Backup über iCloud, Computer oder das Google-Konto erstellen und anschließend den Zeitstempel der letzten erfolgreichen Sicherung kontrollieren.",
      url: `${site.url}/vorbereitung`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Aktivierungssperre lösen",
      text: "Bei iPhones „Wo ist?“ deaktivieren, bei Android das Google-Konto entfernen oder die Zugangsdaten bereithalten. Sonst ist die Funktionsprüfung nach dem Einbau nur eingeschränkt möglich.",
      url: `${site.url}/vorbereitung`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Umgang mit dem Sperrcode entscheiden",
      text: "Gerät entsperrt übergeben, den Code vor Ort mündlich nennen oder ihn behalten. Jede Variante bestimmt, welche Bauteile nach der Reparatur geprüft werden können.",
      url: `${site.url}/vorbereitung`,
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "SIM und Speicherkarte entnehmen",
      text: "Karten und Hülle vor der Abgabe entnehmen. Eine eSIM bleibt im Gerät und muss nicht gelöscht werden.",
      url: `${site.url}/vorbereitung`,
    },
  ],
};

export default function VorbereitungPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <JsonLd data={breadcrumbJsonLd([{ name: "Vor der Abgabe", path: "/vorbereitung" }])} />
      <JsonLd data={howToJsonLd} />

      <Reveal className="max-w-2xl" printHide>
        <p className="text-eyebrow">Vor der Abgabe</p>
        <h1 className="text-display mt-4">
          Zehn Minuten zu Hause
          <br />
          sparen den Ärger danach.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Vier Dinge sollten erledigt sein, bevor ein Gerät in die Werkstatt
          geht. Hier steht zu jedem der Weg im Gerät, der Stolperstein – und
          was tatsächlich passiert, wenn Sie ihn auslassen.
        </p>
      </Reveal>

      {/* Mit JavaScript der Assistent, ohne JavaScript derselbe Inhalt als
          Fließtext. Genau eine der beiden Fassungen ist sichtbar – gesteuert
          über das html[data-js]-Gate in globals.css. */}
      <div className="mt-14 md:mt-16">
        <div className="js-only">
          <HandoverAssistant />
        </div>
        <div className="nojs-only">
          <HandoverReference />
        </div>
      </div>
    </section>
  );
}
