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

## Was diese Seite kann, was andere nicht können

Alles davon läuft im Browser des Besuchers – ohne Konto, ohne Datenbank, ohne
zusätzliche Abhängigkeit im Bundle.

**Sofortpreis-Rechner** (`/reparatur`) – Marke → Modell → Schaden in drei
Klicks. Jede Auswahl hebt das betroffene Bauteil in einer schematischen
Explosionszeichnung hervor; Festpreis und Dauer aktualisieren sich live.

**Notfall-Soforthilfe** (`/notfall`) – vier Protokolle für Wasserschaden,
gebrochenes Display, totes Gerät und aufgeblähten Akku. Jeweils zuerst das,
was man lassen soll, denn der teuerste Fehler passiert in der ersten Minute.
Funktioniert ohne JavaScript und ohne Netz; die Rettungsuhr zählt die Zeit
seit dem Wasserkontakt, ohne einen Countdown zu erfinden.

**Geräte-Check** (`/check`) – Display, Touch, Sensoren, Mikrofon,
Lautsprecher, Akku und Netz, geprüft direkt im Browser. Nichts verlässt das
Gerät.

**Reparatur-Ticket** (`/ticket`) – der Kostenvoranschlag als Dokument:
Vorgangsnummer aus der Auswahl abgeleitet, QR-Code zum Vorzeigen, IMEI-Feld
mit sofortiger Luhn-Prüfung, Schadenskarte nach dem Vorbild der
Fahrzeugübergabe und ein A4-Übergabeprotokoll zum Ausdrucken. Der QR-Code
kommt aus einem eigenen Encoder nach ISO/IEC 18004 (`lib/qr.ts`), geprüft
über `npm run verify:qr`.

**Ankauf-Rechner** (`/ankauf`) – eine Wertschätzung mit offengelegter
Rechnung statt einer Zahl aus der Blackbox: jeder Posten mit Betrag und
Begründung, inklusive des Hinweises, dass privat verkaufen mehr bringt.

**Akku-Coach** (`/zwilling`) – rechnet das eigene Ladeverhalten drei Jahre
voraus, gegen ein typisches Profil, und nennt die eine Änderung, die am
meisten bringt.

**Display-Vergleich** (`/ersatzteile`) – die Eingabeverzögerung eines
billigen Nachbaus wird nicht dargestellt, sondern erzeugt. Wer den Punkt
zieht, spürt den Unterschied zwischen 0 und 35 Millisekunden sofort.

## Vorgangsverfolgung (optional)

Der einzige Teil mit Datenbank – und abschaltbar. Ohne hinterlegtes
Supabase-Projekt läuft alles oben genau wie beschrieben; die folgenden zwei
Dinge erscheinen dann gar nicht erst. Einrichtung: [`supabase/README.md`](./supabase/README.md).

**Vorgang anmelden** – am Ende des Reparatur-Tickets, freiwillig und deutlich
vom Übergabeprotokoll getrennt. Was übertragen wird, steht als Liste an der
Schaltfläche; vom Protokoll darüber geht nichts mit. Zurück kommt eine
Vorgangsnummer und ein QR-Code.

**Status verfolgen** (`/status/<nummer>`) – acht Schritte von „Angemeldet“ bis
„Abgeschlossen“, mit den Zeitpunkten, die wirklich stattgefunden haben. Die
Seite aktualisiert sich von selbst, sobald die Werkstatt etwas ändert: kein
Neuladen, kein Polling, ein Rundruf aus der Datenbank mit vier Feldern. Die
Nummer ist ein Schlüssel, kein Ausweis – deshalb stehen dort weder Name noch
Telefonnummer oder IMEI.

**Werkstatt-Dashboard** (`/intern/werkstatt`) – Suche, Filter, Statuswechsel,
interne Vermerke und Kennzahlen, live für alle Arbeitsplätze. Nicht verlinkt,
`noindex`, Zugang nur mit Konto **und** Freischaltung in der Datenbank.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Produktions-Build
npm run start      # Produktionsserver
npm run lint       # ESLint
npm run verify:qr  # QR-Encoder gegen ISO/IEC 18004 prüfen
npm run verify:status  # Werkstattablauf gegen das Datenbankschema
```

Für die Vorgangsverfolgung `.env.example` nach `.env.local` kopieren und die
drei Supabase-Variablen eintragen. Ohne sie startet alles Übrige unverändert.

PWA-Icons neu generieren (nutzt headless Chromium):

```bash
node scripts/generate-icons.mjs
```

## Struktur

```
app/                     Routen, Layout, Sitemap/Robots/Manifest
components/ui/           Primitives: Button, Icon, Reveal, SectionHeading, QrCode
components/layout/       Header, Footer, Logo
components/sections/     Seiten-Sektionen (FAQ, Refurbished, Kontaktformular …)
components/experience/   Bootloader, Command-Palette, Shader-Feld, Röntgenblick
components/configurator/ Sofortpreis-Rechner + SVG-Gerätediagramm
components/check/        Geräte-Check
components/ticket/       Reparatur-Ticket + Schadenskarte + Anmeldung
components/status/       Statusseite (Zeitleiste, Rundruf)
components/workshop/     Werkstatt-Dashboard
components/battery/      Akku-Coach   components/resale/  Ankauf-Rechner
components/twin/         Digitaler Zwilling   components/parts/  Display-Vergleich
lib/                     site.ts (Stammdaten), format.ts, qr.ts, imei.ts,
                         ticket.ts, resale.ts, battery.ts
lib/data/                Geräte/Preise/Ankaufswerte, Refurbished, FAQ,
                         Rezensionen, Notfall-Protokolle
lib/tickets/             Zustände, Vorgangscode, Redaktion, Datenzugriff
lib/supabase/            Clients (Server, Sitzung, Browser) + Schema als Typ
lib/notify/              Zustellwege als Adapter (E-Mail, WhatsApp, SMS, Push)
supabase/migrations/     Schema, RLS, Realtime
public/                  Service Worker, PWA-Icons
scripts/                 Statischer Export, Icon-Rendering, Prüfskripte
```

Hinweis: Alle Firmendaten (Adresse, Telefonnummer, Reparatur- und
Ankaufspreise, Impressum) sind Platzhalter und vor dem Livegang zu ersetzen.
