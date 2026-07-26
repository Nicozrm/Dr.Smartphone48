import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Bootloader } from "@/components/experience/Bootloader";
import { CommandPalette } from "@/components/experience/CommandPalette";
import { MagneticField } from "@/components/experience/MagneticField";
import { ScrollProgress } from "@/components/experience/ScrollProgress";
import { site, fullAddress } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – Handy-Reparatur in ${site.city}`,
    template: `%s – ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "Handy Reparatur Greven",
    "Smartphone Reparatur Greven",
    "iPhone Reparatur Greven",
    "Displayreparatur",
    "Akkutausch",
    site.name,
  ],
  authors: [{ name: site.legalName }],
  creator: site.legalName,
  publisher: site.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "de_DE",
    url: site.url,
    title: `${site.name} – Handy-Reparatur in ${site.city}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} – Handy-Reparatur in ${site.city}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// No-Flash: Theme vor dem ersten Paint auflösen (gespeicherte Wahl > System).
const themeInit = `(function(){try{var s=localStorage.getItem('op-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=s||(d?'dark':'light');}catch(e){}document.documentElement.dataset.js='true';})();`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LocalBusiness", "MobilePhoneStore"],
      "@id": `${site.url}/#business`,
      name: site.name,
      legalName: site.legalName,
      description: site.description,
      url: site.url,
      telephone: site.phoneIntl,
      email: site.email,
      vatID: site.vatId,
      priceRange: "€€",
      currenciesAccepted: "EUR",
      address: {
        "@type": "PostalAddress",
        streetAddress: site.street,
        postalCode: site.zip,
        addressLocality: site.city,
        addressCountry: site.countryCode,
      },
      openingHours: site.openingHoursSchema,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: site.google.rating,
        reviewCount: site.google.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
      areaServed: [
        { "@type": "City", name: "Greven" },
        { "@type": "City", name: "Münster" },
        { "@type": "City", name: "Emsdetten" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Reparaturleistungen",
        itemListElement: [
          "Displayreparatur",
          "Akkutausch",
          "Software-Wiederherstellung",
          "Kamerareparatur",
          "Ladebuchse",
          "Wasserschaden-Diagnose",
        ].map((n) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: n },
        })),
      },
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      inLanguage: "de-DE",
      publisher: { "@id": `${site.url}/#business` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="geo.region" content="DE-NW" />
        <meta name="geo.placename" content={`${site.city}`} />
        <meta name="format-detection" content="telephone=yes" />
        <link rel="me" href={site.url} />
        <meta name="apple-mobile-web-app-title" content={site.name} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta itemProp="address" content={fullAddress} />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-ink-strong focus:px-4 focus:py-2 focus:text-[var(--surface-page)]"
        >
          Zum Inhalt springen
        </a>
        <Header />
        <main id="inhalt">{children}</main>
        <Footer />
        <ScrollProgress />
        <CommandPalette />
        <MagneticField />
        <Bootloader />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
