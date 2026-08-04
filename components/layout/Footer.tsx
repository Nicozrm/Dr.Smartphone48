import Link from "next/link";
import { site } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Leistungen",
    links: [
      { href: "/reparatur", label: "Reparatur & Sofortpreis" },
      { href: "/ankauf", label: "Ankauf" },
      { href: "/refurbished", label: "Refurbished" },
      { href: "/ersatzteile", label: "Ersatzteile" },
    ],
  },
  {
    title: "Werkzeuge",
    links: [
      { href: "/notfall", label: "Notfall-Soforthilfe" },
      { href: "/check", label: "Geräte-Check" },
      { href: "/zwilling", label: "Digitaler Zwilling" },
      { href: "/ticket", label: "Reparatur-Ticket" },
    ],
  },
  {
    title: "Unternehmen",
    links: [
      { href: "/werkstatt", label: "Werkstatt" },
      { href: "/kontakt", label: "Kontakt & Anfahrt" },
      { href: "/#bewertungen", label: "Bewertungen" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
      { href: "/agb", label: "AGB" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-inverse text-ink-inverse-soft">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed">
              Handy-Reparatur in {site.city}. Ehrliche Diagnose, Festpreis vorab
              und {site.warrantyMonths} Monate Garantie auf Teil und Arbeit.
            </p>

            <address className="mt-6 not-italic font-mono text-[0.8125rem] leading-relaxed">
              {site.street} · {site.zip} {site.city}
              <br />
              <a href={site.phoneHref} className="transition-colors hover:text-ink-inverse">
                {site.phone}
              </a>
              <br />
              <a
                href={`mailto:${site.email}`}
                className="break-all transition-colors hover:text-ink-inverse"
              >
                {site.email}
              </a>
            </address>

            {/* Direktwege: die beiden Marken in ihren Originalzeichen, dazu
                die Route. Alle drei tragen dieselbe Form – nur die Farbe
                gehört jeweils der Marke. */}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={site.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp-Nachricht an ${site.phone}`}
                className="social-chip social-chip--whatsapp inline-flex h-10 items-center gap-2.5 rounded-full border border-line-inverse pl-3.5 pr-4 text-[0.8125rem]"
              >
                <BrandIcon name="whatsapp" size={16} className="social-chip__mark" />
                WhatsApp
              </a>
              <a
                href={site.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram-Profil @${site.instagram.handle}`}
                className="social-chip social-chip--instagram inline-flex h-10 items-center gap-2.5 rounded-full border border-line-inverse pl-3.5 pr-4 text-[0.8125rem]"
              >
                <BrandIcon name="instagram" size={16} className="social-chip__mark" />
                Instagram
              </a>
              <a
                href={site.google.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="social-chip inline-flex h-10 items-center gap-2.5 rounded-full border border-line-inverse pl-3.5 pr-4 text-[0.8125rem]"
              >
                <Icon name="pin" size={15} className="social-chip__mark" />
                Route
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-inverse-soft/70">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.9375rem] transition-colors duration-[var(--duration-fast)] hover:text-ink-inverse"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Öffnungszeiten */}
        <div className="mt-14 border-t border-line-inverse pt-8">
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-ink-inverse-soft/70">
            Öffnungszeiten
          </p>
          <dl className="mt-4 grid gap-x-10 gap-y-2 sm:grid-cols-3">
            {site.openingHours.map((o) => (
              <div key={o.days} className="flex items-baseline justify-between gap-4 text-[0.875rem]">
                <dt>{o.days}</dt>
                <dd className="font-mono text-ink-inverse">{o.hours}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line-inverse pt-7 text-[0.8125rem] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName}. Alle Rechte vorbehalten.
          </p>
          <p className="font-mono">USt-IdNr. {site.vatId}</p>
        </div>
      </div>
    </footer>
  );
}
