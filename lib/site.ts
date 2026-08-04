/**
 * Zentrale Stammdaten. Einzige Quelle der Wahrheit für Name, Adresse,
 * Kontakt, Öffnungszeiten und Rechtliches.
 *
 * Alle Angaben hier sind die realen Daten des Betriebs. Werden sie geändert,
 * ziehen Header, Footer, Impressum, Schema.org, Sitemap und Metadaten
 * automatisch nach.
 */

/**
 * Öffentliche Basis-URL ohne Schrägstrich am Ende. Der GitHub-Pages-Build
 * setzt `NEXT_PUBLIC_SITE_URL` (siehe next.config.ts) auf die Projektseite;
 * überall sonst gilt die Wunschdomain.
 */
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://drsmartphone48.de";

export const site = {
  name: "Dr Smartphone48",
  legalName: "Dr Smartphone48",
  owner: "Dr Smartphone48",
  tagline: "Präzision für Ihr Smartphone.",
  description:
    "Smartphone-Reparatur in Greven: Display, Akku und Software – Sofortpreis in Sekunden, kostenloser Geräte-Check und ehrliche Diagnose. Termin ohne Wartezeit.",
  url: publicUrl,

  street: "Zur Freidrichsburg 8",
  zip: "48268",
  city: "Greven",
  country: "Deutschland",
  countryCode: "DE",

  phone: "0177 5196018",
  phoneHref: "tel:+491775196018",
  phoneIntl: "+49 177 5196018",
  whatsapp: "+491775196018",
  whatsappHref: "https://wa.me/491775196018",
  email: "Drsmartphone48268@gmail.com",

  /**
   * Instagram-Profil des Betriebs. `handle` ist die Anzeigeform mit @,
   * `url` die kanonische Profiladresse – sie steht im Fuß und als `sameAs`
   * im JSON-LD, damit Google das Profil dem Unternehmen zuordnet.
   */
  instagram: {
    handle: "@dr.smartphone48",
    url: "https://www.instagram.com/dr.smartphone48/",
  },

  /** USt-IdNr. laut Angabe des Betriebs. */
  vatId: "DE458241430",

  openingHours: [
    { days: "Montag – Freitag", hours: "11:00 – 19:00" },
    { days: "Samstag", hours: "Nach Vereinbarung" },
    { days: "Sonntag", hours: "Geschlossen" },
  ],
  /** Maschinenlesbar für Schema.org (LocalBusiness.openingHours). */
  openingHoursSchema: ["Mo-Fr 11:00-19:00"],
  openingHoursShort: "Mo–Fr 11–19 Uhr",

  warrantyMonths: 12,
  checkpoints: 40,

  /**
   * Google-Bewertungsprofil. Aggregat laut Google-Unternehmensprofil;
   * `placeUrl` führt direkt zu den Original-Rezensionen.
   */
  google: {
    rating: 5.0,
    reviewCount: 85,
    placeUrl:
      "https://www.google.com/search?q=Dr+Smartphone48+Greven&ludocid=16181192342440592362#lkt=LocalPoiReviews",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Dr+Smartphone48+Zur+Freidrichsburg+8+48268+Greven",
    /** Google Maps Embed ohne API-Key (Suchmodus). */
    embedUrl:
      "https://maps.google.com/maps?q=Zur%20Freidrichsburg%208%2C%2048268%20Greven&t=&z=16&ie=UTF8&iwloc=&output=embed",
  },
} as const;

export const fullAddress = `${site.street}, ${site.zip} ${site.city}`;
