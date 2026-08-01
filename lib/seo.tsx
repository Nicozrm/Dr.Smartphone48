import type { Metadata } from "next";
import { site } from "@/lib/site";

/**
 * Seiten-Metadaten aus einer Hand.
 *
 * Hintergrund: Das Root-Layout setzt `alternates.canonical`. Next.js vererbt
 * dieses Feld an jede Unterseite, die es nicht selbst überschreibt – dadurch
 * meldete zuvor **jede** Seite die Startseite als kanonische URL. Für Google
 * heißt das: /reparatur, /check, /kontakt … sind Duplikate der Startseite und
 * fliegen aus dem Index. Genau die Seiten, die Umsatz bringen.
 *
 * Deshalb bekommt jede Route ihre Metadaten über `pageMeta()`. Der Helfer
 * setzt Canonical und og:url zwingend auf den eigenen Pfad und hält Titel,
 * Beschreibung und Vorschaubild zwischen `<title>`, OpenGraph und Twitter
 * synchron.
 */

/**
 * Vorschaubild (public/og.png, 1200×630), erzeugt von scripts/generate-og.mjs.
 *
 * Hier **ohne** `NEXT_PUBLIC_BASE_PATH` davor: Anders als bei Verweisen im
 * Markup (Service Worker, Manifest-Icons) löst Next.js Metadaten-URLs gegen
 * `metadataBase` auf, und diese Basis trägt den Unterpfad der GitHub-Pages-
 * Projektseite bereits. Ein zusätzliches Präfix ergäbe /Koko/Koko/og.png.
 */
const ogImage = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: `${site.name} – Handy-Reparatur in ${site.city}`,
};

interface PageMetaInput {
  /** Pfad mit führendem Schrägstrich, Startseite = "/". */
  path: string;
  /** Ohne Marken-Suffix – das Template im Root-Layout hängt ihn an. */
  title: string;
  description: string;
  /** Startseite nutzt den vollen Titel inkl. Marke (kein Template). */
  absoluteTitle?: boolean;
  /** Von der Indexierung ausnehmen (z. B. /offline). */
  noindex?: boolean;
}

export function pageMeta({
  path,
  title,
  description,
  absoluteTitle = false,
  noindex = false,
}: PageMetaInput): Metadata {
  // Der OpenGraph-Titel trägt immer die Marke: Geteilte Links stehen ohne
  // umgebende Seite da und müssen für sich allein verständlich sein.
  const ogTitle = absoluteTitle ? title : `${title} – ${site.name}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "de_DE",
      url: path,
      title: ogTitle,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImage],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * BreadcrumbList für Google. Erzeugt die sichtbare Hierarchie als
 * strukturierte Daten, damit in den Suchergebnissen der Pfad statt der nackten
 * URL steht. Die Startseite braucht keine Brotkrume.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Start", path: "/" }, ...trail].map(
      (item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${site.url}${item.path === "/" ? "" : item.path}`,
      }),
    ),
  };
}

/** JSON-LD als `<script>` – einheitlich escaped an einer Stelle. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
