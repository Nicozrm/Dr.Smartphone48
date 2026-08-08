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
import {
  BATTERY_CAPACITY,
  BATTERY_CYCLES,
  ECODESIGN_SOURCE,
  ECODESIGN_START,
  PARTS_YEARS,
  SECURITY_YEARS,
  applies,
  ecodesignDuties,
  generalRights,
  monthsToCycles,
} from "../lib/data/repairlaw.ts";

let failures = 0;
const ok = (text) => console.log(`  ok     ${text}`);
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

/* ---- Recht auf Reparatur ------------------------------------------------
   Auf /ersatzteile stehen Rechtsansprüche. Eine falsche Jahreszahl ist dort
   nicht bloß ein Anzeigefehler – ein Kunde beruft sich darauf. */

console.log("\nRecht auf Reparatur – die Verordnung gegen den Katalog\n");
{
  const before = failures;
  const stichtag = Date.parse(`${ECODESIGN_START}T00:00:00Z`);

  if (Number.isNaN(stichtag)) fail(`ECODESIGN_START „${ECODESIGN_START}" ist kein Datum.`);
  if (!/^https:\/\/eur-lex\.europa\.eu\//.test(ECODESIGN_SOURCE.url)) {
    fail("Die Fundstelle zeigt nicht auf EUR-Lex – eine Rechtsangabe braucht die amtliche Quelle.");
  }

  // Die Stichtagslogik in beide Richtungen, direkt an der Grenze.
  const faelle = [
    ["2025-06", false],
    ["2025-05-31", false],
    ["2025-06-19", false],
    ["2025-06-20", true],
    ["2025-07", true],
    ["2026-01", true],
  ];
  for (const [datum, erwartet] of faelle) {
    const ergebnis = applies(datum).covered;
    if (ergebnis !== erwartet) {
      fail(`${datum} wird als ${ergebnis ? "erfasst" : "nicht erfasst"} gewertet, richtig wäre ${erwartet ? "erfasst" : "nicht erfasst"}.`);
    }
  }
  if (failures === before) ok("der Stichtag trennt auf den Tag genau, auch bei Monatsangaben");

  // Die Untergrenzen dürfen nie vor dem Erscheinen liegen und müssen den
  // Fristen der Verordnung entsprechen.
  const beispiel = applies("2025-09");
  if (beispiel.partsFloor !== 2025 + PARTS_YEARS || beispiel.securityFloor !== 2025 + SECURITY_YEARS) {
    fail(`Untergrenzen für 2025 sind ${beispiel.partsFloor}/${beispiel.securityFloor}, erwartet ${2025 + PARTS_YEARS}/${2025 + SECURITY_YEARS}.`);
  } else if (beispiel.partsFloor <= beispiel.securityFloor) {
    fail("Die Ersatzteilfrist ist nicht länger als die Updatefrist – in der Verordnung ist sie es.");
  } else {
    ok(`ab Erscheinen 2025: Teile bis mindestens ${beispiel.partsFloor}, Updates bis mindestens ${beispiel.securityFloor}`);
  }

  // Nicht erfasste Geräte dürfen keine Jahreszahl mitbringen, sonst zeigt die
  // Seite eine Zusage an, die es nicht gibt.
  const alt = applies("2023-09");
  if (alt.covered || alt.partsFloor !== undefined || alt.securityFloor !== undefined) {
    fail("Ein nicht erfasstes Gerät bekommt trotzdem Fristen zugeordnet.");
  } else {
    ok("nicht erfasste Geräte bekommen keine Jahreszahlen");
  }

  // Und die Wirklichkeit: Wie viel des eigenen Katalogs ist überhaupt erfasst?
  const katalog = brands.flatMap((b) => b.models);
  const erfasst = katalog.filter((m) => {
    const eintrag = supportEntries.find((e) => e.model === m.id);
    return applies(eintrag?.released ?? `${m.year}-01`).covered;
  });
  console.log(
    `        ${erfasst.length} von ${katalog.length} Modellen im Katalog sind erfasst.`,
  );
  if (erfasst.length === katalog.length) {
    fail("Alle Modelle gelten als erfasst – das ist bei einem Stichtag 2025 unglaubhaft.");
  } else {
    ok("die Mehrheit des Katalogs ist nicht erfasst, und die Seite sagt das");
  }

  // Zyklenrechnung: 800 Zyklen bei einem je Tag sind gut zwei Jahre.
  const monate = monthsToCycles(1);
  if (Math.abs(monate - (BATTERY_CYCLES / 365) * 12) > 1e-9) {
    fail("Die Zyklenrechnung stimmt nicht mit ihrer eigenen Formel überein.");
  } else if (monate < 24 || monate > 30) {
    fail(`${BATTERY_CYCLES} Zyklen bei einem je Tag ergeben ${monate.toFixed(1)} Monate – erwartet gut zwei Jahre.`);
  } else {
    ok(`${BATTERY_CYCLES} Zyklen bei einem je Tag: ${(monate / 12).toFixed(1)} Jahre`);
  }
  if (!Number.isFinite(monthsToCycles(0))) {
    ok("kein Laden ergibt unendlich statt einer Division durch null");
  } else {
    fail("Ladeverhalten 0 liefert eine endliche Zahl.");
  }
  if (BATTERY_CAPACITY <= 0 || BATTERY_CAPACITY >= 1) {
    fail(`Die Restkapazität ${BATTERY_CAPACITY} ist kein Anteil zwischen 0 und 1.`);
  }

  // Jede Pflicht braucht einen Satz, der für sich steht – und kein Markdown,
  // das wörtlich auf der Seite landete.
  for (const duty of [...ecodesignDuties, ...generalRights]) {
    if (!duty.detail || duty.detail.length < 60) {
      fail(`„${duty.title}": ohne Erklärung ist die Pflicht eine Behauptung.`);
    }
    if (/\*\*|__/.test(duty.detail + duty.title)) {
      fail(`„${duty.title}": Markdown im Text – er wird wörtlich gerendert.`);
    }
  }
  // Die allgemeinen Rechte müssen ihre Fundstelle nennen; sie sind das, was
  // bei nicht erfassten Geräten übrig bleibt.
  for (const right of generalRights) {
    if (!/§/.test(right.detail)) {
      fail(`„${right.title}": ohne Paragrafen kann das niemand nachschlagen.`);
    }
  }
  if (failures === before) {
    ok(`${ecodesignDuties.length} Pflichten und ${generalRights.length} allgemeine Rechte, alle belegt`);
  }
}

console.log(
  failures === 0
    ? `\n${supportEntries.length} Modelle, alle Angaben belegt und schlüssig.`
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
