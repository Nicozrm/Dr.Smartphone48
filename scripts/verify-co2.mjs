/*
  Prüft den Herstellungs-Fußabdruck gegen den Gerätekatalog.

  `lib/data/co2.ts` speist die reale Hälfte der CO₂-Rechnung in
  `components/twin/RepairOrReplace.tsx` – Zahlen aus den Umweltberichten von
  Apple, Google und Samsung, keine Schätzungen. Drei Fehlerarten kann ein
  Skript ausschließen, bevor sie auf der Seite landen:

  1. Ein Eintrag ohne Gegenstück im Katalog – Karteileiche, die nie erscheint.
  2. Ein Modell doppelt eingetragen – dann gewinnt in `co2For()` zufällig
     der letzte, und niemand merkt, dass der erste tot ist.
  3. Eine Zahl außerhalb dessen, was ein Smartphone-Fußabdruck plausibel sein
     kann. Kein Ersatz für das Nachlesen im Bericht, aber ein Netz gegen den
     Tippfehler, der aus 66 kg 660 kg macht.

  Dazu die Warnung, wenn der Prüfstand veraltet: Hersteller überarbeiten ihre
  Fußabdruck-Modelle rückwirkend (siehe der Kommentar beim iPhone 12 in
  `co2.ts`) – eine Tabelle, die niemand mehr anfasst, wird irgendwann falsch,
  ohne dass sich am Code etwas ändert.

  Aufruf: npm run verify:co2
*/
import { brands } from "../lib/data/devices.ts";
import { CO2_CHECKED, co2Entries } from "../lib/data/co2.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};
const ok = (text) => console.log(`  ok     ${text}`);

const katalog = new Set(brands.flatMap((brand) => brand.models.map((m) => m.id)));

/* ---- 1. Jeder Eintrag hat ein Modell im Katalog ------------------------- */

for (const entry of co2Entries) {
  if (!katalog.has(entry.model)) {
    fail(`„${entry.model}“ steht in co2.ts, aber nicht im Gerätekatalog.`);
  }
}
if (failures === 0) ok(`alle ${co2Entries.length} Einträge haben ein Modell im Katalog`);

/* ---- 2. Keine Modelle doppelt ------------------------------------------- */

const seen = new Map();
for (const entry of co2Entries) {
  const before = seen.get(entry.model);
  if (before !== undefined) {
    fail(`„${entry.model}“ steht doppelt in co2.ts – ${before} kg und ${entry.kgCO2e} kg.`);
  }
  seen.set(entry.model, entry.kgCO2e);
}
if (seen.size === co2Entries.length) ok("kein Modell steht doppelt");

/* ---- 3. Plausibilität ---------------------------------------------------- */

// Der kleinste bekannte Wert (iPhone SE, 46 kg) und der größte in diesem
// Katalog (Pixel 8 Pro, 79 kg) liegen deutlich innerhalb dieser Spanne – sie
// ist bewusst weiter gefasst, damit künftige Modelle (Falt-Geräte, sehr
// kleine Einsteigermodelle) nicht grundlos anschlagen.
const PLAUSIBLE_MIN = 20;
const PLAUSIBLE_MAX = 150;

for (const entry of co2Entries) {
  if (entry.kgCO2e < PLAUSIBLE_MIN || entry.kgCO2e > PLAUSIBLE_MAX) {
    fail(
      `„${entry.model}“: ${entry.kgCO2e} kg CO₂e liegt außerhalb der plausiblen Spanne (${PLAUSIBLE_MIN}–${PLAUSIBLE_MAX} kg) – Zahl gegen den Beleg prüfen.`,
    );
  }
  if (!entry.basis || entry.basis.trim().length < 10) {
    fail(`„${entry.model}“ hat keinen brauchbaren Beleg (basis).`);
  }
}
if (failures === 0) ok(`alle Werte liegen zwischen ${PLAUSIBLE_MIN} und ${PLAUSIBLE_MAX} kg CO₂e, jeder mit Beleg`);

/* ---- 4. Stand der Prüfung ------------------------------------------------ */

function monthsSince(iso) {
  const [year, month] = iso.split("-").map(Number);
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

const alter = monthsSince(CO2_CHECKED);
console.log(`\n  Stand der Angaben: ${CO2_CHECKED} (vor ${alter} Monaten geprüft)`);
if (alter > 12) {
  fail("Die Angaben sind über ein Jahr alt – gegen die aktuellen Umweltberichte prüfen.");
} else if (alter > 6) {
  console.log("  HINWEIS Älter als ein halbes Jahr – bei Gelegenheit nachziehen.");
}

console.log(
  failures === 0
    ? `\n${co2Entries.length} Modelle mit Herstellungs-Fußabdruck, alle belegt und plausibel.`
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
