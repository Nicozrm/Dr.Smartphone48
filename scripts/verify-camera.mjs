/*
  Prüft den Kamera-Prüfstand auf /check gegen das, was er behauptet.

  Von allen Instrumenten dieses Projekts ist die Kamera dasjenige mit den
  teuersten Fehlurteilen in beide Richtungen. „Acht defekte Bildpunkte“ ist
  ein Kostenvoranschlag über ein Kameramodul; „keine Auffälligkeit“ ist ein
  Kaufargument für ein aufbereitetes Gerät. Beide Sätze entstehen aus
  denselben drei Rechnungen, und beide sind falsch, wenn eine davon danebenliegt.

  Geprüft werden deshalb nicht Beispielbilder, sondern die Einzelfälle, an
  denen sich die Verfahren entscheiden – allen voran die drei, die aussehen
  wie ein Befund und keiner sind: die Vignettierung jedes Objektivs, der
  Lichtschlitz zwischen Finger und Gehäuse, und das Bücherregal statt der
  weißen Wand.

  Aufruf: npm run verify:camera
*/
import {
  DARK_FRAMES,
  DARK_MAX_LEVEL,
  FIELD_COLS,
  FIELD_DROP,
  FIELD_MAX_SPOT_SHARE,
  FIELD_MIN_LEVEL,
  FIELD_ROWS,
  FOCUS_MIN_GAIN,
  HOT_FLOOR,
  HOT_LIST_LIMIT,
  MAX_HOT_SHARE,
  MIN_DARK_FRAMES,
  addDarkFrame,
  fitSurface,
  clusters,
  createDark,
  darkReading,
  downsample,
  evaluateDark,
  evaluateField,
  fieldReading,
  focusReading,
  focusSummary,
  grayFrom,
  luma,
  sharpness,
} from "../lib/camera/sensor.ts";

let failures = 0;
const ok = (text) => console.log(`  ✓ ${text}`);
const fail = (text) => {
  failures++;
  console.log(`  ✗ ${text}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* Ein Würfel mit festem Startwert: Ein Fehlschlag muss sich nachstellen
   lassen – dieselbe Regel wie beim Rechnungsprüfstand. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---- Grundrechenarten ---------------------------------------------------- */

console.log("\nHelligkeit, Verkleinern, Referenzfläche");
{
  /* Grün wiegt am schwersten. Der Mittelwert der Kanäle wäre hier nicht bloß
     ungenau, sondern für die Suche nach heißen Punkten schädlich: Ein
     defekter Punkt sitzt in genau einem Kanal des Bayer-Musters. */
  if (!near(luma(255, 255, 255), 1, 1e-6) || !near(luma(0, 0, 0), 0, 1e-6)) {
    fail("Weiß ist nicht 1 oder Schwarz nicht 0.");
  } else if (!(luma(0, 255, 0) > luma(255, 0, 0) && luma(255, 0, 0) > luma(0, 0, 255))) {
    fail("Die Kanäle sind nicht nach Rec. 709 gewichtet.");
  } else {
    ok("Helligkeit nach Rec. 709, Grün am stärksten gewichtet");
  }

  /* Verkleinern muss mitteln, nicht abtasten. Ein Bild mit einem einzigen
     hellen Punkt darf ihn nicht verlieren. */
  const w = 40;
  const h = 30;
  const gray = new Float32Array(w * h);
  gray[15 * w + 20] = 1;
  const small = downsample(gray, w, h, 8, 6);
  const sum = small.reduce((a, b) => a + b, 0);
  /* Die Summe der Kachelmittelwerte × Kachelfläche muss die Summe des
     Originals ergeben – bei 40×30 auf 8×6 sind das je Kachel 25 Bildpunkte. */
  if (!near(sum * 25, 1, 1e-4)) {
    fail(`Beim Verkleinern geht Helligkeit verloren: ${(sum * 25).toFixed(4)} statt 1.`);
  } else if (small.filter((v) => v > 0).length !== 1) {
    fail("Der einzelne helle Punkt landet in mehr als einer Kachel.");
  } else {
    ok("Verkleinern mittelt verlustfrei, ein einzelner Punkt überlebt");
  }

  /*
    Die Referenzfläche: sechs Zahlen für das ganze Bild.

    Eine Weichzeichnung stand hier zuerst und ist am Bildrand systematisch
    falsch – ihr abgeschnittenes Fenster mittelt über hellere Kacheln weiter
    innen, und jede Randkachel liegt damit unter ihrer eigenen Umgebung. Eine
    angepasste Fläche zweiter Ordnung hat kein Fenster und deshalb keinen
    Rand. Der Nachweis: Eine exakt quadratische Wölbung muss sie bis auf
    Rechengenauigkeit reproduzieren, in der Mitte wie in der Ecke.
  */
  const C = 64;
  const R = 48;
  const woelbung = new Float32Array(C * R);
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const x = (2 * c) / (C - 1) - 1;
      const y = (2 * r) / (R - 1) - 1;
      woelbung[r * C + c] = 0.8 - 0.2 * x * x - 0.15 * y * y + 0.03 * x * y;
    }
  }
  const modell = fitSurface(woelbung, C, R);
  let rest = 0;
  for (let i = 0; i < woelbung.length; i++) {
    rest = Math.max(rest, Math.abs(modell[i] - woelbung[i]));
  }
  if (rest > 1e-5) {
    fail(`Eine quadratische Wölbung wird nicht reproduziert (Rest ${rest.toFixed(6)}).`);
  } else {
    ok("die Referenzfläche reproduziert eine quadratische Wölbung exakt – auch in der Ecke");
  }

  /* Und ein Staubkorn darf sie nicht verbiegen: Drei Kacheln können sechs
     Zahlen nicht bestimmen, das Objektiv bestimmt sie. */
  const mitKorn = Float32Array.from(woelbung);
  for (const i of [10 * C + 20, 10 * C + 21, 11 * C + 20]) mitKorn[i] *= 0.7;
  const modell2 = fitSurface(mitKorn, C, R);
  let versatz = 0;
  for (let i = 0; i < woelbung.length; i++) {
    versatz = Math.max(versatz, Math.abs(modell2[i] - modell[i]));
  }
  if (versatz > 0.005) {
    fail(`Drei dunkle Kacheln verschieben die Referenzfläche um ${versatz.toFixed(4)}.`);
  } else {
    ok("ein Staubkorn verbiegt die Referenzfläche nicht");
  }

  /* Ein entartetes System darf nicht raten: Eine Fläche aus lauter gleichen
     Werten muss genau diesen Wert ergeben, kein NaN. */
  const gleich = fitSurface(new Float32Array(C * R).fill(0.5), C, R);
  if (![...gleich].every((v) => Number.isFinite(v) && Math.abs(v - 0.5) < 1e-6)) {
    fail("Eine konstante Fläche ergibt kein konstantes Modell.");
  } else {
    ok("eine konstante Fläche ergibt genau diese Konstante");
  }
}

console.log("\nGruppen");
{
  const cols = 8;
  const rows = 6;
  const g1 = clusters([9], cols, rows);
  const g2 = clusters([9, 10, 17], cols, rows);
  const g3 = clusters([9, 11], cols, rows);
  const diagonal = clusters([9, 18], cols, rows);

  if (g1.length !== 1 || g2.length !== 1 || g3.length !== 2) {
    fail("Benachbarte und getrennte Kacheln werden nicht richtig gruppiert.");
  } else if (diagonal.length !== 2) {
    fail("Diagonal berührende Kacheln gelten als eine Gruppe.");
  } else if (clusters([], cols, rows).length !== 0) {
    fail("Eine leere Menge ergibt Gruppen.");
  } else {
    ok("Vierer-Nachbarschaft: zusammen ist zusammen, diagonal ist getrennt");
  }

  /* Ein Ring darf eine Gruppe sein, kein Kranz aus acht. */
  const ring = [];
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++) {
      if (r === 2 && c === 2) continue;
      ring.push(r * cols + c);
    }
  }
  const rings = clusters(ring, cols, rows);
  if (rings.length !== 1 || rings[0].length !== 8) {
    fail(`Ein Ring zerfällt in ${rings.length} Gruppen.`);
  } else {
    ok("ein Ring ist eine Gruppe aus acht Kacheln");
  }
}

/* ---- 1. Dunkelbild ------------------------------------------------------- */

console.log("\nDunkelbild");
{
  const W = 200;
  const H = 150;
  const N = W * H;

  /** Ein Dunkelbild mit Rauschen, optional mit heißen Punkten. */
  function darkFrame(random, { hot = [], level = 0.02, noise = 0.01 } = {}) {
    const g = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      g[i] = Math.max(0, level + (random() - 0.5) * 2 * noise);
    }
    for (const i of hot) g[i] = 0.85;
    return g;
  }

  function run(frames, options = {}) {
    const random = rng(20260810);
    const acc = createDark(N);
    for (let f = 0; f < frames; f++) {
      addDarkFrame(acc, darkFrame(random, typeof options === "function" ? options(f) : options));
    }
    return evaluateDark(acc);
  }

  const sauber = run(DARK_FRAMES);
  if (!sauber.conclusive) {
    fail(`Ein sauberes Dunkelbild gilt als nicht auswertbar (${sauber.reason}).`);
  } else if (sauber.hot !== 0) {
    fail(`Rauschen allein ergibt ${sauber.hot} heiße Bildpunkte.`);
  } else {
    ok(`${DARK_FRAMES} Bilder Rauschen ergeben null heiße Bildpunkte`);
  }

  /* Das Ausleserauschen muss der Streuung entsprechen, mit der die Bilder
     erzeugt wurden. Gleichverteilt über ±a hat die Standardabweichung
     a/√3 – bei a = 0,01 also 0,00577. */
  const erwartet = 0.01 / Math.sqrt(3);
  if (!near(sauber.noise, erwartet, erwartet * 0.15)) {
    fail(
      `Ausleserauschen ${sauber.noise.toFixed(5)} statt ${erwartet.toFixed(5)} (±15 %).`,
    );
  } else {
    ok("das gemessene Ausleserauschen trifft die eingebaute Streuung");
  }

  const drei = [10, 5000, 12345];
  const mitHot = run(DARK_FRAMES, { hot: drei });
  if (mitHot.hot !== 3) {
    fail(`Drei dauerhaft leuchtende Punkte werden als ${mitHot.hot} gemeldet.`);
  } else if (mitHot.hotPoints.join(",") !== drei.join(",")) {
    fail("Die gemeldeten Bildpunktnummern sind nicht die eingebauten.");
  } else {
    ok("drei dauerhaft leuchtende Bildpunkte werden genau gefunden");
  }

  /*
    Der wichtigste Einzelfall des ganzen Skripts.

    Ein Lichtschlitz zwischen Finger und Gehäuse leuchtet mal hier, mal dort.
    Genau dafür wird über die Bilder das Minimum genommen – und genau das
    prüft dieser Fall: Ein Punkt, der nur in einem einzigen Bild leuchtet,
    darf nicht als defekt gelten. Wer die Auswertung auf ein Einzelbild
    zurückbaut, bekommt es hier gesagt.
  */
  const flackernd = run(DARK_FRAMES, (f) => ({ hot: [100 + f, 2000 + f * 3, 9000 - f] }));
  if (flackernd.hot !== 0) {
    fail(`Ein wandernder Lichtschlitz ergibt ${flackernd.hot} defekte Bildpunkte.`);
  } else {
    ok("ein wandernder heller Punkt ist kein defekter Punkt");
  }

  /*
    Und das Minimum ist nicht der Mittelwert.

    Ein Punkt, der in der Hälfte der Bilder hell ist, hat einen Mittelwert
    weit über der Schwelle – wer statt des Minimums mittelt, meldet ihn als
    defekt. Er war aber in sechs Bildern dunkel, also ist er es nicht. Dieser
    Fall und der davor sind zusammen der Grund, warum überhaupt eine dritte
    Fläche mitläuft: Ein einzelnes Bild, das letzte Bild und der Mittelwert
    scheitern jeweils an einem von beiden.
  */
  const halb = run(DARK_FRAMES, (f) => ({ hot: f % 2 === 0 ? [3333, 4444] : [] }));
  if (halb.hot !== 0) {
    fail(`Ein Punkt, der in der Hälfte der Bilder dunkel ist, gilt als defekt (${halb.hot}).`);
  } else {
    ok("in der Hälfte der Bilder dunkel heißt: nicht defekt");
  }

  /* Ein Punkt, der in *jedem* Bild leuchtet, aber knapp unter der Schwelle
     bleibt, darf nicht gemeldet werden – sonst wäre die Schwelle nur
     Dekoration. */
  const knapp = new Float32Array(N).fill(0.02);
  knapp[42] = HOT_FLOOR - 0.02;
  const accKnapp = createDark(N);
  for (let f = 0; f < DARK_FRAMES; f++) addDarkFrame(accKnapp, knapp);
  if (evaluateDark(accKnapp).hot !== 0) {
    fail("Ein Punkt unterhalb der Schwelle wird als heiß gemeldet.");
  } else {
    ok("unterhalb der Schwelle wird nichts gemeldet");
  }

  /* Zu wenige Bilder: keine Aussage, nicht „null Fehler“. */
  const zuWenig = run(MIN_DARK_FRAMES - 1, { hot: drei });
  if (zuWenig.conclusive || zuWenig.reason !== "zu-wenig-bilder") {
    fail("Zu wenige Bilder ergeben trotzdem eine Aussage.");
  } else {
    ok(`unter ${MIN_DARK_FRAMES} Bildern gibt es keine Aussage`);
  }

  /* Nicht abgedeckt: keine Aussage, und der Grund steht dabei. Ohne diese
     Sperre meldete ein beleuchtetes Zimmer Zehntausende defekte Punkte. */
  const hell = run(DARK_FRAMES, { level: DARK_MAX_LEVEL + 0.1, noise: 0.02 });
  if (hell.conclusive || hell.reason !== "zu-hell") {
    fail(`Ein nicht abgedecktes Bild wird ausgewertet (${hell.reason}, ${hell.hot} Punkte).`);
  } else if (!/Finger/.test(darkReading(hell))) {
    fail("Der Text zum zu hellen Bild sagt nicht, was zu tun ist.");
  } else {
    ok("ein nicht abgedecktes Bild ergibt keine Aussage, sondern eine Bitte");
  }

  /*
    Die zweite Sicherung: Ein schmaler heller Streifen lässt den Mittelwert
    unter der Schwelle und hebt trotzdem Tausende Punkte über die Hitzegrenze.
    Der Mittelwert allein reicht also nicht.
  */
  const streifen = new Float32Array(N).fill(0.01);
  for (let i = 0; i < N * MAX_HOT_SHARE * 4; i++) streifen[i] = 0.9;
  const accStreifen = createDark(N);
  for (let f = 0; f < DARK_FRAMES; f++) addDarkFrame(accStreifen, streifen);
  const streulicht = evaluateDark(accStreifen);
  if (streulicht.conclusive || streulicht.reason !== "streulicht") {
    fail("Ein heller Streifen bei dunklem Mittelwert wird als Sensorbefund ausgewertet.");
  } else if (/Bildpunkte leuchten/.test(darkReading(streulicht))) {
    fail("Der Text nennt bei Streulicht trotzdem eine Zahl defekter Punkte.");
  } else {
    ok("viele heiße Punkte gelten als Streulicht, nicht als Sensorbefund");
  }

  /* Die Liste der Einzelpunkte ist begrenzt, die Zahl nicht. */
  const viele = new Float32Array(N).fill(0.01);
  const anzahl = Math.floor(N * MAX_HOT_SHARE);
  for (let i = 0; i < anzahl; i++) viele[i * 7] = 0.9;
  const accViele = createDark(N);
  for (let f = 0; f < DARK_FRAMES; f++) addDarkFrame(accViele, viele);
  const r = evaluateDark(accViele);
  if (r.hot !== anzahl) {
    fail(`${anzahl} heiße Punkte werden als ${r.hot} gezählt.`);
  } else if (r.hotPoints.length !== Math.min(anzahl, HOT_LIST_LIMIT)) {
    fail("Die Liste der Einzelpunkte hält ihre Grenze nicht ein.");
  } else {
    ok(`gezählt wird vollständig, aufgelistet höchstens ${HOT_LIST_LIMIT}`);
  }

  /* Der Speicher darf nicht mit der Zahl der Bilder wachsen: drei Flächen,
     unabhängig davon, wie oft addDarkFrame gerufen wurde. */
  const accSpeicher = createDark(1000);
  for (let f = 0; f < 50; f++) addDarkFrame(accSpeicher, new Float32Array(1000));
  const bytes =
    accSpeicher.min.byteLength + accSpeicher.sum.byteLength + accSpeicher.sumSq.byteLength;
  if (bytes !== 3 * 4 * 1000) {
    fail("Der Speicherbedarf hängt an der Zahl der Bilder.");
  } else {
    ok("der Speicher wächst nicht mit der Zahl der Bilder");
  }

  /* Ein RGBA-Puffer muss dieselbe Fläche ergeben wie die Rechnung von Hand. */
  const rgba = new Uint8ClampedArray(4 * 4);
  rgba.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 255]);
  const g = grayFrom(rgba, 4);
  if (!near(g[0], luma(255, 0, 0), 1e-6) || !near(g[3], luma(10, 20, 30), 1e-6)) {
    fail("grayFrom rechnet anders als luma.");
  } else {
    ok("grayFrom und luma rechnen dasselbe");
  }
}

/* ---- 2. Hellbild --------------------------------------------------------- */

console.log("\nHellbild");
{
  const cols = FIELD_COLS;
  const rows = FIELD_ROWS;

  /** Eine Fläche mit Vignettierung: zur Mitte hell, zu den Ecken dunkler. */
  function wand({ mitte = 0.8, abfall = 0.3, rauschen = 0, seed = 7 } = {}) {
    const random = rng(seed);
    const cells = new Float32Array(cols * rows);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxR = Math.hypot(cx, cy);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = Math.hypot(c - cx, r - cy) / maxR;
        const v = mitte * (1 - abfall * d * d) + (random() - 0.5) * 2 * rauschen;
        cells[r * cols + c] = Math.max(0, v);
      }
    }
    return cells;
  }

  /*
    Der Fall, an dem die naheliegende Umsetzung scheitert.

    Jedes Objektiv dunkelt zu den Rändern hin ab; hier um 30 %, also weit
    über der Fleckenschwelle. Wer gegen einen festen Wert oder gegen den
    Mittelwert der ganzen Fläche prüft, meldet jedem Gerät vier dunkle Ecken.
  */
  const sauber = evaluateField(wand(), cols, rows);
  if (!sauber.conclusive) {
    fail(`Eine gleichmäßige Wand gilt als nicht auswertbar (${sauber.reason}).`);
  } else if (sauber.groups.length !== 0) {
    fail(
      `Die Vignettierung wird als ${sauber.groups.length} Flecken gemeldet (stärkster Einbruch ${(
        sauber.worstDrop * 100
      ).toFixed(1)} %).`,
    );
  } else {
    ok("30 % Abdunklung zum Rand hin ergeben null Flecken");
  }

  /* Ein Staubkorn: eine Kachel, deutlich unter ihrer Umgebung. */
  const mitKorn = wand();
  mitKorn[20 * cols + 30] *= 1 - FIELD_DROP * 2;
  const korn = evaluateField(mitKorn, cols, rows);
  if (korn.groups.length !== 1 || korn.groups[0].length !== 1) {
    fail(`Ein Staubkorn wird als ${korn.groups.length} Gruppen gemeldet.`);
  } else if (korn.groups[0][0] !== 20 * cols + 30) {
    fail("Der gemeldete Fleck sitzt an der falschen Stelle.");
  } else {
    ok("ein einzelnes Korn wird als genau ein Fleck an der richtigen Stelle gefunden");
  }

  /* Ein Fettfleck über vier Kacheln ist ein Fleck, nicht vier. */
  const mitFleck = wand();
  for (const [dr, dc] of [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]) {
    mitFleck[(10 + dr) * cols + (40 + dc)] *= 1 - FIELD_DROP * 2;
  }
  const fleck = evaluateField(mitFleck, cols, rows);
  if (fleck.groups.length !== 1 || fleck.groups[0].length !== 4) {
    fail(
      `Ein zusammenhängender Fleck wird als ${fleck.groups.length} Stellen mit ${fleck.groups[0]?.length} Kacheln gemeldet.`,
    );
  } else if (!/eine Stelle/.test(fieldReading(fleck))) {
    fail("Der Text zählt Kacheln statt Stellen.");
  } else {
    ok("vier zusammenhängende Kacheln sind eine Stelle, nicht vier");
  }

  /*
    Der zweite Durchgang, nachgewiesen statt behauptet.

    Ein Fettfleck über 14 × 14 Kacheln biegt die Referenzfläche im ersten
    Durchgang zu sich herunter und verkleinert damit seinen eigenen
    Ausschlag: gemeldet würden 12,6 % statt der eingebauten 15. Der zweite
    Durchgang schaltet die Verdächtigen stumm, und die Tiefe stimmt wieder
    auf die Stelle genau. Wer die Schleife auf einen Durchgang kürzt, bekommt
    es hier gesagt – und zwar an beiden Zahlen.
  */
  const gross = wand();
  for (let r = 18; r < 32; r++) {
    for (let c = 26; c < 40; c++) gross[r * cols + c] *= 1 - 0.15;
  }
  const grossResult = evaluateField(gross, cols, rows);
  if (!near(grossResult.worstDrop, 0.15, 0.005)) {
    fail(
      `Ein großer Fleck wird mit ${(grossResult.worstDrop * 100).toFixed(1)} % statt 15 % gemeldet.`,
    );
  } else if (grossResult.spots.length !== 14 * 14) {
    fail(`Ein Fleck über 196 Kacheln wird als ${grossResult.spots.length} Kacheln gemeldet.`);
  } else {
    ok("ein großer Fleck wird in voller Tiefe und ohne Ausfransen gemeldet");
  }

  /*
    Und die Blindstelle des Verfahrens, festgehalten statt verschwiegen.

    Ein breiter, flacher Belag – eine beschlagene oder gleichmäßig
    verschmierte Linse – ist selbst eine sanfte Wölbung. Die Referenzfläche
    nimmt ihn mit, und gemeldet wird nichts. Das ist die Kehrseite davon,
    dass die Vignettierung nicht gemeldet wird; beides ist dieselbe Rechnung.
    Auf der Seite steht es unter „Was er übersieht“, und dieser Fall hält
    fest, dass es dort stehen muss.
  */
  const belag = wand();
  for (let r = 14; r < 34; r++) {
    for (let c = 22; c < 42; c++) belag[r * cols + c] *= 1 - 0.085;
  }
  const belagResult = evaluateField(belag, cols, rows);
  if (belagResult.spots.length !== 0) {
    fail(
      `Ein breiter, flacher Belag wird doch gefunden (${belagResult.spots.length} Kacheln) – dann gehört der Satz „Was er übersieht“ geändert.`,
    );
  } else {
    ok("ein breiter, flacher Belag bleibt unentdeckt – wie auf der Seite angegeben");
  }

  /* Zu dunkel: keine Aussage. */
  const dunkel = evaluateField(wand({ mitte: FIELD_MIN_LEVEL - 0.1 }), cols, rows);
  if (dunkel.conclusive || dunkel.reason !== "zu-dunkel") {
    fail("Eine zu dunkle Fläche wird ausgewertet.");
  } else {
    ok("unter der Helligkeitsschwelle gibt es keine Aussage");
  }

  /*
    Kein Bücherregal.

    Ein Bild mit Struktur liefert Hunderte dunkle Stellen – jede richtig
    gerechnet und als Befund vollkommen falsch. Dieselbe Regel wie beim
    Digitizer-Prüfstand, der unter 60 % bestrichener Fläche schweigt.
  */
  const random = rng(99);
  const szene = new Float32Array(cols * rows);
  for (let i = 0; i < szene.length; i++) szene[i] = 0.3 + random() * 0.7;
  const wirr = evaluateField(szene, cols, rows);
  if (wirr.conclusive || wirr.reason !== "keine-flaeche") {
    fail(`Eine strukturierte Szene wird ausgewertet (${wirr.groups.length} Stellen).`);
  } else if (wirr.spots.length !== 0) {
    fail("Bei „keine Fläche“ werden trotzdem einzelne Stellen zurückgegeben.");
  } else if (!/Wand|Himmel/.test(fieldReading(wirr))) {
    fail("Der Text sagt nicht, worauf die Kamera zu richten ist.");
  } else {
    ok("eine strukturierte Szene ergibt keinen Befund, sondern eine Bitte");
  }

  /* Die Schwelle wird gegen feste Flächen geprüft, nicht gegen sich selbst.
     Der Digitizer-Prüfstand hatte hier einmal einen Test, dessen Sollwert
     vom Prüfling stammte – er konnte gar nicht anschlagen. */
  const grenze = Math.floor(cols * rows * FIELD_MAX_SPOT_SHARE);
  const knapp = wand();
  for (let i = 0; i < grenze - 20; i++) {
    /* verteilt, damit die Weichzeichnung nicht mitzieht */
    knapp[(i * 37) % (cols * rows)] *= 1 - FIELD_DROP * 3;
  }
  const knappResult = evaluateField(knapp, cols, rows);
  if (!knappResult.conclusive) {
    fail("Knapp unterhalb der Grenze verweigert die Auswertung schon die Aussage.");
  } else {
    ok(`bis ${grenze} auffällige Kacheln bleibt die Fläche eine Fläche`);
  }
}

/* ---- 3. Schärfe ---------------------------------------------------------- */

console.log("\nSchärfe und Autofokus");
{
  const W = 64;
  const H = 48;

  function karo(size) {
    const g = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const on = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
        g[y * W + x] = on ? 0.8 : 0.2;
      }
    }
    return g;
  }

  /** Ein Weichzeichner als Ersatz für Unschärfe. */
  function verwischen(g, runden) {
    let cur = g;
    for (let n = 0; n < runden; n++) {
      const out = new Float32Array(cur.length);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny < 0 || nx < 0 || ny >= H || nx >= W) continue;
              sum += cur[ny * W + nx];
              count++;
            }
          }
          out[y * W + x] = sum / count;
        }
      }
      cur = out;
    }
    return cur;
  }

  const scharf = sharpness(karo(4), W, H);
  const unscharf = sharpness(verwischen(karo(4), 3), W, H);
  const flach = sharpness(new Float32Array(W * H).fill(0.5), W, H);

  if (!(scharf > unscharf * 5)) {
    fail(`Scharf (${scharf.toFixed(3)}) hebt sich nicht von unscharf (${unscharf.toFixed(3)}) ab.`);
  } else if (flach > 1e-9) {
    fail("Eine kantenlose Fläche bekommt einen Schärfewert.");
  } else {
    ok("Kanten ergeben Schärfe, eine glatte Fläche nicht");
  }

  /*
    Die Normierung auf die Belichtung ist der eigentliche Trick.

    Ohne sie wäre dasselbe Motiv unter hellerer Beleuchtung „schärfer“ – und
    der Autofokus-Verlauf zeigte die Belichtungsautomatik, die im selben
    Moment mitregelt. Doppelte Helligkeit muss denselben Wert ergeben.
  */
  const hell = karo(4).map((v) => v * 2);
  const hellWert = sharpness(hell, W, H);
  if (!near(hellWert, scharf, scharf * 1e-6)) {
    fail(
      `Doppelte Helligkeit ändert die Schärfe: ${hellWert.toFixed(4)} statt ${scharf.toFixed(4)}.`,
    );
  } else {
    ok("doppelte Helligkeit ändert den Schärfewert nicht");
  }

  /* Ein Fokuslauf: erst unscharf, dann schnell scharf, dann stabil. */
  const verlauf = [];
  for (let i = 0; i < 60; i++) {
    const t = i * 33;
    const wert = t < 200 ? 1 : t < 500 ? 1 + ((t - 200) / 300) * 9 : 10;
    verlauf.push({ t, value: wert });
  }
  const fokus = focusSummary(verlauf);
  if (!fokus.conclusive) {
    fail("Ein deutlicher Fokusvorgang gilt als nicht auswertbar.");
  } else if (!near(fokus.gain, 10, 0.01)) {
    fail(`Der Zugewinn wird als ${fokus.gain.toFixed(2)} statt 10 gemeldet.`);
  } else if (!(fokus.settleMs > 400 && fokus.settleMs < 520)) {
    fail(`Die 90-%-Marke liegt bei ${fokus.settleMs} ms statt bei rund 470 ms.`);
  } else if (fokus.settleMs > fokus.peakAtMs) {
    fail("Die 90-%-Marke liegt hinter dem Maximum.");
  } else {
    ok("ein Fokusvorgang wird mit Zugewinn und 90-%-Marke richtig beschrieben");
  }

  /* Nichts passiert: keine Zahl, sondern eine Erklärung. Ein „fokussiert in
     0 ms“ wäre eine Zahl ohne Inhalt. */
  const still = [];
  for (let i = 0; i < 60; i++) still.push({ t: i * 33, value: 5 + (i % 3) * 0.1 });
  const nichts = focusSummary(still);
  if (nichts.conclusive) {
    fail(`Ein Verlauf ohne Fokusvorgang gilt als Messung (Zugewinn ${nichts.gain.toFixed(2)}).`);
  } else if (!/Kante|scharf/.test(focusReading(nichts))) {
    fail("Der Text zum ausbleibenden Fokusvorgang erklärt nicht, was zu tun ist.");
  } else {
    ok(`unter dem ${FOCUS_MIN_GAIN}-fachen Zugewinn gibt es keine Fokuszeit`);
  }

  /* Zu wenige Messwerte ergeben keine Aussage. */
  if (focusSummary([{ t: 0, value: 1 }, { t: 33, value: 9 }]).conclusive) {
    fail("Zwei Messwerte reichen für eine Fokusmessung.");
  } else {
    ok("unter drei Messwerten gibt es keine Aussage");
  }
}

/* ---- Ergebnis ----------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.log(`${failures} Fehler. Der Kamera-Prüfstand misst etwas anderes, als er sagt.`);
  process.exit(1);
}
console.log("Der Kamera-Prüfstand rechnet, was er behauptet.");
