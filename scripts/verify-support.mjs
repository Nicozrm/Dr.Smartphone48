/*
  Prüft den Update-Horizont gegen den Gerätekatalog.

  Die Tabelle in `lib/data/support.ts` ist die heikelste Stelle der Website:
  Sie nennt Datumsangaben, die Kunden für Kaufentscheidungen benutzen, und
  sie veraltet von selbst. Vier Fehlerarten kann ein Skript ausschließen,
  bevor sie jemandem schaden:

  1. Ein Modell im Katalog, für das kein Zeitraum hinterlegt ist – der
     Sofortpreis-Rechner ließe die Angabe dann stillschweigend weg.
  2. Ein Eintrag ohne Gegenstück im Katalog – Karteileiche.
  3. Reihenfolge verdreht: Sicherheitsupdates enden nie vor den
     Betriebssystem-Versionen, und beides nie vor Markteinführung.
  4. Markteinführung, die dem Baujahr im Katalog widerspricht.

  Dazu die Warnung, wenn der Stand der Angaben zu alt wird. Hersteller
  ändern ihre Zusagen; eine Tabelle, die seit zwei Jahren niemand angefasst
  hat, ist gefährlicher als gar keine.

  Aufruf: npm run verify:support
*/
import { brands } from "../lib/data/devices.ts";
import {
  SUPPORT_CHECKED,
  supportEntries,
  supportFor,
  monthsUntil,
} from "../lib/data/support.ts";
import { refurbishedDevices } from "../lib/data/refurbished.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};

/** Monate zwischen zwei Monatsangaben (YYYY-MM). */
function abstand(von, bis) {
  const [vj, vm] = von.split("-").map(Number);
  const [bj, bm] = bis.split("-").map(Number);
  return (bj - vj) * 12 + (bm - vm);
}

const katalog = brands.flatMap((brand) =>
  brand.models.map((model) => ({ brand, model })),
);

console.log("Update-Horizont – Einträge gegen den Gerätekatalog\n");

// 1. Jedes Modell im Katalog braucht einen Eintrag.
for (const { brand, model } of katalog) {
  const entry = supportFor(model.id);
  if (!entry) {
    fail(`${brand.name} ${model.name}: kein Update-Horizont hinterlegt`);
    continue;
  }

  const probleme = [];

  // 3. Reihenfolge.
  if (abstand(entry.released, entry.osUntil) <= 0) {
    probleme.push("OS-Ende liegt nicht nach der Markteinführung");
  }
  if (abstand(entry.osUntil, entry.securityUntil) < 0) {
    probleme.push("Sicherheitsupdates enden vor den OS-Updates");
  }

  // 4. Markteinführung gegen das Baujahr im Katalog. Ein Jahr Toleranz nach
  //    oben, weil ein im Herbst vorgestelltes Gerät als Modelljahr oft
  //    schon das folgende trägt.
  const jahr = Number(entry.released.split("-")[0]);
  if (jahr < model.year || jahr > model.year + 1) {
    probleme.push(`Markteinführung ${jahr} passt nicht zum Baujahr ${model.year}`);
  }

  // Ein Beleg ist Pflicht – ohne ihn ist die Zahl eine Behauptung.
  if (!entry.basis || entry.basis.length < 40) {
    probleme.push("Beleg fehlt oder ist zu knapp");
  }
  if (entry.source !== "hersteller" && entry.source !== "schaetzung") {
    probleme.push(`unbekannte Quellenart „${entry.source}“`);
  }

  if (probleme.length > 0) {
    fail(`${brand.name} ${model.name}: ${probleme.join("; ")}`);
  } else {
    const rest = monthsUntil(entry.securityUntil);
    console.log(
      `  ok     ${`${brand.name} ${model.name}`.padEnd(24)} bis ${entry.securityUntil}  ${String(rest).padStart(3)} Mon  ${entry.source}`,
    );
  }
}

// 2. Keine Karteileichen.
const bekannt = new Set(katalog.map(({ model }) => model.id));
const verwaist = supportEntries.filter((e) => !bekannt.has(e.model));
if (verwaist.length > 0) {
  fail(`Einträge ohne Modell im Katalog: ${verwaist.map((e) => e.model).join(", ")}`);
}

// Der Bestand hängt über `model` an beiden Tabellen.
console.log("");
for (const device of refurbishedDevices) {
  const imKatalog = bekannt.has(device.model);
  const imHorizont = Boolean(supportFor(device.model));
  if (!imKatalog || !imHorizont) {
    fail(
      `Bestand ${device.id}: model „${device.model}“ ${
        imKatalog ? "" : "nicht im Gerätekatalog"
      }${!imKatalog && !imHorizont ? " und " : ""}${imHorizont ? "" : "nicht im Update-Horizont"}`,
    );
  }
}
if (failures === 0) {
  console.log(`  ok     ${refurbishedDevices.length} Geräte im Bestand sind beiden Tabellen zugeordnet`);
}

// Stand der Angaben.
const alter = -monthsUntil(SUPPORT_CHECKED.slice(0, 7));
console.log(`\n  Stand der Angaben: ${SUPPORT_CHECKED} (vor ${alter} Monaten geprüft)`);
if (alter > 12) {
  fail("Die Angaben sind über ein Jahr alt – gegen die Herstellerseiten prüfen.");
} else if (alter > 6) {
  console.log("  HINWEIS Älter als ein halbes Jahr – bei Gelegenheit nachziehen.");
}

console.log(
  failures === 0
    ? `\n${supportEntries.length} Modelle, alle Angaben belegt und schlüssig.`
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
