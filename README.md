# OmegaPhone

Premium-Website für Smartphone-Reparatur, Refurbished-Geräte und Ersatzteile.
Umsetzung des Briefings aus [`Task`](./Task): ruhig, präzise, schnell –
Apple-Store-Gefühl statt Times Square.

## Stack

- **Next.js 15** (App Router, TypeScript), alle Seiten statisch prerendert
- **Tailwind CSS 4** mit eigenem Design-Token-Layer (`app/globals.css`)
- **Geist Sans / Geist Mono**, self-hosted über `next/font`
- Eigenes SVG-Icon-Set, eigene Scroll-Reveals (IntersectionObserver + CSS),
  `prefers-reduced-motion` wird überall respektiert
- **PWA**: Web-App-Manifest + handgeschriebener Service Worker (`public/sw.js`),
  offline-fähig mit `/offline`-Fallback
- **SEO**: Metadata-API, `sitemap.xml`, `robots.txt`, JSON-LD
  (LocalBusiness, FAQPage)

## Signature-Feature

Der **Sofortpreis-Rechner** unter `/reparatur`: Marke → Modell → Schaden in
drei Klicks. Jede Schadensauswahl hebt das betroffene Bauteil in einer
schematischen Explosionszeichnung hervor, der Festpreis und die Reparaturdauer
aktualisieren sich live. Die Terminanfrage übernimmt die Auswahl automatisch.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build
npm run start    # Produktionsserver
npm run lint     # ESLint
```

PWA-Icons neu generieren (nutzt headless Chromium):

```bash
node scripts/generate-icons.mjs
```

## Struktur

```
app/                     Routen, Layout, Sitemap/Robots/Manifest
components/ui/           Primitives: Button, Icon, Reveal, SectionHeading
components/layout/       Header, Footer, Logo
components/sections/     Seiten-Sektionen (FAQ, Refurbished, Kontaktformular …)
components/configurator/ Sofortpreis-Rechner + SVG-Gerätediagramm
lib/data/                Statische Daten: Geräte/Preise, Refurbished, FAQ
lib/                     site.ts (Stammdaten), format.ts
public/                  Service Worker, PWA-Icons
```

Hinweis: Alle Firmendaten (Adresse, Telefonnummer, Preise, Impressum) sind
Platzhalter und vor dem Livegang zu ersetzen.
