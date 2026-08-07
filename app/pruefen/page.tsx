import Link from "next/link";
import { Limits, VerifyView } from "@/components/cert/VerifyView";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

/*
  Die Prüfseite.

  Jeder Reparaturbetrieb in Deutschland schreibt „geprüfte Qualität" auf
  seine Rechnung. Niemand kann das nachprüfen. Ein Protokoll, das der
  Aussteller jederzeit umschreiben kann, belegt nichts – es behauptet etwas
  mit Briefkopf.

  Diese Seite ist der Versuch, aus der Behauptung einen Beleg zu machen: Das
  Prüfprotokoll wird nach der Reparatur unterschrieben, kryptografisch, und
  der Kunde nimmt es mit. Wer eine Position nachträglich ändert, zerstört die
  Unterschrift – auch wir.

  Zwei Dinge, die diese Seite deshalb aushalten muss:

  1. **Sie darf nicht mehr versprechen, als sie hält.** Eine Signatur beweist
     Unversehrtheit und Herkunft, nicht Sorgfalt. Der Abschnitt „Was er nicht
     beweist" steht deshalb gleichberechtigt neben dem anderen und wird nicht
     kleiner gesetzt.
  2. **Sie muss ohne uns funktionieren.** Kein Server, keine Datenbank, keine
     Anfrage: Der ganze Beleg steht im Fragment der Adresse, geprüft wird im
     Browser des Kunden. Auch in fünf Jahren, auch wenn dieser Betrieb dann
     nicht mehr existiert – solange die öffentliche Hälfte des Schlüssels
     erreichbar ist.
*/

export const metadata = pageMeta({
  path: "/pruefen",
  title: "Reparaturzertifikat prüfen",
  description:
    "Jede Reparatur endet mit einem kryptografisch unterschriebenen Prüfprotokoll. Hier lässt sich nachrechnen, dass daran seit der Ausstellung nichts geändert wurde – ohne Anruf, ohne Konto, im eigenen Browser.",
});

export default function PruefenPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Zertifikat prüfen", path: "/pruefen" }])}
      />

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-3xl">
          <p className="text-eyebrow">Reparaturzertifikat</p>
          <h1 className="text-display mt-4 text-balance">
            Vertrauen ist gut.
            <br />
            Nachrechnen ist besser.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Jede Reparatur bei {site.name} endet mit einem Prüfprotokoll, das
            wir unterschreiben – nicht mit einem Kugelschreiber, sondern mit
            einem Schlüssel, den nur wir haben. Ändert danach irgendjemand eine
            Zeile daran, auch wir selbst, ist die Unterschrift kaputt. Das
            sehen Sie hier in zwei Sekunden.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <VerifyView />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <Reveal>
          <Limits />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-28 md:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-title">Warum wir uns das antun</h2>
          <p className="mt-5 leading-relaxed text-ink-soft">
            Weil die einzige Zusage, die in dieser Branche zählt, die ist, die
            man auch gegen uns verwenden kann. Ein Protokoll, das wir
            nachträglich schönen könnten, wäre für Sie wertlos und für uns
            bequem. Dieses hier ist umgekehrt: unbequem für uns, prüfbar für
            Sie.
          </p>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Wie das Verfahren funktioniert, steht offen im Quelltext dieser
            Seite – Format, Schlüsselring und Prüfung. Es gibt daran nichts
            geheim zu halten außer der privaten Hälfte des Schlüssels, und die
            liegt auf einem Rechner in der Werkstatt, nicht auf einem Server.
          </p>
          <p className="mt-8 text-sm text-ink-faint">
            Fragen zum Beleg?{" "}
            <Link href="/kontakt" className="text-accent hover:underline">
              Schreiben Sie uns
            </Link>{" "}
            oder rufen Sie an: {site.phone}.
          </p>
        </Reveal>
      </section>
    </>
  );
}
