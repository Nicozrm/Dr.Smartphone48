/*
  Prüft die Zusage der Datenschutzseite dort, wo sie steht: im Quelltext.

  Auf /datenschutz zeigt ein Abschnitt live, was ein Browser ungefragt
  preisgibt – Bildschirm, Zeitzone, Grafikchip, Schriften, eine
  Canvas-Signatur. Daneben steht der Satz, auf den es ankommt: Nichts davon
  wird gesendet, gespeichert oder gezählt.

  Genau dieser Satz ist die gefährlichste Zeile der ganzen Website. Er ist
  leicht geschrieben und wäre in dem Moment gebrochen, in dem jemand ein
  `fetch` in die Komponente setzt, „nur zum Zählen". Auffallen würde es
  niemandem – Fingerabdruckdaten sehen im Netzwerkfenster aus wie jede
  andere Anfrage, und wer die Seite liest, hat keinen Anlass nachzusehen.

  Deshalb prüft dieses Skript den Quelltext der beteiligten Dateien auf jeden
  Weg nach draußen und auf jeden dauerhaften Speicher. Was nur behauptet
  wird, ist nicht geprüft.

  Aufruf: npm run verify:privacy
*/
import fs from "node:fs";
import { FONT_PROBE_COUNT, combine, shortHash, signals } from "../lib/privacy/signals.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};
const ok = (text) => console.log(`  ok    ${text}`);

/* ---- 1. Kein Weg nach draußen ------------------------------------------- */

/**
 * Die Dateien, die den Fingerabdruck lesen. Wer eine weitere anlegt, trägt
 * sie hier ein – sonst prüft dieses Skript eine Zusage, die woanders
 * gebrochen wird.
 */
const GUARDED = [
  "lib/privacy/signals.ts",
  "components/privacy/Fingerprint.tsx",
];

/**
 * Verbotene Aufrufe, jeweils mit dem Grund. Die Liste ist absichtlich breit:
 * Ein Bild mit Parametern in der Adresse ist ebenso ein Übertragungsweg wie
 * ein `fetch`, und `localStorage` macht aus einer Momentaufnahme eine
 * Wiedererkennung über Besuche hinweg – also genau das, was ein Tracker will.
 */
const FORBIDDEN = [
  [/\bfetch\s*\(/, "fetch – eine Anfrage nach draußen"],
  [/sendBeacon/, "navigator.sendBeacon – überträgt auch beim Schließen des Tabs"],
  [/XMLHttpRequest/, "XMLHttpRequest – der ältere Weg nach draußen"],
  [/new\s+WebSocket/, "WebSocket – eine offene Verbindung"],
  [/new\s+EventSource/, "EventSource – eine offene Verbindung"],
  [/localStorage|sessionStorage/, "Browserspeicher – macht aus der Momentaufnahme eine Wiedererkennung"],
  [/document\.cookie/, "Cookie – dasselbe in älter"],
  [/indexedDB/, "IndexedDB – dauerhafter Speicher"],
  [/navigator\.clipboard/, "Zwischenablage – gehört nicht zur Messung"],
  [/new\s+Image\s*\(/, "Bild-Objekt – der klassische Zählpixel"],
  [/import\s*\(/, "dynamischer Import – lädt Code, der die Prüfung umgeht"],
];

console.log("Datenschutz – kein Weg nach draußen im Quelltext\n");
for (const file of GUARDED) {
  if (!fs.existsSync(file)) {
    fail(`${file} fehlt – die Liste der geprüften Dateien ist veraltet.`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  // Kommentare zählen nicht: In ihnen stehen genau diese Wörter, weil dort
  // erklärt wird, warum es sie im Code nicht gibt.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  let clean = true;
  for (const [pattern, reason] of FORBIDDEN) {
    if (pattern.test(code)) {
      fail(`${file}: ${reason}`);
      clean = false;
    }
  }
  if (clean) ok(`${file} – nichts davon`);
}

/* ---- 2. Jede Angabe wird auch gezeigt ----------------------------------- */

console.log("\nJeder gelesene Wert steht auf der Seite\n");
{
  const view = fs.readFileSync("components/privacy/Fingerprint.tsx", "utf8");
  // Die Komponente rendert über signals.map – wer stattdessen einzelne
  // Werte herauspickt, könnte einen davon weglassen.
  if (!/signals\.map/.test(view)) {
    fail("Die Anzeige läuft nicht über signals.map – ein Wert könnte unsichtbar bleiben.");
  } else {
    ok("die Anzeige geht über signals.map, also über alle");
  }
  if (!/signal\.reason/.test(view)) {
    fail("Die Begründung je Angabe wird nicht angezeigt.");
  } else {
    ok("zu jeder Angabe steht ihre Begründung");
  }
}

/* ---- 3. Die Angaben selbst ---------------------------------------------- */

console.log("\nDie Liste der Angaben\n");
{
  const before = failures;
  const ids = new Set();
  for (const signal of signals) {
    if (ids.has(signal.id)) fail(`Kennung „${signal.id}" kommt doppelt vor.`);
    ids.add(signal.id);
    if (typeof signal.read !== "function") fail(`${signal.label}: kein Leseverfahren.`);
    if (!signal.reason || signal.reason.length < 60) {
      fail(`${signal.label}: ohne Begründung ist die Angabe nur Effekthascherei.`);
    }
    if (/\*\*|__/.test(signal.reason + signal.label)) {
      fail(`${signal.label}: Markdown im Text – er wird wörtlich gerendert.`);
    }
    /*
      Keine Angabe darf um Erlaubnis fragen. Das ist der Kern der Aussage:
      Ein Wert, für den der Browser einen Dialog zeigt, gehört nicht in
      diese Liste – er wäre der Gegenbeweis statt des Beweises.
    */
    const source = signal.read.toString();
    for (const [pattern, what] of [
      [/getUserMedia/, "Mikrofon oder Kamera"],
      [/geolocation/, "Standort"],
      [/requestPermission/, "eine Berechtigung"],
      [/Notification/, "Benachrichtigungen"],
      [/getBattery/, "den Akkustand"],
    ]) {
      if (pattern.test(source)) {
        fail(`${signal.label} greift auf ${what} zu – dafür fragt der Browser.`);
      }
    }
  }
  if (failures === before) {
    ok(`${signals.length} Angaben, alle begründet und ohne Nachfrage lesbar`);
  }
  if (FONT_PROBE_COUNT < 10) {
    fail(`Nur ${FONT_PROBE_COUNT} Schriften geprüft – zu wenig für eine Aussage.`);
  } else {
    ok(`${FONT_PROBE_COUNT} Schriften in der Erkennung`);
  }
}

/* ---- 4. Der zusammengesetzte Wert --------------------------------------- */

console.log("\nDer Wert selbst\n");
{
  const probe = ["1920 × 1080", "Europe/Berlin", "de-DE", "8 Kerne"];

  // Stabil: Derselbe Eingang muss denselben Wert ergeben. Auf dieser
  // Eigenschaft beruht die Aussage der Seite („neu laden, dasselbe steht da").
  if (combine(probe) !== combine([...probe])) {
    fail("Derselbe Eingang liefert verschiedene Werte – die Seite verspricht das Gegenteil.");
  } else {
    ok(`stabil: ${combine(probe)}`);
  }

  // Form: fünf plus fünf Zeichen, keine verwechselbaren Ziffern.
  if (!/^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(combine(probe))) {
    fail(`Der Wert hat die falsche Form: ${combine(probe)}`);
  } else {
    ok("Form stimmt, keine verwechselbaren Zeichen (I, O, 0, 1)");
  }

  // Empfindlich: Eine kleine Änderung muss durchschlagen, sonst wäre der
  // Hinweis „diesmal ein anderer Wert" wertlos.
  const geaendert = [...probe];
  geaendert[0] = "1920 × 1081";
  if (combine(geaendert) === combine(probe)) {
    fail("Ein geänderter Eingangswert ändert das Ergebnis nicht.");
  } else {
    ok("ein Pixel Unterschied ergibt einen anderen Wert");
  }

  // Und die Reihenfolge zählt – sonst kollidierten vertauschte Angaben.
  if (combine(["a", "b"]) === combine(["b", "a"])) {
    fail("Die Reihenfolge der Angaben wirkt sich nicht aus.");
  } else {
    ok("die Reihenfolge der Angaben wirkt sich aus");
  }

  // Verteilung: 4000 Eingaben sollten fast 4000 verschiedene Werte ergeben.
  const gesehen = new Set();
  for (let i = 0; i < 4000; i++) gesehen.add(shortHash(`probe-${i}`));
  if (gesehen.size < 3990) {
    fail(`4000 Eingaben ergaben nur ${gesehen.size} verschiedene Werte.`);
  } else {
    ok(`4000 Eingaben → ${gesehen.size} verschiedene Werte`);
  }
}

/* ---- 5. Die Seite darf keine Einzigartigkeit behaupten ------------------ */

console.log("\nKeine erfundene Einzigartigkeit\n");
{
  const view = fs.readFileSync("components/privacy/Fingerprint.tsx", "utf8");
  /*
    Der stärkste Effekt wäre ein Satz wie „Sie sind einer von 3 Millionen".
    Er wäre auch die eine Zahl, die diese Seite nicht haben darf: Für sie
    müsste man Besucher miteinander vergleichen – also die Sammlung anlegen,
    deren Fehlen hier der Punkt ist.
  */
  const behauptungen = [
    /einer? von \d/i,
    /\d+\s*(Millionen|Milliarden|Tausend)/i,
    /einzigartig zu \d/i,
    /\d+\s*%\s*(einzigartig|eindeutig)/i,
  ];
  const treffer = behauptungen.filter((p) => p.test(view));
  if (treffer.length) {
    fail(`Die Seite behauptet eine Häufigkeit (${treffer.length} Stelle(n)) – dafür fehlt die Grundlage.`);
  } else {
    ok("keine Aussage darüber, wie selten diese Kombination ist");
  }
  if (!/verglichen/.test(view)) {
    fail("Der Hinweis, warum diese Zahl fehlt, steht nicht auf der Seite.");
  } else {
    ok("der Grund für die fehlende Zahl steht dabei");
  }
}

/* ---- Ergebnis ----------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.log(`${failures} Fehler. Die Datenschutzseite hält nicht, was sie zeigt.`);
  process.exit(1);
}
console.log("Der Nachweis bleibt im Browser – im Quelltext geprüft, nicht nur zugesagt.");
