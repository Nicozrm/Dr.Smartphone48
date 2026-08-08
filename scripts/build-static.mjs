/**
 * Statischer Export (Cloudflare Pages, GitHub Pages).
 *
 * Warum dieses Skript nötig ist: `output: "export"` verträgt zwei Dinge nicht,
 * die dieses Projekt auf Zielen mit Server hat. Beide werden vor dem Build
 * beiseitegelegt und danach zurückgestellt:
 *
 * – **app/api** – Route Handler mit POST brechen den Build ab. Ohne
 *   Serverfunktion weicht das Kontaktformular zur Laufzeit ohnehin auf einen
 *   E-Mail-Entwurf aus (NEXT_PUBLIC_STATIC_EXPORT).
 * – **app/status/[ticketCode]** – ein dynamisches Segment braucht im Export
 *   eine vollständige Liste seiner Werte. Vorgänge entstehen aber erst nach
 *   dem Build, und eine leere Liste lehnt Next.js ausdrücklich ab. Ohne
 *   Server gäbe es dort nichts abzufragen; `/status` erklärt das an Ort und
 *   Stelle.
 *
 * Die Wiederherstellung läuft in finally und zusätzlich über Signal-Handler,
 * damit der Quellbaum auch bei Fehler oder Abbruch nicht verändert
 * zurückbleibt.
 *
 * ## PUBLIC_ONLY: der interne Bereich bleibt draußen
 *
 * `PUBLIC_ONLY=true` legt zusätzlich **app/intern** beiseite. Damit enthält
 * der öffentliche Export kein Rechnungswerkzeug, keinen Zertifikatsaussteller
 * und kein Werkstatt-Dashboard – weder als Seite noch als JavaScript.
 *
 * Der Grund ist keine Geheimhaltung: Die Vorgänge schützt die Datenbank, das
 * Rechnungsarchiv liegt im Browser des Betriebs. Es geht um Angriffsfläche
 * und Ladelast, die kein Besucher braucht.
 *
 * **Der Schalter steht bewusst standardmäßig aus.** Rechnung und Zertifikat
 * laufen vollständig im Browser und funktionieren auf GitHub Pages heute
 * tatsächlich. Wer sie aus dem öffentlichen Export nimmt, bevor der Betrieb
 * einen eigenen Zugang hat, nimmt ihm ein Werkzeug weg, das er benutzt.
 *
 * Die Reihenfolge lautet deshalb:
 *
 *   1. Internen Zugang aufsetzen: `npm run cf:build && npm run cf:deploy`
 *      (voller Server, damit auch `/api/werkstatt` läuft) und davor eine
 *      Zugangsbeschränkung setzen – Cloudflare Access oder ein Passwort.
 *   2. Erst dann in `.github/workflows/nextjs.yml` beim Build-Schritt
 *      `PUBLIC_ONLY: "true"` ergänzen.
 *
 * Warum kein eigenes Repository für den internen Teil: Er teilt sich mit der
 * öffentlichen Seite den Gerätekatalog (die Rechnung zieht ihre Preise aus
 * `lib/data/devices.ts`, damit sie nicht vom Sofortpreis-Rechner abweicht),
 * den QR-Encoder, den Zertifikatscode und die Design-Tokens. Zwei
 * Repositories hießen zwei Fassungen davon – und Drift ist in diesem Projekt
 * der Fehler, gegen den die halbe Prüfmaschinerie gebaut ist. Eine
 * Codebasis, zwei Builds.
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const parkDir = join(root, ".static-build-park");

/** Nur den öffentlichen Teil bauen – siehe Kopfkommentar. */
const publicOnly = process.env.PUBLIC_ONLY === "true";

/** Was im Export nicht mitgebaut werden darf – Pfad relativ zum Projekt. */
const excluded = [
  { label: "app/api", from: join(root, "app", "api"), to: join(parkDir, "api") },
  {
    label: "app/status/[ticketCode]",
    from: join(root, "app", "status", "[ticketCode]"),
    to: join(parkDir, "status-ticketCode"),
  },
  ...(publicOnly
    ? [{ label: "app/intern", from: join(root, "app", "intern"), to: join(parkDir, "intern") }]
    : []),
];

if (publicOnly) {
  console.log("[build-static] PUBLIC_ONLY: der interne Bereich bleibt draußen.");
}

/** Was tatsächlich beiseitegelegt wurde – nur das wird zurückgestellt. */
const parked = [];

function restore() {
  if (parked.length === 0) return;
  // Rückwärts, damit verschachtelte Pfade in umgekehrter Reihenfolge
  // zurückkommen – heute gibt es keine, morgen vielleicht.
  for (const entry of [...parked].reverse()) {
    if (existsSync(entry.to)) {
      rmSync(entry.from, { recursive: true, force: true });
      renameSync(entry.to, entry.from);
      console.log(`[build-static] ${entry.label} wiederhergestellt.`);
    }
  }
  parked.length = 0;
  rmSync(parkDir, { recursive: true, force: true });
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restore();
    process.exit(1);
  });
}

try {
  for (const entry of excluded) {
    if (!existsSync(entry.from)) continue;
    mkdirSync(parkDir, { recursive: true });
    renameSync(entry.from, entry.to);
    parked.push(entry);
    console.log(`[build-static] ${entry.label} ausgeklammert (kein Server im Export).`);
  }

  // node_modules/.bin explizit voranstellen: npm setzt das automatisch, ein
  // direkter `node scripts/build-static.mjs` (etwa in CI) aber nicht.
  const binDir = join(root, "node_modules", ".bin");
  execSync("next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      STATIC_EXPORT: "true",
      PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`,
    },
  });
  console.log("[build-static] Export liegt in ./out");
} catch (error) {
  console.error("[build-static] Build fehlgeschlagen.");
  process.exitCode = 1;
  if (error instanceof Error && error.message) console.error(error.message);
} finally {
  restore();
}
