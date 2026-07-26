/**
 * Statischer Export (Cloudflare Pages, GitHub Pages).
 *
 * Warum dieses Skript nötig ist: `output: "export"` verträgt keine Route
 * Handler mit POST – der Kontakt-Endpunkt unter app/api/kontakt bricht den
 * Build ab. Für den statischen Modus wird er deshalb vor dem Build beiseite
 * gelegt und danach zurückgestellt.
 *
 * Die Wiederherstellung läuft in finally und zusätzlich über Signal-Handler,
 * damit der Quellbaum auch bei Fehler oder Abbruch nicht verändert
 * zurückbleibt. Ohne Serverfunktion weicht das Formular zur Laufzeit
 * ohnehin auf einen E-Mail-Entwurf aus (NEXT_PUBLIC_STATIC_EXPORT).
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apiDir = join(root, "app", "api");
const parkDir = join(root, ".static-build-park");
const parked = join(parkDir, "api");

let didPark = false;

function restore() {
  if (!didPark) return;
  if (existsSync(parked)) {
    rmSync(apiDir, { recursive: true, force: true });
    renameSync(parked, apiDir);
  }
  rmSync(parkDir, { recursive: true, force: true });
  didPark = false;
  console.log("[build-static] app/api wiederhergestellt.");
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restore();
    process.exit(1);
  });
}

try {
  if (existsSync(apiDir)) {
    mkdirSync(parkDir, { recursive: true });
    renameSync(apiDir, parked);
    didPark = true;
    console.log("[build-static] app/api ausgeklammert (kein Server im Export).");
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
