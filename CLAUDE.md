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
  reparatur/             Sofortpreis-Rechner (Signature-Feature) + Werkstattablauf + FAQ
  notfall/               Notfall-Protokolle (ohne JS lesbar, offline im Cache)
  check/                 Geräte-Check: Sensor-Diagnose im Browser
  ankauf/                Restwert-Rechner mit offengelegter Rechnung
  zwilling/              Digitaler Zwilling, Akku-Coach, Reparieren-oder-neu
  versorgung/            Update-Horizont: bis wann jedes Modell noch
                         Sicherheitsupdates bekommt
  ticket/                Reparatur-Ticket + Übergabeprotokoll (noindex)
  refurbished/           Bestand (Gitter) …
  refurbished/[id]/      … und je Gerät eine Akte: Prüfprotokoll mit allen
                         40 Positionen, Messwerte, Product-JSON-LD, druckbar
  ersatzteile/ werkstatt/ kontakt/
  impressum/ datenschutz/ agb/ offline/ not-found.tsx
  intern/rechnung/       Rechnungswerkzeug (nicht verlinkt, noindex, kein Server)
  api/kontakt/           Route Handler für das Formular (nur im Server-Build)
  layout.tsx             Root-Layout: Metadata, JSON-LD, Header/Footer, SW-Registrierung
  globals.css            Design-Tokens (CSS-Variablen) + Tailwind-4-Theme + Motion + Druck
  sitemap.ts robots.ts manifest.ts   Metadata-Routen (force-static)
components/
  ui/                    Primitives: Button, Icon (eigenes SVG-Set), Reveal,
                         SectionHeading, ThemeToggle, QrCode, PrintButton
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
  format.ts detect.ts theme.ts
  data/                  devices.ts (Modelle, Preise, Ankaufswerte), refurbished.ts
                         (Bestand inkl. Zyklen, Prüfdatum, ersetzte Teile, Befund),
                         inspection.ts (die 40 Prüfpositionen), procedure.ts
                         (Werkstattschritte), support.ts (Update-Horizont je
                         Modell), faq.ts, reviews.ts, emergency.ts
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
  verify-procedure.mjs   Ablaufzeiten gegen repairMeta.minutes
  verify-inspection.mjs  Prüfpositionen gegen site.checkpoints, Bestand gegen Grad
  verify-support.mjs     Update-Horizont gegen den Gerätekatalog
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
