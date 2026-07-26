# CLAUDE.md

Anleitung für Claude Code beim Arbeiten in diesem Repository.

## Projekt

**OmegaPhone** – statische Premium-Website für Smartphone-Reparatur,
Refurbished-Geräte und Ersatzteile. Das Design-Briefing steht in [`Task`](./Task):
ruhig, präzise, zurückhaltend – „Apple Store, nicht Times Square".
Sprache der Website und der Code-Kommentare: **Deutsch**.

## Befehle

```bash
npm install
npm run dev           # Entwicklungsserver
npm run build         # Server-Build (Vercel, Cloudflare Workers)
npm run build:static  # Statischer Export nach ./out (ohne /api)
npm run lint          # ESLint

npm run cf:build      # Cloudflare-Worker bauen (OpenNext)
npm run cf:preview    # Worker lokal in workerd testen
npm run cf:deploy     # Auf Cloudflare Workers deployen

node scripts/generate-icons.mjs   # PWA-Icons neu rendern (headless Chromium)
```

Es gibt keine Test-Suite. Verifikation = `npm run build` + `npm run lint`.

## Deployment (Cloudflare Workers – empfohlen)

Voller Next.js-Server über den OpenNext-Adapter, damit `/api/kontakt`
serverseitig läuft.

```bash
npm run cf:build      # erzeugt .open-next/worker.js + .open-next/assets
npm run cf:preview    # lokal in workerd prüfen
npx wrangler login
npm run cf:deploy
```

- `wrangler.jsonc`: `nodejs_compat` ist **erforderlich** – der Kontakt-Endpunkt
  nutzt `Buffer` für den Bild-Upload.
- Secrets nicht in `wrangler.jsonc`, sondern:
  `npx wrangler secret put RESEND_API_KEY`, `CONTACT_FROM`, optional `CONTACT_TO`.
- Der Rate-Limiter in `app/api/kontakt/route.ts` ist prozesslokal. Auf Workern
  verteilt sich der Traffic über Isolates, er wirkt also nur als grobe Bremse.
  Für harte Limits KV oder Durable Objects nachrüsten.

## Deployment (Cloudflare Pages / statisch)

```bash
npm run build:static  # → ./out, 13 Seiten, ohne /api
```

`scripts/build-static.mjs` legt `app/api` vor dem Build beiseite und stellt es
danach zurück (`output: "export"` verträgt keine POST-Route-Handler). Ohne
Serverfunktion öffnet das Formular einen fertigen E-Mail-Entwurf – gesteuert
über `NEXT_PUBLIC_STATIC_EXPORT`.

## Deployment (GitHub Pages)

- `.github/workflows/nextjs.yml` baut bei Push auf `main` (mit `GITHUB_PAGES=true`
  über `npm run build:static`) und deployt `./out`
  nach GitHub Pages → `https://nicozrm.github.io/Koko/`.
- Einmalig im Repository: **Settings → Pages → Source = „GitHub Actions"**.
  Ohne diese Einstellung schlägt der Deploy-Job fehl.
- Der Workflow setzt `GITHUB_PAGES=true`; `next.config.ts` aktiviert dann
  `basePath: "/Koko"` (Repository-Name) und setzt `NEXT_PUBLIC_SITE_URL` auf die
  Projektseite, damit Canonical, Sitemap, robots.txt und JSON-LD dorthin zeigen
  statt auf `https://drsmartphone48.de`. Lokal (ohne die Variable) gibt es
  weder basePath noch URL-Umschaltung.
- Eigene Domain später: `repoName`/`gitHubPagesUrl` in `next.config.ts` anpassen
  bzw. bei Root-Domain `basePath` leer lassen und eine `CNAME`-Datei
  (via `public/CNAME`) ergänzen.
- Lokal prüfen: `GITHUB_PAGES=true npm run build:static`, dann
  `npx serve out` – die Seite liegt unter `/Koko/`.
- **Wichtig:** Verweise auf Dateien in `public/` (Service Worker, Manifest-Icons)
  bekommen den basePath NICHT automatisch – dafür
  `process.env.NEXT_PUBLIC_BASE_PATH` voranstellen (siehe `app/manifest.ts`,
  `components/pwa/ServiceWorkerRegister.tsx`). `public/sw.js` leitet seinen
  Basis-Pfad zur Laufzeit aus `self.location` ab.
- Wegen `output: "export"` brauchen Metadata-Routen (`sitemap.ts`, `robots.ts`,
  `manifest.ts`) `export const dynamic = "force-static"`. Keine Server Actions,
  keine API-Routen, kein `next/image`-Optimizer (unoptimized).

## Architektur

```
app/                     App-Router-Seiten (alle statisch prerendert)
  page.tsx               Landing Page (Hero, Pillars, Prozess, Stats, CTA)
  reparatur/             Sofortpreis-Rechner (Signature-Feature)
  refurbished/ ersatzteile/ werkstatt/ kontakt/
  impressum/ datenschutz/ offline/ not-found.tsx
  layout.tsx             Root-Layout: Metadata, JSON-LD, Header/Footer, SW-Registrierung
  globals.css            Design-Tokens (CSS-Variablen) + Tailwind-4-Theme + Motion
  sitemap.ts robots.ts manifest.ts   Metadata-Routen (force-static)
components/
  ui/                    Primitives: Button, Icon (eigenes SVG-Set), Reveal, SectionHeading
  layout/                Header, Footer, Logo
  sections/              Seiten-Sektionen: Faq, RefurbishedGrid/-Card, DiagramShowcase, ContactForm
  configurator/          Configurator (Preislogik) + DeviceDiagram (SVG-Explosionszeichnung)
  pwa/                   ServiceWorkerRegister
lib/
  site.ts                Stammdaten (Name, Adresse, URL …) – zentrale Quelle
  format.ts              formatEuro etc.
  data/                  devices.ts (Modelle/Preise), refurbished.ts, faq.ts
public/
  sw.js                  Handgeschriebener Service Worker (Offline-Fallback /offline)
  icons/                 PWA-Icons
```

## Konventionen

- **Design-Tokens** ausschließlich über die CSS-Variablen in `app/globals.css`
  (Farben `--ink-*`/`--surface-*`, Radius `--radius-*`, Motion `--ease-*`,
  `--duration-*`). Keine Ad-hoc-Farben oder -Timings.
- **Animationen**: dezent und zweckgebunden (siehe `Task`). Scroll-Reveals über
  die `Reveal`-Komponente (IntersectionObserver setzt `data-revealed`, Bewegung
  lebt in CSS). `prefers-reduced-motion` wird überall respektiert; ohne JS
  bleibt alles sichtbar (`html[data-js]`-Gate).
- Server Components als Default; `"use client"` nur wo nötig
  (Reveal, Configurator, DiagramShowcase, ContactForm, ServiceWorkerRegister).
- Alle Firmendaten (Adresse, Telefon, Preise, Impressum) sind **Platzhalter**
  und vor dem Livegang zu ersetzen.
