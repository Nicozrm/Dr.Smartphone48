import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { verifyReport } from "@/lib/data/verify-report";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

/*
  Der Prüfbeleg.

  Diese Website behauptet an mehreren Stellen etwas Nachprüfbares: 40 Punkte
  im Prüfprotokoll, eine Werkstattdauer, die exakt aufgeht, ein Update-
  Horizont mit Beleg, ein Vorgangsablauf, der zur Datenbank passt, ein
  Reparaturzertifikat, dessen Signatur bei jeder Änderung bricht. Sieben
  Skripte prüfen das bei jeder Änderung nach – nicht als Behauptung im Text,
  sondern als Code, der bei einer Abweichung mit einem Fehlercode abbricht
  (siehe CLAUDE.md, Abschnitt „Befehle").

  Bisher sah diese Prüfungen nur, wer den Quelltext öffnete. Diese Seite
  zeigt sie allen – mit der vollständigen, wortgleichen Ausgabe der Skripte,
  nicht mit einer eigenen Zusammenfassung, die etwas anderes behaupten
  könnte als die Prüfung selbst. Der Schnappschuss steht in
  `lib/data/verify-report.json`, erzeugt von `npm run verify:report`. Ändert
  sich eine der geprüften Dateien, muss dieser Befehl erneut laufen – wie bei
  `SUPPORT_CHECKED` und `CO2_CHECKED` ist das ein Handgriff, der nicht von
  selbst passiert.

  Warum wir das zeigen, statt es zu verstecken: Weil die Zahlen auf dieser
  Website nur etwas wert sind, wenn sie nachprüfbar sind – und weil es die
  ehrlichste Antwort auf die Frage ist, warum man einer Werkstattseite
  glauben sollte, die vieles behauptet.
*/

export const metadata = pageMeta({
  path: "/beleg",
  title: "Der Prüfbeleg",
  description:
    "Sieben Skripte prüfen bei jeder Änderung, ob die Zusagen dieser Website noch stimmen – hier steht ihre vollständige, unveränderte Ausgabe.",
});

const geprueft = new Date(verifyReport.generatedAt).toLocaleString("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const bestandene = verifyReport.checks.filter((c) => c.ok).length;

/** Passendes Sinnbild je Prüfung – rein dekorativ, der Text trägt die Aussage. */
const icons: Record<string, IconName> = {
  qr: "waveform",
  procedure: "clock",
  inspection: "shield",
  support: "cpu",
  status: "tool",
  co2: "leaf",
  cert: "sparkle",
};

export default function BelegPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Prüfbeleg", path: "/beleg" }])} />

      <section className="mx-auto max-w-4xl px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow">Prüfbeleg</p>
          <h1 className="text-display mt-4 text-balance">
            Was wir behaupten,
            <br />
            prüft ein Skript.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            40 Punkte im Prüfprotokoll, eine Werkstattdauer, die aufgeht, ein
            Update-Horizont mit Beleg – das sind keine Textbausteine, sondern
            Zusagen, die sieben Skripte bei jeder Änderung nachrechnen. Hier
            steht ihre Ausgabe, vollständig und unverändert.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-10">
          <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-l)] border border-line bg-sunken p-5">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{
                background: verifyReport.ok ? "var(--positive-subtle)" : "var(--danger-subtle)",
                color: verifyReport.ok ? "var(--positive)" : "var(--danger)",
              }}
            >
              <Icon name={verifyReport.ok ? "check" : "close"} size={20} />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-ink-strong">
                {bestandene} von {verifyReport.checks.length} Prüfungen bestanden
              </p>
              <p className="mt-0.5 text-[0.8125rem] text-ink-soft">
                Zuletzt ausgeführt am {geprueft} Uhr.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
          <SectionHeading
            eyebrow="Die sieben Prüfungen"
            title="Jede mit ihrer vollen Ausgabe."
            lede="Ein Klick auf eine Prüfung öffnet, was auch am Terminal erschiene – dieselbe Ausgabe, dasselbe Ergebnis. Nichts davon ist für diese Seite umformuliert."
          />

          <ol className="mt-12 space-y-4">
            {verifyReport.checks.map((check) => (
              <li
                key={check.id}
                className="overflow-hidden rounded-[var(--radius-l)] border border-line bg-page"
              >
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-4 p-5 marker:content-none">
                    <span
                      className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-s)]"
                      style={{
                        background: check.ok ? "var(--positive-subtle)" : "var(--danger-subtle)",
                        color: check.ok ? "var(--positive)" : "var(--danger)",
                      }}
                    >
                      <Icon name={icons[check.id] ?? "tool"} size={17} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-ink-strong">{check.title}</span>
                        <span className="font-mono text-[0.75rem] text-ink-faint">
                          npm run {check.npmScript}
                        </span>
                      </span>
                      <span className="mt-1 block text-[0.875rem] leading-relaxed text-ink-soft">
                        {check.description}
                      </span>
                    </span>

                    <span className="mt-1 flex shrink-0 items-center gap-2 text-[0.8125rem] text-ink-faint">
                      <Icon
                        name="chevron-down"
                        size={16}
                        className="transition-transform duration-[var(--duration-fast)] group-open:rotate-180"
                      />
                    </span>
                  </summary>

                  <div className="border-t border-line bg-sunken px-5 py-4">
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.75rem] leading-relaxed text-ink">
                      {check.output}
                    </pre>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
            <Reveal>
              <h2 className="text-headline">Warum wir das zeigen.</h2>
              <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
                <p>
                  Eine Werkstattseite behauptet viel: Preise, Fristen, einen
                  Update-Horizont, ein 40-Punkte-Protokoll. Jede dieser
                  Zahlen lässt sich glauben oder nachprüfen. Wir haben uns für
                  Letzteres entschieden – nicht als Werbeversprechen, sondern
                  als Code, der abbricht, sobald eine Zahl nicht mehr stimmt.
                </p>
                <p>
                  Diese Seite ist kein Test-Dashboard und kein Ersatz für eine
                  echte Qualitätssicherung. Sie zeigt nur, was ohnehin
                  passiert, bevor eine Änderung online geht – hier steht es,
                  weil Verstecken keinen Vorteil hätte.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h2 className="text-headline">Was das nicht ist.</h2>
              <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
                <p>
                  Kein Beweis, dass alles auf dieser Website stimmt – nur ein
                  Beleg, dass die sieben Zusagen stimmen, die sich maschinell
                  prüfen lassen. Für alles andere gilt dieselbe Regel wie
                  überall hier: Wo etwas geschätzt ist, steht „Schätzung&rdquo;
                  dabei, und wo eine Zahl fehlt, fehlt sie lieber, als dass
                  sie erfunden wäre.
                </p>
                <p>
                  Der Schnappschuss oben ist von Hand angestoßen, nicht bei
                  jedem Aufruf neu gerechnet – diese Website ist vollständig
                  statisch. Wirkt eine Angabe veraltet, sagen Sie uns
                  Bescheid.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/reparatur">Sofortpreis berechnen</Button>
                <Button href="/versorgung" variant="secondary">
                  Update-Horizont ansehen
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-soft">
            Fragen zu einer der Prüfungen? Schreiben Sie uns über{" "}
            <Link href="/kontakt" className="text-accent underline underline-offset-4">
              das Kontaktformular
            </Link>{" "}
            oder rufen Sie an: {site.phone}.
          </p>
        </div>
      </section>
    </>
  );
}
