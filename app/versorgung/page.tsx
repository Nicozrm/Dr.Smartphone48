import Link from "next/link";
import { SupportHorizon } from "@/components/support/SupportHorizon";
import { SupportTable } from "@/components/support/SupportTable";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { brands } from "@/lib/data/devices";
import { SUPPORT_CHECKED, supportEntries, supportFor } from "@/lib/data/support";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

/*
  Der Update-Horizont.

  Die Frage, an der eine Reparaturentscheidung wirklich hängt, und die in
  dieser Branche nirgends beantwortet wird: Wie lange bekommt dieses Gerät
  noch Sicherheitsupdates? Ein Displaytausch für 219 € an einem Telefon, das
  in einem halben Jahr keine geschlossenen Lücken mehr sieht, ist eine
  schlechte Entscheidung – und wir sind die Einzigen, die davon wüssten.

  Deshalb steht die Tabelle hier, vollständig, für alle Modelle, die wir
  reparieren. Mit dem Hinweis, welche Angabe eine Zusage des Herstellers ist
  und welche eine Schätzung. Das kostet uns hin und wieder einen Auftrag.
  Es ist der Grund, warum man wiederkommt.
*/

export const metadata = pageMeta({
  path: "/versorgung",
  title: "Update-Horizont: Wie lange Ihr Handy noch Sicherheitsupdates bekommt",
  description:
    "Für jedes Modell, das wir reparieren: bis wann es neue Android- oder iOS-Versionen bekommt und bis wann Sicherheitsupdates. Herstellerzusagen und Schätzungen klar getrennt.",
});

/** Ein Beispiel, an dem die Zeitachse erklärt wird. */
const BEISPIEL = "galaxy-s22";

export default function VersorgungPage() {
  const beispiel = supportFor(BEISPIEL)!;
  const beispielName = brands
    .flatMap((b) => b.models)
    .find((m) => m.id === BEISPIEL)!.name;

  const zusagen = supportEntries.filter((e) => e.source === "hersteller").length;
  const geprueft = new Date(SUPPORT_CHECKED).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Update-Horizont", path: "/versorgung" }])} />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Update-Horizont</p>
          {/* Umbruch von Hand: `text-display` läuft sonst über vier Zeilen,
              weil der Satz breiter ist als die Textspalte. */}
          <h1 className="text-display mt-4 text-balance">
            Reparieren lohnt.
            <br />
            Bis zu einem Datum.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Irgendwann bekommt jedes Telefon keine Sicherheitsupdates mehr.
            Ab da ist es kein langsames Gerät, sondern ein offenes. Wann das
            ist, entscheidet der Hersteller – und schreibt es fast nie dorthin,
            wo man es sucht. Hier steht es für jedes Modell, das wir
            reparieren.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <SupportHorizon entry={beispiel} name={beispielName} />
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-5 max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
            So liest sich die Zeitachse: Der kräftige Teil ist der Zeitraum mit
            neuen Betriebssystem-Versionen, der blasse die Nachlaufzeit, in der
            es nur noch Sicherheitskorrekturen gibt. Beide Zahlen zählen ab
            Markteinführung – nicht ab Ihrem Kaufdatum. Ein 2023 gekauftes
            Gerät von 2022 hat ein Jahr weniger, als die Werbung nahelegt.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Alle Modelle"
            title="Jedes Gerät, das wir reparieren."
            lede={`${supportEntries.length} Modelle, davon ${zusagen} mit einer ausdrücklichen Zusage des Herstellers. Der Rest ist geschätzt – Apple nennt keinen Zeitraum. Was geschätzt ist, steht als Schätzung da.`}
          />

          <div className="mt-12">
            <SupportTable />
          </div>

          <p className="mt-8 font-mono text-[0.75rem] text-ink-faint">
            Angaben zuletzt geprüft am {geprueft}. Hersteller ändern ihre
            Zusagen; wenn Ihnen hier etwas veraltet vorkommt, sagen Sie uns
            Bescheid.
          </p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
            <Reveal>
              <h2 className="text-headline">Was das praktisch heißt.</h2>
              <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
                <p>
                  <strong className="font-medium text-ink-strong">
                    Über drei Jahre Restlaufzeit:
                  </strong>{" "}
                  Reparieren, ohne lange zu rechnen. Das ist länger, als die
                  meisten Menschen ihr Telefon ohnehin behalten.
                </p>
                <p>
                  <strong className="font-medium text-ink-strong">
                    Ein bis drei Jahre:
                  </strong>{" "}
                  Kommt auf den Preis an. Ein Akku für 79 € rechnet sich fast
                  immer, ein Rückglas für 159 € selten. Der Sofortpreis-Rechner
                  zeigt beides nebeneinander.
                </p>
                <p>
                  <strong className="font-medium text-ink-strong">
                    Unter einem Jahr:
                  </strong>{" "}
                  Wir sagen Ihnen, was die Reparatur kostet, und dass wir an
                  Ihrer Stelle das Geld eher in ein aufbereitetes Gerät stecken
                  würden. Beides bekommen Sie bei uns.
                </p>
                <p>
                  <strong className="font-medium text-ink-strong">
                    Abgelaufen:
                  </strong>{" "}
                  Wir reparieren es trotzdem, wenn Sie das möchten. Als
                  Zweitgerät, als Musikspieler, als Wecker gibt es dafür gute
                  Gründe. Für Online-Banking gibt es keinen.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h2 className="text-headline">Warum wir das zeigen.</h2>
              <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
                <p>
                  Weil es die einzige Zahl ist, die eine Reparatur wirklich
                  entwerten kann – und weil sie öffentlich ist. Google und
                  Samsung nennen ihre Zeiträume ausdrücklich, seit 2023 sogar
                  sehr lange. Apple nennt keinen; was hier für iPhones steht,
                  ist eine Schätzung nach dem bisherigen Muster und als solche
                  gekennzeichnet.
                </p>
                <p>
                  Uns kostet diese Seite gelegentlich einen Auftrag. Dafür
                  müssen wir niemandem erklären, warum sein frisch repariertes
                  Telefon ein halbes Jahr später keine Updates mehr bekommt.
                </p>
                <p>
                  Wichtig noch: Ein Gerät ohne Sicherheitsupdates funktioniert
                  weiter. Es wird nicht langsamer und geht nicht kaputt. Nur
                  bekannt gewordene Lücken bleiben offen – und das ist genau
                  dort ein Problem, wo Geld oder Zugangsdaten im Spiel sind.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/reparatur">Sofortpreis berechnen</Button>
                <Button href="/refurbished" variant="secondary">
                  Aufbereitete Geräte
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
            Sie sind sich unsicher, wie lange Ihr Gerät noch mitmacht? Der{" "}
            <Link href="/zwilling" className="text-accent underline underline-offset-4">
              digitale Zwilling
            </Link>{" "}
            rechnet zusätzlich die Akkualterung hoch, und der{" "}
            <Link href="/check" className="text-accent underline underline-offset-4">
              Geräte-Check
            </Link>{" "}
            misst im Browser, was gerade wirklich nicht mehr stimmt. Oder Sie
            rufen an: {site.phone}.
          </p>
        </div>
      </section>
    </>
  );
}
