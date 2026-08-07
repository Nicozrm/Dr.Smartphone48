/*
  Der öffentliche Prüfbeleg – ein Schnappschuss, keine Behauptung.

  Sechs Skripte prüfen bei diesem Projekt, ob eine Zusage der Website noch
  stimmt (siehe CLAUDE.md, Abschnitt „Befehle"). Bisher sah das nur, wer
  `npm run verify:*` selbst ausführte. Dieses Skript macht daraus eine Seite:
  Es führt alle sechs Prüfungen aus, genau mit dem Befehl aus package.json,
  und schreibt Ergebnis und vollständige Ausgabe nach
  `lib/data/verify-report.json`. `/beleg` zeigt diese Datei an.

  Wichtig: Dieses Skript führt die Prüfungen aus, es wiederholt ihre Logik
  nicht. Was auf `/beleg` steht, ist wortgleich das, was `npm run verify:qr`
  auf der Kommandozeile ausgibt – keine zweite, eigene Zusammenfassung, die
  von der echten Prüfung abweichen könnte.

  Der Schnappschuss ist eingecheckt, keine Laufzeit-Berechnung: Diese Website
  ist vollständig statisch vorgerendert, und `/beleg` soll das bleiben. Wer
  an einer der geprüften Dateien etwas ändert, führt `npm run verify:report`
  erneut aus – derselbe Handgriff, den `SUPPORT_CHECKED` und `CO2_CHECKED`
  ohnehin schon verlangen.

  Aufruf: npm run verify:report
*/
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const checks = [
  {
    id: "qr",
    npmScript: "verify:qr",
    title: "QR-Encoder",
    description:
      "Der QR-Encoder für den Vorgangscode auf dem Reparatur-Ticket gegen ISO/IEC 18004. Ein Fehler hier ergibt einen Ausdruck, den kein Telefon liest.",
  },
  {
    id: "procedure",
    npmScript: "verify:procedure",
    title: "Werkstattablauf",
    description:
      "Die Summe der Arbeitsschritte je Reparaturart gegen die zugesagte Dauer im Sofortpreis-Rechner. Auf /reparatur steht ausdrücklich, dass beides übereinstimmt.",
  },
  {
    id: "inspection",
    npmScript: "verify:inspection",
    title: "Prüfprotokoll",
    description:
      "Die Anzahl der Positionen im Prüfprotokoll gegen die zugesagten 40 Punkte, plus jedes Refurbished-Gerät im Bestand gegen seinen eigenen Zustandsgrad.",
  },
  {
    id: "support",
    npmScript: "verify:support",
    title: "Update-Horizont",
    description:
      "Jedes Modell im Katalog gegen seinen Update-Horizont: Beleg vorhanden, Daten in plausibler Reihenfolge, Prüfdatum nicht zu alt.",
  },
  {
    id: "status",
    npmScript: "verify:status",
    title: "Werkstattablauf ↔ Datenbank",
    description:
      "Der Werkstattablauf in TypeScript gegen das Postgres-Enum der Vorgangsverwaltung: gleiche Zustände, gleiche Reihenfolge, keine Policy für anonyme Zugriffe.",
  },
  {
    id: "co2",
    npmScript: "verify:co2",
    title: "Herstellungs-Fußabdruck",
    description:
      "Jeder CO₂-Wert im Katalog gegen ein Modell, keine Duplikate, jede Zahl in plausibler Spanne mit Beleg aus dem jeweiligen Hersteller-Umweltbericht.",
  },
];

const results = checks.map((check) => {
  const started = Date.now();
  let output = "";
  let ok = true;
  try {
    output = execFileSync(
      "node",
      ["--experimental-strip-types", "--no-warnings", `scripts/verify-${check.id}.mjs`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    ok = false;
    // Bei einem Fehlschlag stehen stdout und stderr im Exception-Objekt,
    // nicht in einem geworfenen String – beides zusammen ist die Ausgabe,
    // die auch am Terminal erschiene.
    output = [error.stdout, error.stderr].filter(Boolean).join("\n");
  }
  return {
    ...check,
    ok,
    durationMs: Date.now() - started,
    output: output.trim(),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  ok: results.every((r) => r.ok),
  checks: results,
};

const outPath = join(root, "lib", "data", "verify-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

for (const r of results) {
  console.log(`${r.ok ? "ok    " : "FEHLER"} ${r.npmScript}`);
}
console.log(
  `\n${report.ok ? "Alle sechs Prüfungen bestanden." : "Mindestens eine Prüfung ist fehlgeschlagen."} Geschrieben nach lib/data/verify-report.json.`,
);
process.exit(report.ok ? 0 : 1);
