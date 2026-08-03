import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PrintButton } from "@/components/ui/PrintButton";
import { QrCode } from "@/components/ui/QrCode";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import {
  findRefurbished,
  grades,
  protocolNumber,
  refurbishedDevices,
} from "@/lib/data/refurbished";
import { checkpointCount, groupOffset, inspectionGroups } from "@/lib/data/inspection";
import { formatEuro } from "@/lib/format";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { fullAddress, site } from "@/lib/site";

/*
  Die Geräteakte.

  Auf /refurbished steht seit jeher das „40-Punkte-Protokoll“. In dieser
  Branche steht das überall – und nirgends kann man nachsehen, welche
  vierzig Punkte gemeint sind. Diese Seite ist die Antwort darauf: der
  vollständige Prüfplan mit Kriterium, dazu die Messwerte dieses einen
  Geräts, die ersetzten Bauteile und der Satz, was bei der Sichtprüfung
  aufgefallen ist – auch wenn er den Preis drückt.

  Nebeneffekt, der genauso viel wert ist: Jedes Gerät bekommt eine eigene
  Adresse mit eigenem Canonical, eigener Beschreibung und Product-Auszeichnung.
  Vorher lag der gesamte Bestand hinter einem clientseitigen Filter und war
  für eine Suchmaschine schlicht nicht vorhanden.

  Und die Seite ist zum Drucken gedacht: Der Ausdruck liegt der Verpackung
  bei, der QR-Code darauf führt zurück auf genau diese Adresse.
*/

export function generateStaticParams() {
  return refurbishedDevices.map((device) => ({ id: device.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = findRefurbished(id);
  if (!device) return pageMeta({ path: "/refurbished", title: "Gerät", description: "" });

  const grade = grades.find((g) => g.id === device.grade)!;
  return pageMeta({
    path: `/refurbished/${device.id}`,
    title: `${device.name} ${device.storage} refurbished – Zustand ${grade.label}`,
    description: `${device.brand} ${device.name}, ${device.storage}, ${device.color}. Akku ${device.battery} % bei ${device.cycles} Ladezyklen, ${checkpointCount}-Punkte-Prüfprotokoll einsehbar, ${site.warrantyMonths} Monate Garantie. ${formatEuro(device.price)} statt ${formatEuro(device.originalPrice)}.`,
  });
}

export default async function GeraetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = findRefurbished(id);
  if (!device) notFound();

  const grade = grades.find((g) => g.id === device.grade)!;
  const saving = Math.round(
    ((device.originalPrice - device.price) / device.originalPrice) * 100,
  );
  const pageUrl = `${site.url}/refurbished/${device.id}`;
  const checkedOn = new Date(device.checkedOn).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  /*
    Product-Auszeichnung ohne `image`: Wir haben kein Foto genau dieses
    Geräts, und das Vorschaubild der Website wäre eine Produktabbildung, die
    nichts abbildet. Google zeigt dafür kein Rich Result – das ist der
    richtige Preis für die Aussage.
  */
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${device.brand} ${device.name} ${device.storage} (refurbished)`,
    description: `Aufbereitet und nach ${checkpointCount} Punkten geprüft. Zustand ${grade.label}, Akkukapazität ${device.battery} % bei ${device.cycles} Ladezyklen.`,
    sku: device.id,
    color: device.color,
    brand: { "@type": "Brand", name: device.brand },
    itemCondition: "https://schema.org/RefurbishedCondition",
    offers: {
      "@type": "Offer",
      url: pageUrl,
      price: device.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/RefurbishedCondition",
      seller: {
        "@type": "LocalBusiness",
        name: site.name,
        telephone: site.phoneIntl,
        address: {
          "@type": "PostalAddress",
          streetAddress: site.street,
          postalCode: site.zip,
          addressLocality: site.city,
          addressCountry: site.countryCode,
        },
      },
      warranty: {
        "@type": "WarrantyPromise",
        durationOfWarranty: {
          "@type": "QuantitativeValue",
          value: site.warrantyMonths,
          unitCode: "MON",
        },
      },
    },
  };

  const facts: { label: string; value: string }[] = [
    { label: "Speicher", value: device.storage },
    { label: "Farbe", value: device.color },
    { label: "Zustand", value: grade.label },
    { label: "Akkukapazität", value: `${device.battery} %` },
    { label: "Ladezyklen", value: String(device.cycles) },
    { label: "Garantie", value: `${site.warrantyMonths} Monate` },
    { label: "Geprüft am", value: checkedOn },
    { label: "Prüfnummer", value: protocolNumber(device) },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Refurbished", path: "/refurbished" },
          { name: device.name, path: `/refurbished/${device.id}` },
        ])}
      />
      <JsonLd data={productJsonLd} />

      {/* `print:pt-0`: Der Abstand oben hält auf dem Schirm den Seitenkopf
          frei. Auf Papier gibt es keinen Seitenkopf – dort wären es vier
          leere Zentimeter. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pt-36 print:pt-0">
        {/* Nur auf dem Papier: Das Blatt liegt später in der Verpackung, ohne
            Website drumherum. Ohne Absender wäre es ein Zettel. */}
        <div className="print-only mb-8 border-b border-line pb-4">
          <p className="font-medium text-ink-strong">{site.name}</p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-soft">
            {fullAddress} · {site.phone} · {site.url.replace(/^https?:\/\//, "")}
          </p>
        </div>

        <Reveal>
          <Link
            href="/refurbished"
            data-print="hide"
            className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-soft transition-colors hover:text-ink-strong"
          >
            <span aria-hidden="true">←</span> Alle Geräte
          </Link>
        </Reveal>

        {/*
          Drei Kinder statt zwei: Kopf, Preisblock, Einzelheiten. Auf großen
          Schirmen stehen Kopf und Einzelheiten untereinander in der linken
          Spalte, der Preisblock daneben. Auf dem Telefon fließen sie in
          Lesereihenfolge – und der Preis steht dort, wo er hingehört: direkt
          unter dem Gerätenamen, nicht hinter acht Zeilen Datenblatt.
        */}
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-16 lg:gap-y-10">
          <Reveal className="lg:col-start-1">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
              {device.brand} · Refurbished
            </p>
            <h1 className="text-display mt-3">{device.name}</h1>
            <p className="mt-4 text-lg text-ink-soft">
              {device.storage} · {device.color} · Zustand {grade.label}
            </p>

            <p className="mt-8 max-w-xl leading-relaxed text-ink-soft">
              {grade.description} Dieses Gerät wurde am {checkedOn} nach{" "}
              {checkpointCount} Punkten endgeprüft. Das vollständige Protokoll
              steht weiter unten – jede Position mit dem Kriterium, ab dem sie
              als bestanden gilt.
            </p>
          </Reveal>

          {/* Preis und Kontakt */}
          <Reveal delay={80} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-[var(--radius-xl)] border border-line bg-raised p-7 shadow-raised">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-semibold tracking-tight text-ink-strong">
                    {formatEuro(device.price)}
                  </span>
                  <span className="rounded-full bg-positive-subtle px-2.5 py-1 font-mono text-[0.75rem] font-medium text-positive">
                    −{saving} %
                  </span>
                </div>
                <p className="mt-1.5 text-[0.875rem] text-ink-faint">
                  Neupreis bei Markteinführung {formatEuro(device.originalPrice)}
                </p>

                <div className="mt-5 border-t border-line pt-5">
                  <div className="flex items-center justify-between text-[0.8125rem] text-ink-soft">
                    <span>Akkukapazität</span>
                    <span className="font-mono text-ink-strong">{device.battery} %</span>
                  </div>
                  <div
                    className="mt-2 h-1 overflow-hidden rounded-full bg-sunken"
                    role="img"
                    aria-label={`Akkukapazität ${device.battery} Prozent`}
                  >
                    <div
                      className="h-full rounded-full bg-positive"
                      style={{ width: `${device.battery}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[0.75rem] text-ink-faint">
                    Mindestwert für Zustand {grade.label}: {grade.minBattery} %
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3" data-print="hide">
                  <Button href="/kontakt" className="w-full">
                    Gerät reservieren
                  </Button>
                  <Button href={site.phoneHref} variant="secondary" className="w-full">
                    {site.phone}
                  </Button>
                </div>

                <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-faint">
                  Bestand wechselt täglich. Wir halten das Gerät nach der
                  Reservierung 48 Stunden für Sie zurück.
                </p>
              </div>

              {/* Für den Ausdruck, der in der Verpackung liegt */}
              <div className="mt-5 flex items-center gap-4 rounded-[var(--radius-m)] border border-line bg-raised p-5">
                <QrCode
                  value={pageUrl}
                  size={84}
                  className="shrink-0 rounded-[var(--radius-s)]"
                  label={`QR-Code zum Prüfprotokoll ${protocolNumber(device)}`}
                />
                <div>
                  <p className="text-[0.8125rem] font-medium text-ink-strong">
                    {protocolNumber(device)}
                  </p>
                  <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-soft">
                    Der Code führt auf dieses Protokoll. Er liegt gedruckt bei –
                    auch in zwei Jahren noch nachlesbar.
                  </p>
                </div>
              </div>

              <PrintButton className="mt-4 w-full" />
            </aside>
          </Reveal>

          <Reveal delay={40} className="lg:col-start-1">
            {/* Der Befund steht vor dem Preis, nicht im Kleingedruckten. */}
            {device.note ? (
              <div className="mt-8 rounded-[var(--radius-m)] border border-line bg-sunken p-5">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                  Befund der Sichtprüfung
                </p>
                <p className="mt-2 leading-relaxed text-ink-strong">{device.note}</p>
              </div>
            ) : (
              <div className="mt-8 rounded-[var(--radius-m)] border border-line bg-sunken p-5">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                  Befund der Sichtprüfung
                </p>
                <p className="mt-2 leading-relaxed text-ink-strong">
                  Ohne Befund. Unter Werkstattlicht aus 30 cm keine
                  Gebrauchsspuren erkennbar.
                </p>
              </div>
            )}

            {device.replaced.length > 0 ? (
              <div className="mt-5 rounded-[var(--radius-m)] border border-line bg-sunken p-5">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                  Bei der Aufbereitung ersetzt
                </p>
                <ul className="mt-2 space-y-1">
                  {device.replaced.map((part) => (
                    <li key={part} className="flex items-center gap-2 text-ink-strong">
                      <Icon name="tool" size={15} className="shrink-0 text-ink-faint" />
                      {part}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft">
                Bei der Aufbereitung wurde kein Bauteil ersetzt – alle
                Komponenten sind ab Werk verbaut.
              </p>
            )}

            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-8 sm:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-mono text-[0.9375rem] text-ink-strong">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Das Protokoll */}
      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-eyebrow">Das Prüfprotokoll</p>
            <h2 className="text-headline mt-4">
              Alle {checkpointCount} Punkte.
              <br />
              Nicht nur die Zahl.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Jeder Anbieter aufbereiteter Geräte wirbt mit einer solchen Zahl.
              Nachlesen kann man sie fast nirgends. Hier steht der vollständige
              Prüfplan – mit dem Kriterium, ab dem eine Position als bestanden
              gilt.
            </p>
          </Reveal>

          <div className="mt-14 space-y-14">
            {inspectionGroups.map((group, gi) => {
              const offset = groupOffset(group.id);
              return (
                <Reveal key={group.id} delay={Math.min(gi, 3) * 60}>
                  <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
                    <div className="lg:sticky lg:top-24 lg:self-start">
                      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                        {String(offset + 1).padStart(2, "0")} –{" "}
                        {String(offset + group.points.length).padStart(2, "0")}
                      </p>
                      <h3 className="text-title mt-2">{group.title}</h3>
                      <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                        {group.intro}
                      </p>
                    </div>

                    <ol className="border-t border-line">
                      {group.points.map((point, pi) => (
                        <li
                          key={point.title}
                          className="flex gap-4 border-b border-line py-5 print:break-inside-avoid"
                        >
                          <span
                            className="mt-0.5 shrink-0 self-start font-mono text-[0.75rem] tabular-nums text-ink-faint"
                            aria-hidden="true"
                          >
                            {String(offset + pi + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink-strong">{point.title}</p>
                            <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
                              {point.criterion}
                            </p>
                          </div>
                          {/* `self-start`, sonst zieht der Flex-Container die
                              Plakette auf die volle Zeilenhöhe – aus der Pille
                              wird eine Kapsel. */}
                          <span className="mt-0.5 inline-flex shrink-0 self-start items-center gap-1.5 rounded-full bg-positive-subtle px-2.5 py-1 text-[0.75rem] font-medium text-positive">
                            <Icon name="check" size={12} />
                            <span className="hidden sm:inline">bestanden</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <p className="mt-14 max-w-2xl border-t border-line pt-6 text-[0.875rem] leading-relaxed text-ink-soft">
            Ein Gerät, das eine dieser Positionen nicht besteht, geht zurück auf
            die Werkbank – repariert wird, was sich reparieren lässt, danach
            läuft das Protokoll von vorne. Was sich nicht reparieren lässt,
            verkaufen wir nicht, sondern schlachten es für Ersatzteile aus. Der
            Prüfplan ist für alle Geräte derselbe; was sich pro Gerät
            unterscheidet, steht oben: Kapazität, Zyklen, ersetzte Bauteile und
            der Befund der Sichtprüfung.
          </p>
        </div>
      </section>
    </>
  );
}
