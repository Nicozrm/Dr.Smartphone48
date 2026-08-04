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
npm run verify        # Prüfstand: die Regeln dieser Datei, ausgeführt
npm run verify:qr     # QR-Encoder gegen ISO/IEC 18004 prüfen

npm run cf:build      # Cloudflare-Worker bauen (OpenNext)
npm run cf:preview    # Worker lokal in workerd testen
npm run cf:deploy     # Auf Cloudflare Workers deployen

node scripts/generate-icons.mjs   # PWA-Icons neu rendern (headless Chromium)
node scripts/generate-og.mjs      # public/og.png neu rendern (Link-Vorschaubild)
```

Es gibt keine Test-Suite. Verifikation = `npm run build` + `npm run lint`
+ **`npm run verify`**.

### Der Prüfstand (`scripts/verify.mjs`)

Die Regeln in dieser Datei sind ausführbar. Der Grund steht in der
Fehlergeschichte des Projekts: Nacheinander sind ein Kontrastwert unter dem
Schwellenwert, jede Unterseite mit der Startseite als kanonischer URL,
Markdown-Sternchen in gerendertem Text, zweimal ein Backtick im GLSL-Literal
und ein reserviertes Wort als Shader-Variable durchgerutscht. Keiner dieser
Fehler war schwer zu finden. Alle waren schwer zu **bemerken**.

Geprüft wird:

| Prüfung | Worauf |
|---|---|
| Kontrast | alle Ink×Flächen-Paare in beiden Themes ≥ 4.5:1, Statusfarben, `--accent-contrast` auf `--accent`, kein `text-white` auf `bg-accent` |
| Redaktion | keine Markdown-Betonung in `lib/data/`-Textwerten, keine feste Garantiedauer außerhalb `site.ts` |
| Shader | kein Backtick im GLSL-Literal, keine GLSL-Schlüsselwörter als Bezeichner |
| Metadaten | jede Route nutzt `pageMeta()` |
| Export | eigener Canonical je Seite, `og:image` überall, nichts zugleich in Sitemap und auf `noindex` |

Die Export-Prüfungen laufen nur, wenn `./out` vorliegt – also nach
`npm run build:static`. In CI läuft der Prüfstand zweimal: vor dem Build für
den Quelltext, danach für den Export.

**Wer eine Regel ergänzt, ergänzt die Prüfung.** Und wer eine Prüfung
schreibt, baut den Fehler einmal absichtlich ein und sieht nach, ob sie
anschlägt – die `text-white`-Prüfung sah beim ersten Selbsttest nur in
`className`-Attribute und übersah damit genau die Stelle, an der der Fehler
tatsächlich saß.

`scripts/verify-qr.mjs` bleibt eigenständig: Es prüft den QR-Encoder gegen
ISO/IEC 18004, weil dort ein stiller Fehler zu einem unlesbaren Ausdruck
führt, ohne dass es jemandem auffällt.

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
  vorbereitung/          Übergabe-Assistent: was vor der Abgabe zu tun ist
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
  handover/              HandoverAssistant (Vorbereitung zur Abgabe)
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
                         faq.ts, reviews.ts, emergency.ts, handover.ts
  invoice/               types.ts calc.ts (Cent-Arithmetik) catalog.ts validate.ts
                         (§ 14 UStG) store.ts (localStorage) girocode.ts qr.ts
                         einvoice.ts + cii.ts (E-Rechnung nach EN 16931)
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
- Der GiroCode (EPC069-12) nutzt denselben Encoder wie der Rest der Seite
  (`lib/qr.ts`) und ist damit von `npm run verify:qr` erfasst. Es gab hier
  einmal eine zweite, eigene Umsetzung derselben Norm – ausgerechnet der Code,
  der zum Bezahlen auffordert, war dadurch der einzige ungeprüfte. Die
  längstmögliche EPC-Nutzlast liegt bei ~278 Zeichen und passt sicher hinein.

### E-Rechnung nach EN 16931 (`lib/invoice/einvoice.ts`, `cii.ts`)

Rechtlicher Hintergrund: Seit dem 1.1.2025 muss jedes deutsche Unternehmen
strukturierte E-Rechnungen **empfangen** können. Ausstellen muss sie ab dem
1.1.2027, wer über 800.000 € Vorjahresumsatz liegt – ab dem **1.1.2028 jeder**
im B2B-Geschäft. Eine Werkstatt, die einer GmbH ein Display tauscht, fällt
darunter.

Erzeugt werden zwei Ausprägungen derselben CII-Syntax (UN/CEFACT):
**ZUGFeRD 2.3 / Factur-X** (`urn:cen.eu:en16931:2017`) für Unternehmen und
**XRechnung 3.0** für Behörden. Beide entstehen im Browser, ohne Server.

- **Die Kennung der XRechnung lautet `urn:xeinkauf.de:kosit:xrechnung_3.0`**,
  nicht mehr `urn:xoev-de:kosit:standard:...`. Die KoSIT hat den Namensraum mit
  Version 3.0 gewechselt; die alte Kennung sieht fast gleich aus, gilt der
  Prüfung der Verwaltung aber als „keine XRechnung“.
- **CII ist ein sequenzielles Schema.** Die Reihenfolge der Elemente ist
  bindend – in `ram:ApplicableTradeTax` etwa CalculatedAmount → TypeCode →
  ExemptionReason → BasisAmount → CategoryCode → RateApplicablePercent. Wer
  umsortiert, produziert ein Dokument, das automatisch abgelehnt wird.
- **§ 19 und § 25a werden als Kategorie `E` mit Befreiungsgrund abgebildet.**
  Für die Differenzbesteuerung ist das gängige Praxis, aber keine reine Lehre –
  die Norm kennt dafür keine eigene Kategorie. Einmal vom Steuerbüro
  bestätigen lassen.
- Für die XRechnung sind Leitweg-ID (BT-10) und elektronische Adresse des
  Empfängers (BT-49) Pflicht. Beide stehen im Abschnitt „Empfänger“.

Prüfen mit dem Validator der Referenzimplementierung (Java erforderlich):

```bash
curl -sSLo validator.jar \
  https://repo1.maven.org/maven2/org/mustangproject/validator/2.24.0/validator-2.24.0-shaded.jar
# Wrapper, weil das Jar keine Main-Klasse mitbringt:
cat > Val.java <<'EOF'
import org.mustangproject.validator.ZUGFeRDValidator;
public class Val { public static void main(String[] a) throws Exception {
  System.out.println(new ZUGFeRDValidator().validate(a[0])); } }
EOF
javac -cp validator.jar -d . Val.java && java -cp .:validator.jar Val rechnung.xml
```

Erwartung: XRechnung `failed = 0`. Für ZUGFeRD bleibt genau eine Meldung
(BR-DE-21) – der Validator prüft immer gegen XRechnung, und ein ZUGFeRD-Beleg
trägt zu Recht die neutrale EN-16931-Kennung.

### Warum `calc.ts` gruppenweise rechnet

Die Steuer wird **je Steuersatz aus der Bemessungsgrundlage** abgeleitet, nicht
aus der Summe gerundeter Einzelsteuern. Das ist keine Feinheit: EN 16931
verlangt es in BR-CO-17, und beide Wege lagen im Test regelmäßig einen Cent
auseinander. Das gedruckte Blatt sah dabei weiterhin plausibel aus, während die
E-Rechnung automatisch zurückgewiesen wurde.

Damit trotzdem kein Kunde „2 × 19,90 = 39,79“ liest, gilt: **Der eingegebene
Wert bleibt unangetastet, verteilt wird nur der abgeleitete.** Bei
Bruttoeingabe stehen die Bruttobeträge der Positionen fest; die Nettobeträge
werden mit der Methode der größten Reste so verteilt, dass ihre Summe die
Bemessungsgrundlage trifft (`largestRemainder`). `netFromGross` sucht zusätzlich
den Nettowert, der die Bruttosumme **exakt** reproduziert – das gelingt in rund
83 % der Fälle. Sonst gewinnt die Norm und ein Cent wandert auf die größte
Position.

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

### Übergabe-Assistent (`/vorbereitung`)

Beantwortet, was vor einer Abgabe zu erledigen ist – und grenzt sich damit
bewusst von `/ticket` ab: Das Ticket **protokolliert** am Tresen, dass Backup
und Gerätesuche erledigt sind, diese Seite erklärt zu Hause das **Wie**.

- **Jeder Schritt nennt seine Folge** (`ifSkipped` in `lib/data/handover.ts`).
  Nicht „bitte erledigen", sondern was konkret entfällt. Neue Schritte ohne
  diese Angabe sind unvollständig.
- **Menüpfade sind Beispiele, keine Zusicherung.** Apple und die
  Android-Hersteller benennen Menüs um; wo ein Pfad veralten kann, steht das
  dabei, statt eine Genauigkeit zu behaupten, die niemand pflegt.
- **Der Sperrcode ist eine Abwägung, keine Aufforderung.** Für alle drei Wege
  steht, welche Prüfungen möglich bleiben (`covered`) und welche entfallen
  (`notCovered`). Die Werkstatt hat ein Interesse am bequemsten Weg – das ist
  kein Grund, die anderen schlechtzureden. Wer hier etwas ändert, prüft, dass
  `notCovered` weiterhin vollständig ist.
- **Keine Markdown-Syntax in den Textwerten.** Die Strings werden direkt
  gerendert; `**fett**` erscheint wörtlich auf der Seite. Betonung gehört in
  die Formulierung.
- Der Fortschritt steht in der Adresse (`?p=ios&ok=backup.lock&c=muendlich`) –
  nichts Persönliches, kein Speicher, teilbar wie das Ticket.

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
