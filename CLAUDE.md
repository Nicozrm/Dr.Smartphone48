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
npm run verify:qr         # QR-Encoder gegen ISO/IEC 18004 prüfen
npm run verify:procedure  # Werkstattabläufe gegen die zugesagten Zeiten
npm run verify:inspection # Prüfprotokoll + Bestand gegen die eigenen Zusagen
npm run verify:support    # Update-Horizont gegen den Gerätekatalog
npm run verify:status     # Werkstattablauf gegen das Datenbankschema
npm run verify:co2        # Herstellungs-Fußabdruck gegen den Gerätekatalog

npm run cf:build      # Cloudflare-Worker bauen (OpenNext)
npm run cf:preview    # Worker lokal in workerd testen
npm run cf:deploy     # Auf Cloudflare Workers deployen

node scripts/generate-icons.mjs   # PWA-Icons neu rendern (headless Chromium)
node scripts/generate-og.mjs      # public/og.png neu rendern (Link-Vorschaubild)
```

Es gibt keine Test-Suite. Verifikation = `npm run build` + `npm run lint`.

Dazu vier Prüfskripte, und alle vier prüfen dasselbe: dass eine Zusage der
Seite noch stimmt. Sie sind kein Ersatz für Tests, sondern die Stellen, an
denen ein stiller Fehler die Website zur Lügnerin macht, ohne dass jemand
etwas merkt.

- `verify:qr` – der QR-Encoder gegen ISO/IEC 18004. Ein Fehler hier ergibt
  einen Ausdruck, den kein Telefon liest.
- `verify:procedure` – die Summe der Arbeitsschritte gegen
  `repairMeta[kind].minutes`. Auf /reparatur steht ausdrücklich, dass beides
  übereinstimmt.
- `verify:inspection` – die Anzahl der Positionen im Prüfprotokoll gegen
  `site.checkpoints` (das „40-Punkte-Protokoll“), plus jedes Gerät im
  Bestand gegen seinen eigenen Zustandsgrad.
- `verify:support` – jedes Modell im Katalog hat einen Update-Horizont,
  jede Angabe einen Beleg, und die Daten stehen in plausibler Reihenfolge.
  Schlägt außerdem an, wenn `SUPPORT_CHECKED` über ein Jahr alt ist.
- `verify:status` – der Werkstattablauf in `lib/tickets/status.ts` gegen das
  Postgres-Enum in `supabase/migrations/`: gleiche Zustände, gleiche
  Reihenfolge. Dazu Kontaktkanäle, die Form des Vorgangscodes, die Namen der
  Realtime-Kanäle und die Zusage, dass es auf den Vorgangstabellen keine
  Policy für `anon` gibt.
- `verify:co2` – jeder Eintrag in `lib/data/co2.ts` hat ein Modell im
  Katalog, keiner steht doppelt, jede Zahl liegt in einer plausiblen Spanne
  und trägt einen Beleg. Schlägt außerdem an, wenn `CO2_CHECKED` über ein
  Jahr alt ist.

## Deployment (Vercel – hier läuft die Seite)

Produktion: **https://www.drsmartphone48.repair**, gebaut aus `main`. Kein
Adapter, keine Sonderkonfiguration – Next.js auf seiner Heimatplattform.

Alle Umgebungsvariablen sind **optional**; ohne sie läuft die Website
vollständig, nur die betreffende Funktion fehlt und sagt das auch. Einzutragen
unter *Project Settings → Environment Variables*, Namen und Zweck stehen in
`.env.example`:

| Variable | Ohne sie |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | keine Anmeldung, keine Statusverfolgung |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dito – beide gehören zusammen |
| `SUPABASE_SERVICE_ROLE_KEY` | Anmeldung und Statusseite antworten mit 503 |
| `RESEND_API_KEY`, `CONTACT_FROM` | Kontaktformular weicht auf einen E-Mail-Entwurf aus; Statusmeldungen gehen nicht raus |
| `NEXT_PUBLIC_SITE_URL` | es gilt `site.url` aus `lib/site.ts` |

**Zwei Fallstricke, die Zeit kosten, wenn man sie nicht kennt:**

- **`NEXT_PUBLIC_*` wird beim Bauen eingesetzt, nicht zur Laufzeit.** Eine
  neue Variable im Hoster ändert gar nichts, bis neu deployt wurde. Wer die
  Anmeldung einschaltet und sie danach nicht sieht, hat meistens genau das
  vergessen.
- **Der Rate-Limiter ist prozesslokal** (`lib/api/rate-limit.ts`). Auf
  Serverless verteilt sich der Verkehr über Instanzen; die Bremse wirkt als
  grobe Bremse, nicht als harte Grenze. Für harte Grenzen einen gemeinsamen
  Zustand nachrüsten.

Die Domain trägt `www.` – nur dieser Name hat ein Zertifikat. Soll auch die
Adresse ohne `www.` funktionieren, muss sie in Vercel unter *Domains* ergänzt
werden; sonst bricht der Aufruf an der TLS-Prüfung ab.

## Deployment (Cloudflare Workers – Alternative)

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
  statt auf die Live-Domain. Lokal (ohne die Variable) gibt es weder basePath
  noch URL-Umschaltung.
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
  reparatur/             Sofortpreis-Rechner (Signature-Feature) + Werkstattablauf + FAQ
  notfall/               Notfall-Protokolle (ohne JS lesbar, offline im Cache)
  check/                 Geräte-Check: Sensor-Diagnose im Browser
  ankauf/                Restwert-Rechner mit offengelegter Rechnung
  zwilling/              Digitaler Zwilling, Akku-Coach, Reparieren-oder-neu
  versorgung/            Update-Horizont: bis wann jedes Modell noch
                         Sicherheitsupdates bekommt
  ticket/                Reparatur-Ticket + Übergabeprotokoll (noindex),
                         am Ende die freiwillige Anmeldung eines Vorgangs
  status/                Vorgangsnummer eingeben …
  status/[ticketCode]/   … und den Stand verfolgen (Realtime, noindex; im
                         statischen Export ausgeklammert)
  refurbished/           Bestand (Gitter) …
  refurbished/[id]/      … und je Gerät eine Akte: Prüfprotokoll mit allen
                         40 Positionen, Messwerte, Product-JSON-LD, druckbar
  ersatzteile/ werkstatt/ kontakt/
  impressum/ datenschutz/ agb/ offline/ not-found.tsx
  intern/rechnung/       Rechnungswerkzeug (nicht verlinkt, noindex, kein Server)
  intern/werkstatt/      Vorgangs-Dashboard (nicht verlinkt, noindex, Anmeldung)
  api/kontakt/           Route Handler für das Formular (nur im Server-Build)
  api/tickets/           Vorgang anmelden (POST)
  api/status/[code]/     Vorgang lesen (GET, redigiert) und ändern (PATCH)
  api/werkstatt/         Anmeldung, Liste und Akte für das Dashboard
  layout.tsx             Root-Layout: Metadata, JSON-LD, Header/Footer, SW-Registrierung
  globals.css            Design-Tokens (CSS-Variablen) + Tailwind-4-Theme + Motion + Druck
  sitemap.ts robots.ts manifest.ts   Metadata-Routen (force-static)
components/
  ui/                    Primitives: Button, Icon (eigenes SVG-Set), Reveal,
                         SectionHeading, ThemeToggle, SoundToggle, QrCode,
                         PrintButton
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
  ticket/                RepairTicket, DamageMap (Schadenskarte),
                         TicketRegistration (Anmeldung – nur mit Backend)
  status/                TicketStatusView (lädt + hört zu), StatusTimeline,
                         StatusBadge, TicketLookup
  workshop/              WorkshopDashboard, TicketList, TicketDetail,
                         StatusControl, WorkshopStats, WorkshopLogin,
                         ShortcutHelp
  emergency/             RescueClock
  parts/                 DisplayCompare (echte Eingabeverzögerung)
  procedure/             RepairProcedure (Werkstattablauf im Zeitraffer)
  support/               SupportHorizon (Zeitachse), SupportTable (alle Modelle)
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
  format.ts detect.ts theme.ts sound.ts (Klickton im Rechner, synthetisiert,
                         standardmäßig aus)
  data/                  devices.ts (Modelle, Preise, Ankaufswerte), refurbished.ts
                         (Bestand inkl. Zyklen, Prüfdatum, ersetzte Teile, Befund),
                         inspection.ts (die 40 Prüfpositionen), procedure.ts
                         (Werkstattschritte), support.ts (Update-Horizont je
                         Modell), co2.ts (Herstellungs-Fußabdruck je Modell,
                         aus Hersteller-Umweltberichten), faq.ts, reviews.ts,
                         emergency.ts
  invoice/               types.ts calc.ts (Cent-Arithmetik) catalog.ts validate.ts
                         (§ 14 UStG) store.ts (localStorage) girocode.ts qr.ts
  tickets/               status.ts (die acht Zustände), code.ts (Vorgangscode),
                         types.ts, validate.ts, public-view.ts (Redaktion),
                         repository.ts (einzige Datenzugriffsschicht),
                         registration.ts, links.ts
  supabase/              env.ts (gibt es ein Backend?), admin.ts (Service-Role,
                         nur Server), server.ts (Sitzung + requireStaff),
                         browser.ts (nur Realtime), database.ts (Schema als Typ)
  notify/                types.ts (Adapter-Vertrag), registry.ts, dispatch.ts,
                         messages.ts, adapters/ (email, webhook, push)
  realtime/              topics.ts, useStatusChannel.ts
  api/                   respond.ts (Antwortform), rate-limit.ts, client.ts
                         (jede Adresse genau einmal)
  workshop/              useWorkshopTickets.ts, useShortcuts.ts
supabase/
  migrations/            Schema, RLS, Realtime – in dieser Reihenfolge
  README.md              Einrichtung, Personal freischalten, Aufbewahrung
public/
  sw.js                  Handgeschriebener Service Worker (Precache, /offline-Fallback)
  og.png                 Link-Vorschaubild 1200×630 (scripts/generate-og.mjs)
  icons/                 PWA-Icons
scripts/
  build-static.mjs       Statischer Export (legt app/api und app/status/[…] beiseite)
  generate-icons.mjs     PWA-Icons rendern
  verify-qr.mjs          QR-Encoder gegen die Norm prüfen
  verify-procedure.mjs   Ablaufzeiten gegen repairMeta.minutes
  verify-inspection.mjs  Prüfpositionen gegen site.checkpoints, Bestand gegen Grad
  verify-support.mjs     Update-Horizont gegen den Gerätekatalog
  verify-status.mjs      Werkstattablauf gegen das Datenbankschema
```

## Konventionen

- **Design-Tokens** ausschließlich über die CSS-Variablen in `app/globals.css`
  (Farben `--ink-*`/`--surface-*`, Radius `--radius-*`, Motion `--ease-*`,
  `--duration-*`). Keine Ad-hoc-Farben oder -Timings.
- **Der Akzent atmet – aber nur als Fläche.** `--accent-a` und `--accent-b`
  sind die Endpunkte; die Klasse `.breathe` (an der primären Schaltfläche)
  wandert über zwölf Sekunden zwischen ihnen. `--accent` selbst steht still
  und gilt für Linien, Schrift und Ränder. Wer den Ton ändert, ändert alle
  drei Werte gemeinsam.

  **Nicht auf Custom Properties umbauen.** Der naheliegende Weg – eine per
  `@property` registrierte Zahl animieren und `--accent` daraus mischen –
  kostet auf einem vierfach gedrosselten Telefon 1282 ms zusätzliche
  Stil-Neuberechnung, mehr als alles andere auf der Seite zusammen: Chromium
  rechnet bei animierten Custom Properties je Bild den Stil neu, weitgehend
  unabhängig davon, ob sie vererbt werden (672 ms selbst an nur drei
  Elementen). Die direkte Animation von `background-color` kostet 83 ms.
  Gemessen mit `Tracing` über `UpdateLayoutTree`, Median aus drei Läufen.
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

### Der vertikale Takt: zwei Stufen, nicht sieben

Abschnittsflächen benutzen genau zwei Paare, und zwar nach Rolle, nicht nach
Geschmack:

| Rolle | Klassen |
| --- | --- |
| Abschnitt auf einer Unterseite | `py-20 md:py-28` |
| Abschnitt auf der Startseite | `py-24 md:py-36` |
| dichtes Band (Nachsatz, Hinweiszeile) | `py-16 md:py-20` |

Von 24 Abschnittsflächen folgen 17 diesem Takt. Die Ausreißer sind gezählt und
teils gewollt – der Schlussaufruf der Startseite steht bewusst auf
`py-28 md:py-40`, weil er als einziger Abschnitt Luft nach beiden Seiten
braucht. Wer eine neue Fläche anlegt, nimmt eines der drei Paare; wer ein
viertes braucht, hat wahrscheinlich ein Gliederungsproblem und kein
Abstandsproblem.

**Jede Fläche braucht eine `md:`-Variante.** Eine Fläche mit nur `py-16` liest
sich auf dem Schreibtisch merklich enger als ihre Nachbarn – genau so ein Fall
lag auf /versorgung und ist behoben.

### Kontrast: die Tonleiter ist gemessen, nicht geschätzt

Alle vier Textstufen (`--ink-strong`, `--ink`, `--ink-soft`, `--ink-faint`)
erreichen in beiden Themes mindestens **4.5:1** gegen die dunkelste Fläche, auf
der sie stehen (`--surface-sunken`). Das ist kein Zufallsergebnis: Zuvor lag
`--ink-soft` bei 4.31:1 und `--ink-faint` bei 2.25:1 – an ihnen hängt der
gesamte Fließtext bzw. die Vertrauenszeile im Hero.

Wer eine dieser Farben anfasst, rechnet nach. Ebenso bei neuen Status- oder
Flächenfarben.

Auf gefüllten Akzentflächen gilt **`text-accent-contrast`**, nie `text-white`.
Grund: `--accent` muss im Dunkelmodus aufgehellt sein, um als Textfarbe auf
Schwarz zu bestehen – Weiß darauf käme dann nur noch auf 3.33:1. Das eigene
Token löst hell zu Weiß und dunkel zu `#101114` auf.

### Gesperrte Bereiche: `inert`, nicht `aria-hidden`

Ausgegraute Abschnitte (etwa die noch nicht freigeschalteten Schritte im
Konfigurator) bekommen `inert`. `aria-hidden` mit weiterhin fokussierbaren
Schaltflächen darin ist laut WCAG unzulässig und erzeugt eine tote Zone: Die
Tabulatortaste landet in einem Feld, das die Vorlesehilfe nicht ankündigt und
die Maus nicht bedienen kann. `inert` nimmt Fokusreihenfolge,
Zeigerereignisse und Barrierefreiheitsbaum in einem Zug – ein zusätzliches
`pointer-events-none` erübrigt sich damit.

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

Zwei Zahlen sind inzwischen maschinell abgesichert, weil sie ausdrücklich als
Zusage formuliert sind:

- **`site.checkpoints` (40 Punkte).** Der Prüfplan steht vollständig in
  `lib/data/inspection.ts` und wird auf jeder Geräteakte gedruckt.
  `verify:inspection` bricht ab, wenn Zahl und Positionen auseinanderlaufen.
- **`repairMeta[kind].minutes`.** Die Arbeitsschritte in
  `lib/data/procedure.ts` müssen sich exakt darauf summieren
  (`verify:procedure`).

Wer eine der beiden Zahlen ändert, ändert die andere Seite mit – sonst
verspricht die Website etwas, das der eigene Datenbestand widerlegt.

Dieselbe Disziplin gilt für `lib/data/co2.ts` (Herstellungs-Fußabdruck je
Modell, in „Reparieren oder neu" auf `/zwilling`): Jede Zahl kommt aus dem
eigenen Umweltbericht von Apple, Google oder Samsung, nie aus einer eigenen
Schätzung. Für Modelle ohne auffindbaren Bericht (Galaxy S22, A54, A34) gibt
es bewusst keinen Eintrag – `co2For()` liefert dann `undefined`, und die
Oberfläche fällt auf die allgemein gekennzeichnete Näherung zurück, statt
eine Zahl zu erfinden. `verify:co2` prüft Gegenstück im Katalog, Duplikate,
Plausibilität und das Prüfdatum.

### Bestand aufbereiteter Geräte (`lib/data/refurbished.ts`)

Jedes Gerät trägt neben Preis und Zustandsgrad vier Felder, die im
Prüfprotokoll landen: `cycles`, `checkedOn`, `replaced` und `note`. Sie
werden bei der Aufbereitung erfasst, nicht beim Rendern erzeugt – ein
zufällig generierter Befund wäre genau die Sorte Behauptung, die diese Seite
vermeiden soll.

`verify:inspection` prüft den Bestand deshalb gegen sich selbst: Kapazität
über dem Mindestwert des eigenen Grades, „Akku ersetzt“ nur bei niedriger
Zyklenzahl, jeder Grad unterhalb „Wie neu“ mit benanntem Befund. Ein Gerät
ohne Befund, das trotzdem „Gut“ heißt, fällt durch.

### Update-Horizont (`lib/data/support.ts`)

Die heikelste Tabelle der Website: Sie nennt Datumsangaben, nach denen
Kunden entscheiden, ob sie 219 € in ein Gerät stecken – und sie veraltet von
selbst, weil Hersteller ihre Zusagen ändern.

Zwei Regeln halten das aus:

- **Jede Angabe trägt ihre Quellenart.** `hersteller` heißt: Der Hersteller
  hat den Zeitraum öffentlich zugesagt (Google und Samsung tun das seit 2023
  ausdrücklich). `schaetzung` heißt: Es gibt keine Zusage, nur ein bisher
  eingehaltenes Muster – das trifft auf Apple zu. Auf der Seite steht die
  Sorte immer dabei. Eine Schätzung, die aussieht wie eine Zusage, ist eine
  Lüge mit Zwischenschritt.
- **`SUPPORT_CHECKED` ist das Datum der letzten Prüfung.** `verify:support`
  warnt nach sechs Monaten und bricht nach zwölf ab. Wer die Tabelle prüft,
  setzt das Datum hoch – auch dann, wenn sich nichts geändert hat.

Die Restlaufzeit („noch 6 Monate") wird **im Browser** gerechnet, nicht beim
Bauen. Die Seite wird statisch exportiert; ein serverseitig gerechneter Wert
wäre auf dem Datum des letzten Deploys eingefroren und Monat für Monat
falscher. Ohne JavaScript bleiben die Datumsangaben stehen – sie sind die
Information, die Restlaufzeit ist die Bequemlichkeit.

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
  abgeschnitten.
- **Mehrseitigkeit** rechnet `lib/invoice/paginate.ts`: Es verteilt die
  Positionen auf Blätter, setzt auf jedes Folgeblatt einen Fortsetzungskopf
  („Rechnung … · Seite 2 von 2") und führt den **Übertrag** als erste Zeile
  mit. Der Übertrag ist der Bruttobetrag der vorangegangenen Blätter – wer
  hier etwas ändert, prüft, dass Übertrag plus Folgepositionen wieder die
  Endsumme ergeben.
- **Belegarten** (`lib/invoice/doctype.ts`): Rechnung, Kostenvoranschlag,
  Angebot, Gutschrift, Storno. Dieselben Positionen und dieselbe Rechenlogik,
  anderes Kürzel im Nummernkreis und andere Sprache im Blatt.
- **Der Briefkopf** (`components/invoice/Letterhead.tsx`) borgt sich drei
  Techniken aus dem Wertpapierdruck: Mikroschrift statt Haarlinie,
  Guillochenrosette als Wasserzeichen, Millimeterskala am Rand. Alle drei
  sind reines CSS/SVG – kein Bildmaterial, keine Schriftdatei, null Byte
  Ladelast.
- **Der Druck-Block in `globals.css` blendet `body > header` / `body > footer`
  aus, nicht `header` / `footer`.** Der Fuß des Rechnungsblatts trägt
  Steuernummer, USt-IdNr. und Bankverbindung; ein Selektor auf das nackte
  Element nähme genau die Pflichtangaben mit.
- Der GiroCode (EPC069-12) wird ohne Bibliothek erzeugt (`lib/invoice/qr.ts`,
  Byte-Modus, Fehlerkorrektur M, Versionen 1–13). Die längstmögliche
  EPC-Nutzlast liegt bei ~278 Zeichen und passt damit sicher hinein.


### Vorgangsverwaltung (`/status`, `/intern/werkstatt`)

Der einzige Teil dieser Website mit einer Datenbank – und der einzige, der
**abschaltbar** ist. Ohne `NEXT_PUBLIC_SUPABASE_URL` läuft alles wie zuvor:
Der Sofortpreis-Rechner rechnet, das Ticket entsteht aus der Adresse, das
Übergabeprotokoll bleibt im Browser. Die Anmeldung und die Statusseite
erscheinen dann gar nicht erst. Einrichtung: `supabase/README.md`,
Variablennamen: `.env.example`.

**Die Grenze ist die Anmeldung.** Bis dahin speichert diese Website über einen
Besucher nichts, und das steht auf der Ticketseite als Zusage. Der Abschnitt
`TicketRegistration` überschreitet die Grenze bewusst: sichtbar getrennt vom
Protokoll, mit einer Liste dessen, was übertragen wird, und mit dem
`ConsentGate` davor. Vom Übergabeprotokoll geht dabei **nichts** mit –
Schadenskarte, Zubehör und Sperrcode bleiben im Arbeitsspeicher. Wer daran
etwas ändert, zieht `app/datenschutz` mit; dort steht der Abschnitt
„Reparaturvorgang anmelden“ und erscheint unter derselben Bedingung.

**Der Vorgangscode ist ein Schlüssel, kein Ausweis** (`lib/tickets/code.ts`).
Acht Zeichen aus einem Alphabet ohne I, O, 0 und 1, gezogen mit
`crypto.getRandomValues`. Wer ihn hat, sieht die Statusseite – deshalb steht
dort nichts, was in fremden Händen schadet. Was nach draußen geht, entscheidet
`toPublicTicket` in `lib/tickets/public-view.ts`, und zwar an genau einer
Stelle: kein Name, kein Telefon, keine E-Mail, keine IMEI, keine internen
Vermerke. Ein Vermerk wird nur sichtbar, wenn er mit `+` beginnt.

**Für Kunden gibt es keine RLS-Policy.** Nicht für `anon`, nicht für
`authenticated`. Die Statusseite liest ausschließlich über
`/api/status/[ticketCode]`, das serverseitig mit der Service-Role liest und
vorher redigiert. Eine Lese-Policy für `anon` wäre eine Lese-Policy für jeden,
der acht Zeichen durchprobiert. `verify:status` schlägt an, wenn doch eine
entsteht.

**Realtime ist ein Signal, keine Datenquelle.** Kein `postgres_changes` – das
verschickte die ganze Zeile samt Name, Telefon und IMEI. Stattdessen sendet
der Trigger je Kanal genau so viel, wie der Empfänger braucht:

- `vorgang:<CODE>` – Zustand und zwei Zeitstempel. Die Kundenseite schaltet
  damit sofort um und lädt die Zeitleiste entprellt nach.
- `werkstatt:vorgaenge` – **nur ein Zeitstempel.** Das Dashboard lädt bei
  jedem Anstoß ohnehin über die angemeldete API nach.

Kein Intervall, kein Polling.

Beide Kanäle sind **öffentlich**, und das ist kein Versehen: Policies auf
`realtime.messages` kann die Rolle `postgres` nicht anlegen (die Tabelle
gehört `supabase_realtime_admin`), private Kanäle ohne Policy lassen niemanden
zu. Die Sicherheit steckt deshalb in der Nutzlast. Themennamen lassen sich
nicht durchsuchen – wer `vorgang:K7M2-B94X` hören will, muss den Code kennen,
dasselbe Modell wie bei der Statusseite. Und der Werkstattkanal, dessen Name
im JavaScript steht, trägt nichts, was jemandem nützt. `verify:status` prüft
genau das: Steht dort eines Tages ein Vorgangscode, schlägt es an.

**Der Ablauf steht zweimal**, in TypeScript und als Postgres-Enum. Das ist
unvermeidbar und deshalb maschinell abgesichert: `npm run verify:status`
vergleicht beide Listen zeichen- und reihenfolgengenau. Wer einen Zustand
hinzufügt, ändert beide Seiten – sonst lehnt die Datenbank ab, was die
Oberfläche anbietet.

**Ein Statuswechsel ist unteilbar.** Vorgang und Historie schreibt die
Datenbankfunktion `apply_ticket_status` in einer Transaktion; `changed_by`
kommt bei angemeldeten Aufrufen aus dem Token, nicht aus dem Parameter. Welche
Übergänge erlaubt sind, entscheidet dagegen `lib/tickets/status.ts` –
vorwärts frei, genau ein Schritt zurück. Zwei Implementierungen derselben
Regel driften auseinander.

**Zugang zur Werkstatt:** Supabase Auth plus ein Eintrag in `workshop_staff`.
Beides ist nötig, und den zweiten Teil kann nur jemand mit Datenbankzugriff
setzen – ein Dashboard, an dem man sich selbst freischaltet, ist keins. Der
Service-Role-Schlüssel liegt nie im Browser; das Dashboard arbeitet mit dem
Token der angemeldeten Person, und die Policies entscheiden.

**Im statischen Export gibt es die Vorgangsverwaltung nicht.**
`scripts/build-static.mjs` legt `app/api` und `app/status/[ticketCode]`
beiseite (ein dynamisches Segment braucht dort eine vollständige Werteliste,
und eine leere lehnt Next.js ab). `/status` und `/intern/werkstatt` stehen
trotzdem und sagen, dass es hier nichts zu bedienen gibt, statt in einen
Ladebalken zu laufen.

**Benachrichtigungen sind Adapter, keine Anbieter** (`lib/notify/`). E-Mail
läuft über Resend – dieselben Variablen wie das Kontaktformular. WhatsApp, SMS
und Push gehen an einen eigenen HTTPS-Endpunkt mit fester Nutzlast, damit der
Anbieter austauschbar bleibt. Ein Adapter ohne Zugangsdaten meldet
`isConfigured() === false` und sendet nicht; das Dashboard zeigt, was fehlt.
Benachrichtigt wird nur bei drei Zuständen und nur, wenn der Kunde einen Weg
gewählt hat – Vorauswahl ist „keine Nachrichten“.

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

### Die Absenderegel: erst zustimmen, dann senden

**Kein Auftrag und keine Anfrage verlässt das Gerät ohne zwei bewusste
Handlungen** – Haken an der Datenschutzerklärung, danach Druck auf „Senden".
Das gilt für jeden Weg nach draußen, gleich ob Server, E-Mail-Entwurf oder
WhatsApp. Der Haken ist nie vorausgewählt; ohne ihn passiert beim Drücken
nichts außer einer Erklärung.

Die Regel wohnt in **`components/ui/ConsentGate.tsx`**, nicht im Markup der
einzelnen Formulare. Eine neue Absendestelle bindet beides ein:

```tsx
const consent = useConsentGate();
…
<ConsentGate {...consent.gate} channel="mail" />   // oder channel="whatsapp"
<button {...consent.sendProps()} type="submit">Anfrage senden</button>
```

und als erste Zeile im Absendepfad `if (!consent.allow()) return;`. Dort sitzt
die Sperre – `sendProps` liefert nur die Optik (`data-consent-pending`, siehe
globals.css) und den Satz für die Vorlesehilfe.

Zurzeit gilt sie an fünf Stellen: Kontaktformular, Sofortpreis-Rechner
(Terminanfrage), Ankaufsrechner, WhatsApp-Anfrage im Reparatur-Ticket und die
Anmeldung eines Vorgangs (`components/ticket/TicketRegistration.tsx`).
Nackte `mailto:`-Verweise ohne vorausgefüllte Angaben (Footer, Impressum,
„Teileliste senden") fallen nicht darunter: Dort schreibt der Besucher seine
Nachricht selbst, die Seite überträgt nichts.

Drei Dinge, die dabei leicht kaputtgehen:

- **Kein `disabled` und kein `aria-disabled` an der Absende-Schaltfläche.**
  Beides hieße „nicht bedienbar" – der Druck ist hier aber der Weg zur
  Erklärung. `disabled` nimmt den Knopf zusätzlich aus der Tabulatorreihenfolge.
- **Die Nutzlast gehört nicht ins `href`.** Ein `<a href="…?text=…">` ließe
  sich per mittlerer Maustaste, „In neuem Tab öffnen" oder „Link kopieren" an
  jeder Prüfung im JavaScript vorbeitragen. Absendestellen sind Knöpfe; die
  Adresse entsteht erst nach `allow()`.
- **Serverseitig zweite Prüfung.** `app/api/kontakt/route.ts` verlangt die
  Zustimmung ein weiteres Mal. Was nur im Browser geprüft wird, ist nicht
  geprüft.

Wer daran etwas ändert, zieht `app/datenschutz` mit – dort steht die Regel
als Zusage an den Kunden, samt Ziel der Anfrage (das Google-Postfach des
Betriebs) und Widerrufsmöglichkeit.

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
