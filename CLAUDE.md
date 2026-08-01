# CLAUDE.md

Anleitung für Claude Code beim Arbeiten in diesem Repository.

## Projekt

**Dr Smartphone48** (Greven) – Premium-Website für Smartphone-Reparatur,
Refurbished-Geräte und Ersatzteile. Das Design-Briefing steht in [`Task`](./Task):
ruhig, präzise, zurückhaltend – „Apple Store, nicht Times Square".
Sprache der Website und der Code-Kommentare: **Deutsch**.

Der Paketname in `package.json` lautet aus historischen Gründen noch
`omegaphone`; maßgeblich ist `lib/site.ts`.

## Befehle

```bash
npm install
npm run dev           # Entwicklungsserver
npm run build         # Server-Build (Vercel, Cloudflare Workers)
npm run build:static  # Statischer Export nach ./out (ohne /api)
npm run lint          # ESLint
npm run verify:qr     # QR-Encoder gegen ISO/IEC 18004 prüfen

npm run cf:build      # Cloudflare-Worker bauen (OpenNext)
npm run cf:preview    # Worker lokal in workerd testen
npm run cf:deploy     # Auf Cloudflare Workers deployen

node scripts/generate-icons.mjs   # PWA-Icons neu rendern (headless Chromium)
node scripts/generate-og.mjs      # public/og.png neu rendern (Link-Vorschaubild)
```

Es gibt keine Test-Suite. Verifikation = `npm run build` + `npm run lint`.
Einzige Ausnahme: `scripts/verify-qr.mjs` prüft den QR-Encoder gegen die
Norm – er ist der einzige Code hier, bei dem ein stiller Fehler zu einem
unlesbaren Ausdruck führt, ohne dass es jemandem auffällt.

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
  page.tsx               Landing Page (Hero, Pillars, Werkzeuge, Anatomie,
                         Röntgen, Stats, CTA)
  reparatur/             Sofortpreis-Rechner (Signature-Feature) + FAQ
  notfall/               Notfall-Protokolle (ohne JS lesbar, offline im Cache)
  check/                 Geräte-Check: Sensor-Diagnose im Browser
  ankauf/                Restwert-Rechner mit offengelegter Rechnung
  zwilling/              Digitaler Zwilling, Akku-Coach, Reparieren-oder-neu
  ticket/                Reparatur-Ticket + Übergabeprotokoll (noindex)
  refurbished/ ersatzteile/ werkstatt/ kontakt/
  impressum/ datenschutz/ agb/ offline/ not-found.tsx
  intern/rechnung/       Rechnungswerkzeug (nicht verlinkt, noindex, kein Server)
  api/kontakt/           Route Handler für das Formular (nur im Server-Build)
  layout.tsx             Root-Layout: Metadata, JSON-LD, Header/Footer, SW-Registrierung
  globals.css            Design-Tokens (CSS-Variablen) + Tailwind-4-Theme + Motion + Druck
  sitemap.ts robots.ts manifest.ts   Metadata-Routen (force-static)
components/
  ui/                    Primitives: Button, Icon (eigenes SVG-Set), Reveal,
                         SectionHeading, ThemeToggle, QrCode
  layout/                Header, Footer, Logo
  sections/              Faq, RefurbishedGrid/-Card, DiagramShowcase, ContactForm,
                         Reviews (Google-Aggregat), LiveStatus (Öffnungsstatus)
  configurator/          Configurator (Preislogik) + DeviceDiagram (SVG-Explosion)
  experience/            Bootloader, CommandPalette (⌘K), ShaderField (WebGL-Hero),
                         DeviceExploded, XRay, MagneticField, ScrollProgress
  check/                 DeviceCheck (Display-, Sensor-, Audio-, Akku-Tests)
  twin/                  DigitalTwin, RepairOrReplace
  battery/               BatteryCoach (3-Jahres-Prognose)
  resale/                ResaleCalculator (Ankauf)
  ticket/                RepairTicket, DamageMap (Schadenskarte)
  emergency/             RescueClock
  parts/                 DisplayCompare (echte Eingabeverzögerung)
  invoice/               InvoiceBuilder (Editor) + InvoiceSheet (das Blatt, DIN 5008)
  pwa/                   ServiceWorkerRegister
lib/
  site.ts                Stammdaten (Name, Adresse, URL …) – zentrale Quelle
  seo.tsx                pageMeta() – Canonical/OG pro Seite, Breadcrumbs, JsonLd
  qr.ts                  QR-Encoder nach ISO/IEC 18004 (Byte-Modus, Stufe M, v1–20)
  imei.ts                Luhn-Prüfung mit offengelegter Rechnung
  ticket.ts              Ticket-Zustand aus der Adresse, Vorgangsnummer, .ics
  resale.ts              Ankauf-Bewertung als Liste begründeter Posten
  battery.ts             Alterungsmodell (kalendarisch + zyklisch)
  format.ts detect.ts theme.ts
  data/                  devices.ts (Modelle, Preise, Ankaufswerte), refurbished.ts,
                         faq.ts, reviews.ts, emergency.ts
  invoice/               types.ts calc.ts (Cent-Arithmetik) catalog.ts validate.ts
                         (§ 14 UStG) store.ts (localStorage) girocode.ts qr.ts
public/
  sw.js                  Handgeschriebener Service Worker (Precache, /offline-Fallback)
  og.png                 Link-Vorschaubild 1200×630 (scripts/generate-og.mjs)
  icons/                 PWA-Icons
scripts/
  build-static.mjs       Statischer Export (legt app/api beiseite)
  generate-icons.mjs     PWA-Icons rendern
  verify-qr.mjs          QR-Encoder gegen die Norm prüfen
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
  (Reveal, Configurator, DiagramShowcase, ContactForm, ServiceWorkerRegister,
  Bootloader, CommandPalette, DeviceCheck, DigitalTwin, ShaderField,
  die Werkzeuge unter check/, twin/, battery/, resale/, ticket/, parts/).
- Alle Firmendaten (Adresse, Telefon, Reparatur- und Ankaufspreise,
  Impressum) sind **Platzhalter** und vor dem Livegang zu ersetzen.

### Metadaten: jede Seite setzt ihre eigenen

Jede Route exportiert `metadata` über **`pageMeta()`** aus `lib/seo.tsx` –
niemals ein handgeschriebenes `Metadata`-Objekt.

Grund: Next.js vererbt `alternates.canonical` und `openGraph.url` aus dem
Root-Layout an jede Seite, die sie nicht selbst setzt. Standen sie dort, meldete
**jede** Unterseite die Startseite als kanonische URL – für Google sind
`/reparatur`, `/check` und `/kontakt` dann Duplikate und fliegen aus dem Index.
Deshalb stehen im Root-Layout bewusst weder `canonical` noch `openGraph.url`.

Prüfen lässt sich das nach jedem Build:

```bash
grep -o '<link rel="canonical" href="[^"]*"' .next/server/app/*.html
```

Jede Zeile muss einen **eigenen** Pfad zeigen.

### Redaktionsregel: keine erfundenen Zahlen

Sichtbare Kennzahlen (Bewertungen, Stückzahlen, Quoten) müssen belegbar sein
und aus `lib/site.ts` stammen, wenn es sie dort gibt. Widersprechen sich
sichtbarer Text und JSON-LD, wertet Google beides ab – und ein Besucher, der
zwei verschiedene Bewertungsschnitte auf einer Seite liest, glaubt keinem.
Dieselbe Regel gilt für `lib/data/reviews.ts` (nur wörtlich übernommene echte
Google-Rezensionen) und für Garantieangaben (immer `site.warrantyMonths`,
nie eine feste Zahl im Text).

### Rechnungswerkzeug (`/intern/rechnung`)

Internes Werkzeug, nicht verlinkt und nicht in der Sitemap: `noindex, nofollow`
per Seiten-Metadaten, `Disallow: /intern/` in `robots.ts`.

- **Kein Server.** Profil, Kundenarchiv, Entwurf und Verlauf liegen in
  `localStorage` (`lib/invoice/store.ts`). Rechnungsdaten enthalten Namen,
  Anschriften und IMEIs – was nie übertragen wird, kann nicht abfließen. Preis
  dafür: Der Bestand hängt am Gerät, deshalb Export/Import als JSON.
- **Beträge sind ganzzahlige Cent** (`lib/invoice/calc.ts`), gerundet pro
  Position. Nie in Euro-Fließkomma rechnen.
- **Preise stammen aus `lib/data/devices.ts`** (`lib/invoice/catalog.ts`), damit
  Rechnung und Sofortpreis-Rechner nicht auseinanderlaufen.
- **Das Blatt ist ein Blatt:** 210 × 297 mm, `overflow: hidden`, alle Maße in
  Millimetern, Anschriftfeld nach DIN 5008 Form B. Was nicht draufpasst, wird
  abgeschnitten – deshalb misst `InvoiceBuilder` die Unterkante des Inhalts
  gegen die Fußzeile (`data-sheet-body` / `data-sheet-foot`) und meldet einen
  Überlauf als Pflichtfehler. Ohne diese Messung druckt das Werkzeug
  wortlos Rechnungen ohne Rechnungsbetrag. Etwa sechs Positionen mit Zusatzzeile
  passen; mehr braucht echte Mehrseitigkeit, die es noch nicht gibt.
- **Der Druck-Block in `globals.css` blendet `body > header` / `body > footer`
  aus, nicht `header` / `footer`.** Der Fuß des Rechnungsblatts trägt
  Steuernummer, USt-IdNr. und Bankverbindung; ein Selektor auf das nackte
  Element nähme genau die Pflichtangaben mit.
- Der GiroCode (EPC069-12) wird ohne Bibliothek erzeugt (`lib/invoice/qr.ts`,
  Byte-Modus, Fehlerkorrektur M, Versionen 1–13). Die längstmögliche
  EPC-Nutzlast liegt bei ~278 Zeichen und passt damit sicher hinein.


### Zwei Regeln, die über der Optik stehen

**Nichts behaupten, was nicht stimmt.** Die Werkzeuge hier rechnen, statt zu
raten, und legen offen, wie sie rechnen – der Ankaufsrechner zeigt jeden
Abzug einzeln, der Akku-Coach nennt seine Konstanten, die IMEI-Prüfung zeigt
die Luhn-Rechnung. Wo etwas geschätzt ist, steht „Schätzung" dabei; wo etwas
veranschaulicht ist (Farbdrift im Display-Vergleich), steht das ebenfalls
dabei. Kein erfundener Countdown, keine erfundenen Marktpreise, keine
Hersteller-Zuordnung aus einer IMEI. Lieber eine Lücke als eine Behauptung.

**Der Notfall hat Vorrang vor allem.** `/notfall` muss ohne JavaScript, ohne
Netz und auf jedem Gerät funktionieren. Deshalb stehen dort alle vier
Protokolle vollständig im HTML statt hinter einem Umschalter, und deshalb
steht die Seite an erster Stelle im Precache des Service Workers. Wer daran
etwas ändert, prüft beides.

### Personenbezogene Daten

Es gibt keine Datenbank und keine Konten. Was ein Besucher eingibt, bleibt im
Arbeitsspeicher seines Tabs – auch die IMEI im Übergabeprotokoll, das
ausdrücklich nicht in localStorage geschrieben wird. Verlassen darf es das
Gerät nur, wenn er selbst eine Anfrage absendet. Der Zustand des
Reparatur-Tickets steht bewusst lesbar in der Adresse (Gerät und Reparaturen,
nichts Persönliches). Wer hier etwas ergänzt, zieht `app/datenschutz` mit.

### Offene Punkte vor dem Livegang

- **Bankverbindung eintragen:** Das Rechnungswerkzeug startet ohne IBAN, BIC und
  Steuernummer – beim ersten Start unter „Stammdaten" hinterlegen, sonst bleibt
  der GiroCode aus und die Rechnung ist unvollständig.
- **Garantiedauer prüfen:** `site.warrantyMonths` steht auf `12`. FAQ,
  Ersatzteil-Seite und Metadaten nannten zuvor teils 24 Monate. Der Wert ist
  jetzt an einer Stelle gepflegt – dort den tatsächlich zugesagten Zeitraum
  eintragen.
- **Kennzahlen bestätigen:** „45 Min durchschnittlicher Displaytausch" und die
  Angaben im Konfigurator sind betriebliche Zusagen und sollten stimmen.
- Adresse, Telefon, USt-IdNr. und Preise in `lib/site.ts` bzw.
  `lib/data/devices.ts` gegenprüfen.
