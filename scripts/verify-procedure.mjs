/*
  Prüft, dass die Werkstattabläufe auf die zugesagten Zeiten aufgehen.

  Auf /reparatur steht der Satz, dass die Einzelzeiten der Arbeitsschritte in
  der Summe genau die Dauer ergeben, die im Sofortpreis-Rechner steht. Das
  ist eine Zusage an den Besucher – und sie hält nur, solange jemand
  nachrechnet. Ändert jemand einen Schritt, ohne repairMeta.minutes
  mitzuziehen, wird aus der Zusage stillschweigend eine Behauptung.

  Genau dafür ist dieses Skript da. Aufruf:
    npm run verify:procedure
*/
import { procedures, procedureMinutes } from "../lib/data/procedure.ts";
import { repairMeta } from "../lib/data/devices.ts";

let failures = 0;

console.log("Werkstattabläufe – Summe gegen zugesagte Dauer\n");

for (const [kind, steps] of Object.entries(procedures)) {
  const meta = repairMeta[kind];
  if (!meta) {
    failures++;
    console.log(`  FEHLER ${kind}: keine Reparaturart mit diesem Schlüssel`);
    continue;
  }

  const sum = procedureMinutes(steps);
  const label = `${meta.label.padEnd(14)} ${String(sum).padStart(4)} min`;

  if (sum !== meta.minutes) {
    failures++;
    console.log(`  FEHLER ${label}  – zugesagt sind ${meta.minutes} min`);
    continue;
  }

  // Ein Ablauf ohne Schritte oder mit einer Null-Minuten-Position wäre
  // formal korrekt und trotzdem unbrauchbar.
  const empty = steps.filter((s) => s.minutes <= 0);
  if (steps.length < 3 || empty.length > 0) {
    failures++;
    console.log(`  FEHLER ${label}  – ${steps.length} Schritte, davon ${empty.length} ohne Dauer`);
    continue;
  }

  console.log(`  ok     ${label}  (${steps.length} Schritte)`);
}

// Jede angebotene Reparaturart sollte einen Ablauf haben – außer denen, die
// keinen festen Takt haben.
const ohneAblauf = Object.keys(repairMeta).filter(
  (kind) => !procedures[kind] && kind !== "water",
);
if (ohneAblauf.length > 0) {
  failures++;
  console.log(`\n  FEHLER Ohne Ablauf: ${ohneAblauf.join(", ")}`);
}

console.log(
  failures === 0
    ? "\nAlle Abläufe gehen exakt auf."
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
