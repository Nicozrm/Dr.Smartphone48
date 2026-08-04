/*
  Prüft, dass das Prüfprotokoll hält, was die Seite verspricht.

  Auf /refurbished und in den Metadaten steht „40-Punkte-Protokoll“. Die Zahl
  kommt aus `site.checkpoints`, die Positionen aus `lib/data/inspection.ts` –
  zwei Orte, die auseinanderlaufen können, ohne dass es jemandem auffällt.
  Genau dann wird aus der Zusage eine Behauptung.

  Zusätzlich prüft das Skript den Bestand: Jedes Gerät muss zu seinem
  Zustandsgrad passen (Mindestkapazität), Zyklen und Prüfdatum müssen
  plausibel sein, und ein Befund darf nicht fehlen, wo der Grad einen
  verlangt.

  Aufruf: npm run verify:inspection
*/
import { inspectionGroups, checkpointCount } from "../lib/data/inspection.ts";
import { grades, refurbishedDevices, protocolNumber } from "../lib/data/refurbished.ts";
import { site } from "../lib/site.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};

console.log("Prüfprotokoll – Positionen gegen site.checkpoints\n");

for (const group of inspectionGroups) {
  console.log(`  ${String(group.points.length).padStart(2)} ${group.title}`);
  for (const point of group.points) {
    if (!point.criterion || point.criterion.length < 25) {
      fail(`${group.title} › ${point.title}: Kriterium fehlt oder ist zu knapp`);
    }
  }
}

console.log(`\n  Summe: ${checkpointCount}, zugesagt: ${site.checkpoints}`);
if (checkpointCount !== site.checkpoints) {
  fail(
    `Das Protokoll hat ${checkpointCount} Positionen, die Seite verspricht ${site.checkpoints}.`,
  );
}

// Doppelte Positionsnamen wären im Ausdruck nicht auseinanderzuhalten.
const titles = inspectionGroups.flatMap((g) => g.points.map((p) => p.title));
const doppelt = titles.filter((t, i) => titles.indexOf(t) !== i);
if (doppelt.length > 0) fail(`Doppelte Positionen: ${[...new Set(doppelt)].join(", ")}`);

console.log("\nBestand – Gerätedaten gegen den eigenen Zustandsgrad\n");

const nummern = new Set();
for (const device of refurbishedDevices) {
  const grade = grades.find((g) => g.id === device.grade);
  const label = `${device.brand} ${device.name}`.padEnd(24);

  if (!grade) {
    fail(`${label} unbekannter Zustandsgrad „${device.grade}“`);
    continue;
  }

  const probleme = [];
  if (device.battery < grade.minBattery) {
    probleme.push(`Akku ${device.battery} % unter ${grade.minBattery} % für „${grade.label}“`);
  }
  if (device.price >= device.originalPrice) probleme.push("Preis nicht unter Neupreis");
  if (!Number.isInteger(device.cycles) || device.cycles < 0) probleme.push("Zyklen unplausibel");
  if (Number.isNaN(Date.parse(device.checkedOn))) probleme.push("Prüfdatum unlesbar");

  // Ein frisch ersetzter Akku mit hoher Zyklenzahl widerspricht sich.
  const akkuNeu = device.replaced.some((part) => part.toLowerCase().startsWith("akku"));
  if (akkuNeu && device.cycles > 60) {
    probleme.push(`Akku ersetzt, aber ${device.cycles} Zyklen`);
  }
  if (!akkuNeu && device.battery >= 96) {
    probleme.push(`${device.battery} % ohne Akkutausch – bitte belegen`);
  }

  // „Gut“ und „Sehr gut“ heißen laut Seite: sichtbare bzw. minimale Spuren.
  // Wer das behauptet, muss sie benennen können.
  if (device.grade !== "premium" && !device.note) {
    probleme.push(`Zustand „${grade.label}“ ohne Befund der Sichtprüfung`);
  }
  if (device.grade === "premium" && device.note) {
    probleme.push(`Zustand „${grade.label}“ mit Befund – dann ist es kein Premium`);
  }

  const nummer = protocolNumber(device);
  if (nummern.has(nummer)) probleme.push(`Prüfnummer ${nummer} doppelt vergeben`);
  nummern.add(nummer);

  if (probleme.length > 0) {
    fail(`${label} ${probleme.join("; ")}`);
  } else {
    console.log(
      `  ok     ${label} ${grade.label.padEnd(9)} ${String(device.battery).padStart(3)} % / ${String(device.cycles).padStart(3)} Zyklen  ${nummer}`,
    );
  }
}

console.log(
  failures === 0
    ? `\n${checkpointCount} Positionen, ${refurbishedDevices.length} Geräte – alles stimmig.`
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
