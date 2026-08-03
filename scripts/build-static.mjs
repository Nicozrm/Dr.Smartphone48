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
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const parkDir = join(root, ".static-build-park");

/** Was im Export nicht mitgebaut werden darf – Pfad relativ zum Projekt. */
const excluded = [
  { label: "app/api", from: join(root, "app", "api"), to: join(parkDir, "api") },
  {
    label: "app/status/[ticketCode]",
    from: join(root, "app", "status", "[ticketCode]"),
    to: join(parkDir, "status-ticketCode"),
  },
];

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
