import { ContactForm } from "@/components/sections/ContactForm";
import { LiveStatus } from "@/components/sections/LiveStatus";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";
import { JsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  path: "/kontakt",
  title: "Kontakt & Termin",
  description: `Termin vereinbaren oder spontan vorbeikommen: ${site.street}, ${site.zip} ${site.city}. Telefonisch, per E-Mail oder über das Kontaktformular.`,
});

export default function KontaktPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-28 md:px-8 md:pt-36">
      <JsonLd data={breadcrumbJsonLd([{ name: "Kontakt", path: "/kontakt" }])} />
      <Reveal className="max-w-2xl">
        <p className="text-eyebrow">Kontakt</p>
        <h1 className="text-display mt-4">
          Wir sind da.
          <br />
          Ohne Warteschleife.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Während der Öffnungszeiten antworten wir innerhalb von 30 Minuten –
          egal ob Anruf, E-Mail oder Formular.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-20">
        <Reveal delay={80}>
          <ContactForm />
        </Reveal>

        <Reveal delay={160}>
          <aside className="space-y-8">
            <div className="rounded-[var(--radius-l)] border border-line bg-raised p-7 shadow-raised">
              <h2 className="text-title">Vor Ort</h2>
              <address className="mt-4 space-y-3 not-italic">
                <p className="flex items-start gap-3 text-[0.9375rem] text-ink">
                  <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-ink-faint" />
                  <span>
                    {site.street}
                    <br />
                    {site.zip} {site.city}
                  </span>
                </p>
                <p className="flex items-center gap-3 text-[0.9375rem]">
                  <Icon name="phone" size={18} className="shrink-0 text-ink-faint" />
                  <a
                    href={site.phoneHref}
                    className="text-ink transition-colors hover:text-ink-strong"
                  >
                    {site.phone}
                  </a>
                </p>
                <p className="flex items-center gap-3 text-[0.9375rem]">
                  <Icon name="mail" size={18} className="shrink-0 text-ink-faint" />
                  <a
                    href={`mailto:${site.email}`}
                    className="text-ink transition-colors hover:text-ink-strong"
                  >
                    {site.email}
                  </a>
                </p>
              </address>
            </div>

            <LiveStatus />

            <div className="rounded-[var(--radius-l)] border border-line bg-raised p-7 shadow-raised">
              <h2 className="text-title">Öffnungszeiten</h2>
              <dl className="mt-4 space-y-2.5">
                {site.openingHours.map((entry) => (
                  <div
                    key={entry.days}
                    className="flex items-baseline justify-between gap-4 text-[0.9375rem]"
                  >
                    <dt className="text-ink-soft">{entry.days}</dt>
                    <dd className="font-mono text-ink-strong">{entry.hours}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-t border-line pt-4 text-[0.875rem] text-ink-soft">
                Ohne Termin willkommen – mit Termin garantiert ohne Wartezeit.
              </p>
            </div>
          </aside>
        </Reveal>
      </div>

      {/* Anfahrt – Karte lädt erst beim Scrollen und setzt keine Cookies,
          solange sie nicht sichtbar ist (loading="lazy"). */}
      <Reveal>
        <div className="mt-16">
          <h2 className="text-title">So finden Sie uns</h2>
          <p className="mt-2 text-[0.9375rem] text-ink-soft">
            {site.street}, {site.zip} {site.city}
          </p>
          <div className="mt-5 overflow-hidden rounded-[var(--radius-l)] border border-line shadow-raised">
            <iframe
              src={site.google.embedUrl}
              title={`Standort von ${site.name} auf Google Maps`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[360px] w-full border-0"
            />
          </div>
          <a
            href={site.google.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
          >
            Route in Google Maps öffnen
            <Icon name="arrow-up-right" size={16} />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
