/*
  Prüft die Instrumente auf /check und die Bruchmechanik auf /ersatzteile
  gegen das, was sie behaupten.

  Der Beschleunigungsschreiber rechnet Zahlen aus, die ein Kunde mit nach
  Hause nimmt („aus 1,20 m, das sind 1.400 g auf Fliesen"). Solche Zahlen
  müssen stimmen, und Schulphysik hat den Vorteil, dass man sie gegen bekannte
  Werte halten kann. Das Stethoskop rechnet keine Physik, aber es bildet
  Frequenzen auf Bildspalten ab – und wenn diese Abbildung Lücken oder
  Überlappungen hat, zeigt der Wasserfall etwas, das nicht gemessen wurde.
  Beim Klirrfaktor und beim Drosselschreiber hängt alles daran, dass gegen
  den richtigen Bezugswert verglichen wird.

  Aufruf: npm run verify:instruments
*/
import {
  FREEFALL_G,
  G,
  IMPACT_G,
  MIN_FREEFALL_MS,
  decelerationG,
  fallHeight,
  fallTime,
  impactVelocity,
  surfaces,
} from "../lib/motion/impact.ts";
import {
  DB_CEIL,
  DB_FLOOR,
  amplitudeAt,
  columnBins,
  dbToAmplitude,
  dbToLevel,
  formatHz,
  harmonicDistortion,
  logPosition,
  positionToHz,
  peakFrequency,
  rampColor,
} from "../lib/audio/spectrum.ts";
import {
  DEPTH_MAX,
  DEPTH_MIN,
  TIP_MAX,
  TIP_MIN,
  flaws,
  formatLength,
  remainingStrength,
  stressConcentration,
} from "../lib/motion/crack.ts";
import {
  NOTICEABLE,
  RUN_SECONDS,
  TARGET_MS,
  WINDOW_SECONDS,
  median,
  summarize,
  work,
} from "../lib/perf/throttle.ts";
import {
  SPECTRUM_MAX_HZ,
  SPECTRUM_MIN_HZ,
  landmarks,
} from "../lib/data/acoustics.ts";
import {
  SIGNAL_RATIO,
  SILENCE_RMS,
  judgeLevel,
  windowRms,
} from "../lib/audio/level.ts";
import {
  CYCLES,
  CYCLE_SECONDS,
  SWEEP_HIGH,
  SWEEP_LOW,
  TOTAL_SECONDS,
  curve,
  fullCurve,
  cycleAt,
  envelopeAt,
  frequencyAt,
  progressAt,
} from "../lib/audio/eject.ts";
import {
  KNOWN_RATES,
  LATE_FACTOR,
  SNAP_TOLERANCE,
  histogram,
  intervalsFrom,
  nearestRate,
  reading,
  summarise,
} from "../lib/display/framerate.ts";
import {
  COLS,
  MIN_COVERAGE,
  ROWS,
  cellIndex,
  coverage,
  enclosedGaps,
  evaluate,
  reading as digitizerReading,
} from "../lib/display/digitizer.ts";
import {
  KNOWN_TOUCH_RATES,
  MIN_TOUCH_SAMPLES,
  NOTICEABLE_MS,
  SNAP_TOLERANCE as TOUCH_SNAP_TOLERANCE,
  median as latencyMedian,
  nearestTouchRate,
  summariseTaps,
  touchRate,
  touchRateReading,
} from "../lib/display/latency.ts";
import {
  coversP3,
  gamutLabel,
  gamutReading,
  megapixels,
  physicalPixels,
} from "../lib/display/panel.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};
const ok = (text) => console.log(`  ok    ${text}`);

/** Vergleich mit Toleranz – Gleitkomma trifft nie exakt. */
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ---- 1. Fallgesetze gegen bekannte Werte -------------------------------- */

console.log("Fallgesetze – gegen Werte, die im Tafelwerk stehen\n");
{
  if (!near(G, 9.80665, 1e-9)) fail(`g steht auf ${G}, die Norm nennt 9,80665.`);

  /*
    Unabhängig gerechnete Sollwerte – nicht aus dem geprüften Modul, sonst
    bestätigte der Test jede beliebige Fallbeschleunigung.

    Der erste Anlauf stand hier mit g = 9,81 statt 9,80665 und meldete den
    Code als falsch, obwohl der Fehler in den Sollwerten saß. Der Unterschied
    beträgt bei einem Meter 0,077 ms – weit unter dem, was ein Telefonsensor
    bei 60 Hz überhaupt auflöst. Für die Anzeige ist er egal; für einen Test,
    der auf fünf Stellen vergleicht, ist er es nicht.
  */
  const cases = [
    { h: 1, t: 0.451601, v: 4.428691 },
    { h: 0.5, t: 0.319330, v: 3.131557 },
    { h: 2, t: 0.638660, v: 6.263114 },
  ];
  for (const c of cases) {
    if (!near(fallTime(c.h), c.t, 5e-5)) {
      fail(`Fallzeit aus ${c.h} m: ${fallTime(c.h).toFixed(5)} s statt ${c.t} s`);
    } else if (!near(impactVelocity(c.h), c.v, 5e-5)) {
      fail(
        `Aufprall aus ${c.h} m: ${impactVelocity(c.h).toFixed(5)} m/s statt ${c.v} m/s`,
      );
    } else {
      ok(`${c.h} m → ${c.t} s → ${c.v} m/s`);
    }
  }

  // Hin und zurück muss dieselbe Höhe ergeben – die Seite rechnet in beide
  // Richtungen (gemessene Zeit → Höhe, angenommene Höhe → Zeit).
  let drift = 0;
  for (let h = 0.02; h <= 3; h += 0.01) {
    drift = Math.max(drift, Math.abs(fallHeight(fallTime(h)) - h));
  }
  if (drift > 1e-9) fail(`Hin- und Rückweg driften um ${drift.toExponential(2)} m.`);
  else ok("Höhe → Zeit → Höhe schließt sich über 0,02 bis 3 m");
}

/* ---- 2. Die Verzögerung, um die es eigentlich geht ---------------------- */

console.log("\nVerzögerung – die Aussage der Tabelle ist das Verhältnis\n");
{
  const v = impactVelocity(1);

  // Von Hand: v = 4,42945 m/s, s = 0,0005 m
  // a = v²/(2s) = 19,62/0,001 = 19620 m/s² = 2000,7 g
  const handRechnung = (v * v) / (2 * 0.0005) / G;
  if (!near(decelerationG(v, 0.0005), handRechnung, 1e-9)) {
    fail("decelerationG weicht von der Handrechnung ab.");
  } else {
    ok(`aus 1 m auf 0,5 mm Bremsweg: ${Math.round(handRechnung)} g`);
  }

  // Die eigentliche Aussage der Seite: zehnfacher Bremsweg, ein Zehntel.
  const kurz = decelerationG(v, 0.001);
  const lang = decelerationG(v, 0.01);
  if (!near(kurz / lang, 10, 1e-9)) {
    fail(`Zehnfacher Bremsweg ergibt Faktor ${(kurz / lang).toFixed(3)} statt 10.`);
  } else {
    ok("zehnfacher Bremsweg = ein Zehntel der Verzögerung");
  }

  if (Number.isFinite(decelerationG(v, 0))) {
    fail("Bremsweg 0 liefert eine endliche Zahl – eine Division durch null.");
  } else {
    ok("Bremsweg 0 ergibt unendlich statt einer erfundenen Zahl");
  }
}

/* ---- 3. Die Untergründe ------------------------------------------------- */

console.log("\nUntergründe – Reihenfolge und Vollständigkeit\n");
{
  let sortiert = true;
  for (let i = 1; i < surfaces.length; i++) {
    if (surfaces[i].stop <= surfaces[i - 1].stop) sortiert = false;
  }
  if (!sortiert) {
    fail("Die Liste ist nicht nach steigendem Bremsweg sortiert – die Tabelle liest sich dann rückwärts.");
  } else {
    ok(`${surfaces.length} Untergründe, aufsteigend von ${surfaces[0].stop * 1000} mm`);
  }

  for (const surface of surfaces) {
    if (surface.stop <= 0) fail(`${surface.label}: Bremsweg muss größer als null sein.`);
    if (!surface.note || surface.note.length < 20) {
      fail(`${surface.label}: ohne Begründung ist der Wert eine Behauptung.`);
    }
    // Kein Wert darf so groß sein, dass die Verzögerung unter 1 g fiele –
    // das hieße, der Aufprall wäre sanfter als Danebenstehen.
    const g = decelerationG(impactVelocity(1), surface.stop);
    if (g < 1) fail(`${surface.label}: ${g.toFixed(2)} g aus 1 m ist unglaubhaft.`);
  }

  const spanne =
    decelerationG(impactVelocity(1), surfaces[0].stop) /
    decelerationG(impactVelocity(1), surfaces[surfaces.length - 1].stop);
  console.log(`        Spanne der Tabelle: Faktor ${Math.round(spanne)}`);
  if (spanne < 10) {
    fail("Ohne deutliche Spanne trägt die Tabelle ihre Aussage nicht.");
  } else {
    ok("die Spanne zeigt den Unterschied, um den es geht");
  }
}

/* ---- 4. Erkennungsschwellen -------------------------------------------- */

console.log("\nSchwellen des Schreibers\n");
{
  if (!(FREEFALL_G > 0 && FREEFALL_G < 1)) {
    fail(`Freifall-Schwelle ${FREEFALL_G} g muss zwischen 0 und 1 liegen (Ruhe = 1 g).`);
  } else {
    ok(`freier Fall unter ${FREEFALL_G} g, Ruhe liegt bei 1 g`);
  }
  if (IMPACT_G <= 1) {
    fail(`Aufprall-Schwelle ${IMPACT_G} g läge unter der Ruhelage – jedes Hinlegen wäre ein Aufprall.`);
  } else {
    ok(`Aufprall ab ${IMPACT_G} g`);
  }
  // Die Mindestdauer muss einer Höhe entsprechen, die man auch erkennen will.
  const minHoehe = fallHeight(MIN_FREEFALL_MS / 1000);
  console.log(`        ${MIN_FREEFALL_MS} ms Mindestdauer entsprechen ${(minHoehe * 100).toFixed(1)} cm`);
  if (minHoehe > 0.05) {
    fail("Die Mindestdauer schluckt Stürze, die noch Schaden machen.");
  } else {
    ok("die Mindestdauer filtert Zuckungen, nicht Stürze");
  }
}

/* ---- 5. Frequenzachse: keine Lücke, keine Überlappung ------------------- */

console.log("\nSpektrum – jede Bildspalte hat genau ihren Bereich\n");
{
  const BIN_COUNT = 2048;
  const RATE = 48000;
  const cols = columnBins(600, BIN_COUNT, RATE, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);

  if (cols.length !== 600) fail(`${cols.length} Spalten statt 600.`);

  let leer = 0;
  let rueckwaerts = 0;
  let ausserhalb = 0;
  for (const col of cols) {
    if (col.to < col.from) rueckwaerts++;
    if (col.from < 0 || col.to >= BIN_COUNT) ausserhalb++;
    if (col.to - col.from < 0) leer++;
  }
  if (rueckwaerts) fail(`${rueckwaerts} Spalten haben ein Ende vor ihrem Anfang.`);
  if (ausserhalb) fail(`${ausserhalb} Spalten greifen außerhalb der Bins zu.`);
  if (leer) fail(`${leer} Spalten decken kein einziges Bin ab und blieben schwarz.`);
  if (!rueckwaerts && !ausserhalb && !leer) {
    ok("600 Spalten, jede mit mindestens einem Bin, keine außerhalb");
  }

  // Aufsteigend muss sie sein, sonst läuft die Achse rückwärts.
  let monoton = true;
  for (let i = 1; i < cols.length; i++) {
    if (cols[i].from < cols[i - 1].from) monoton = false;
  }
  if (!monoton) fail("Die Spaltenzuordnung steigt nicht durchgehend an.");
  else ok("die Frequenzachse läuft durchgehend aufwärts");

  // Hin und zurück auf der logarithmischen Achse.
  let drift = 0;
  for (let hz = SPECTRUM_MIN_HZ; hz <= SPECTRUM_MAX_HZ; hz *= 1.1) {
    const back = positionToHz(
      logPosition(hz, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ),
      SPECTRUM_MIN_HZ,
      SPECTRUM_MAX_HZ,
    );
    drift = Math.max(drift, Math.abs(back - hz) / hz);
  }
  if (drift > 1e-12) fail(`Achsenabbildung driftet um ${(drift * 100).toExponential(2)} %.`);
  else ok("Frequenz → Position → Frequenz schließt sich");

  // Oktaven müssen gleich breit sein – das ist der ganze Sinn der Sache.
  const oktave1 = logPosition(200, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ) -
    logPosition(100, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
  const oktave2 = logPosition(8000, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ) -
    logPosition(4000, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
  if (!near(oktave1, oktave2, 1e-12)) {
    fail("Zwei Oktaven bekommen unterschiedlich viel Platz – die Achse ist nicht logarithmisch.");
  } else {
    ok(`jede Oktave bekommt ${(oktave1 * 100).toFixed(2)} % der Breite`);
  }

  // Nyquist: Bei niedriger Abtastrate darf nichts oberhalb der halben Rate
  // angezeigt werden – dort steht nur Rechenrest.
  const schmal = columnBins(600, BIN_COUNT, 16000, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
  const maxBin = Math.max(...schmal.map((c) => c.to));
  if (maxBin >= BIN_COUNT) fail("Bei 16 kHz Abtastrate wird über die Bins hinaus gelesen.");
  else ok("bei 16 kHz Abtastrate bleibt die Darstellung unterhalb der Nyquist-Grenze");
}

/* ---- 6. Pegel und Farbrampe -------------------------------------------- */

console.log("\nPegel und Farben\n");
{
  if (dbToLevel(DB_FLOOR) !== 0) fail("Der leiseste Pegel ergibt nicht 0.");
  if (dbToLevel(DB_CEIL) !== 1) fail("Der lauteste Pegel ergibt nicht 1.");
  if (dbToLevel(-Infinity) !== 0) fail("Stille (-Infinity) ergibt keinen gültigen Pegel.");
  if (dbToLevel(0) !== 1 || dbToLevel(-200) !== 0) fail("Pegel außerhalb werden nicht begrenzt.");
  ok(`Pegel ${DB_FLOOR} bis ${DB_CEIL} dB auf 0 bis 1, außerhalb begrenzt`);

  // Die Rampe muss in der Helligkeit monoton steigen – sonst liest man
  // Strukturen, die in den Daten nicht stehen (der Grund gegen Regenbogen).
  let letzte = -1;
  let sprung = 0;
  for (let i = 0; i <= 100; i++) {
    const [r, g, b] = rampColor(i / 100);
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      fail(`Farbwert außerhalb 0–255 bei ${i}%.`);
      break;
    }
    // Wahrgenommene Helligkeit nach BT.601.
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    if (y < letzte - 0.01) sprung++;
    letzte = y;
  }
  if (sprung) fail(`Die Farbrampe wird an ${sprung} Stellen wieder dunkler.`);
  else ok("die Helligkeit der Rampe steigt durchgehend");
}

/* ---- 7. Spitzenwert ----------------------------------------------------- */

console.log("\nSpitzenwert – findet er den Ton, den man hineinlegt?\n");
{
  const RATE = 48000;
  const BINS = 2048;
  const hzPerBin = RATE / 2 / BINS;

  for (const ziel of [50, 200, 1000, 8000]) {
    const bins = new Float32Array(BINS).fill(-100);
    const index = Math.round(ziel / hzPerBin);
    bins[index] = -30;
    const peak = peakFrequency(bins, RATE, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
    if (!peak || Math.abs(peak.hz - ziel) > hzPerBin) {
      fail(`Ton bei ${ziel} Hz wurde als ${peak ? Math.round(peak.hz) : "nichts"} gemeldet.`);
    } else {
      ok(`${formatHz(ziel)} gefunden (${formatHz(peak.hz)}, Auflösung ${hzPerBin.toFixed(1)} Hz)`);
    }
  }

  /*
    Kein gemeldeter Wert darf außerhalb der Achse liegen – weder oben noch
    unten. Der untere Fall ist der, der wirklich vorkam: Bei 11,7 Hz je Bin
    und 30 Hz Untergrenze meldete die erste Fassung den Gleichanteil bei
    23 Hz, den jedes Mikrofon mitbringt. Auf der Achse gibt es diese
    Frequenz nicht; der Ablesewert zeigte auf einen Punkt außerhalb des
    Bildes.
  */
  for (const [name, hz] of [
    ["oberhalb", 22000],
    ["unterhalb", 23],
  ]) {
    const bins = new Float32Array(BINS).fill(-100);
    bins[Math.round(hz / hzPerBin)] = -10;
    const peak = peakFrequency(bins, RATE, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ);
    if (peak && (peak.hz > SPECTRUM_MAX_HZ || peak.hz < SPECTRUM_MIN_HZ)) {
      fail(
        `Ton ${name} der Achse (${hz} Hz) wird als Spitze bei ${Math.round(peak.hz)} Hz gemeldet.`,
      );
    } else {
      ok(`ein Ton ${name} des Bereichs wird nicht als Spitze ausgegeben`);
    }
  }

  // Und ein Bereich, in den kein einziges Bin fällt, liefert nichts statt
  // einer erfundenen Zahl.
  if (peakFrequency(new Float32Array(BINS).fill(-100), RATE, 19000, 19001) !== null) {
    fail("Ein Bereich ohne Bin liefert trotzdem einen Wert.");
  } else {
    ok("ein Bereich ohne eigenes Bin liefert nichts");
  }
}

/* ---- 8. Die Marken ------------------------------------------------------ */

console.log("\nOrientierungsmarken\n");
{
  // Eigener Zähler: Der globale wäre hier von den Abschnitten davor
  // verschmutzt, und dann meldete dieser Abschnitt einen Fehler, den er
  // nicht gefunden hat.
  const before = failures;
  const ids = new Set();
  for (const mark of landmarks) {
    if (ids.has(mark.id)) fail(`Kennung „${mark.id}" kommt doppelt vor.`);
    ids.add(mark.id);
    if (mark.from >= mark.to) fail(`${mark.label}: untere Grenze liegt nicht unter der oberen.`);
    if (mark.from < SPECTRUM_MIN_HZ || mark.to > SPECTRUM_MAX_HZ) {
      fail(`${mark.label} liegt außerhalb der dargestellten Achse und wäre unsichtbar.`);
    }
    // Jede Marke muss ihren Grund nennen – das ist die Regel in acoustics.ts.
    if (!mark.reason || mark.reason.length < 60) {
      fail(`${mark.label}: ohne Begründung ist die Marke eine Behauptung.`);
    }
    if (/\*\*|__/.test(mark.reason + mark.label)) {
      fail(`${mark.label}: Markdown im Text – er wird wörtlich gerendert.`);
    }
  }
  if (failures === before) ok(`${landmarks.length} Marken, alle begründet und im Bild`);
}

/* ---- 9. Klirrfaktor ----------------------------------------------------- */

console.log("\nKlirrfaktor – gegen ein Spektrum mit bekanntem Inhalt\n");
{
  const RATE = 48000;
  const BINS = 4096;
  const hzPerBin = RATE / 2 / BINS;
  const F0 = 1000;

  // dB und lineare Amplitude müssen ineinander übergehen: -20 dB ist ein
  // Zehntel, -40 dB ein Hundertstel. (20·log₁₀, nicht 10·log₁₀ – die
  // Verwechslung ist der häufigste Fehler an dieser Stelle und ergäbe den
  // doppelten Klirrfaktor.)
  if (Math.abs(dbToAmplitude(-20) - 0.1) > 1e-12) fail("−20 dB ist nicht ein Zehntel.");
  else if (Math.abs(dbToAmplitude(-40) - 0.01) > 1e-12) fail("−40 dB ist nicht ein Hundertstel.");
  else if (dbToAmplitude(0) !== 1) fail("0 dB ist nicht 1.");
  else ok("dB → Amplitude über 20·log₁₀");

  /** Baut ein Spektrum mit vorgegebenen Amplituden auf den Oberwellen. */
  const spektrum = (amplitudes) => {
    const bins = new Float32Array(BINS).fill(-160);
    amplitudes.forEach((a, i) => {
      if (a <= 0) return;
      bins[Math.round((F0 * (i + 1)) / hzPerBin)] = 20 * Math.log10(a);
    });
    return bins;
  };

  // Grundwelle 1, zweite und dritte Oberwelle je 0,1 → THD = √(0,01+0,01) = 0,1414
  const soll = Math.sqrt(0.01 + 0.01);
  const gemessen = harmonicDistortion(spektrum([1, 0.1, 0.1]), RATE, F0).thd;
  if (Math.abs(gemessen - soll) > 1e-6) {
    fail(`THD ${gemessen.toFixed(6)} statt ${soll.toFixed(6)}.`);
  } else {
    ok(`zwei Oberwellen zu je 10 % ergeben ${(soll * 100).toFixed(2)} % Klirrfaktor`);
  }

  // Ein reiner Ton hat keinen Klirrfaktor.
  if (harmonicDistortion(spektrum([1]), RATE, F0).thd > 1e-6) {
    fail("Ein reiner Sinus liefert einen Klirrfaktor über null.");
  } else {
    ok("ein reiner Sinus ergibt null");
  }

  // Ohne Grundwelle darf nichts herauskommen – sonst wird durch fast null
  // geteilt und die Seite zeigt astronomische Prozentwerte.
  const leer = harmonicDistortion(new Float32Array(BINS).fill(-Infinity), RATE, F0);
  if (leer.thd !== 0 || !Number.isFinite(leer.thd)) {
    fail(`Ein leeres Spektrum ergibt ${leer.thd} statt 0.`);
  } else {
    ok("ein leeres Spektrum ergibt null statt einer Division durch fast null");
  }

  /*
    Oberwellen oberhalb der Nyquist-Grenze dürfen nicht als Null mitzählen –
    das schönte das Ergebnis.

    Die Grenze wird hier von beiden Seiten angefasst, weil der erste Anlauf
    genau dazwischen danebenlag: Bei 8 kHz liegt die dritte Oberwelle mit
    24 kHz **exakt** auf Nyquist und hat dort kein Bin mehr – es bleibt eine.
    Bei 7 kHz passen 14 und 21 kHz darunter, also zwei.
  */
  for (const [grundton, erwartet] of [
    [8000, 1],
    [7000, 2],
  ]) {
    const hoch = harmonicDistortion(spektrum([1, 0.1, 0.1, 0.1, 0.1]), RATE, grundton, 5);
    if (hoch.harmonics.length !== erwartet) {
      fail(
        `Bei ${grundton / 1000} kHz Grundton werden ${hoch.harmonics.length} Oberwellen gezählt, unter Nyquist liegen ${erwartet}.`,
      );
    } else {
      ok(`bei ${grundton / 1000} kHz Grundton zählen ${erwartet} Oberwellen, der Rest wird übersprungen`);
    }
  }

  // Das Suchfenster muss eine Grundwelle finden, die zwischen zwei Bins liegt.
  const daneben = new Float32Array(BINS).fill(-160);
  daneben[Math.round(F0 / hzPerBin) + 1] = 0;
  if (amplitudeAt(daneben, RATE, F0) < 0.9) {
    fail("Eine um ein Bin verschobene Grundwelle wird nicht gefunden.");
  } else {
    ok("ein um ein Bin verschobener Ton wird noch gefunden");
  }

  /*
    Verschmierte Linien: Ein Ton, der nicht genau auf einem Bin liegt, wird
    von der Fensterfunktion über mehrere Bins verteilt. Die Summe der
    Leistung muss ihn trotzdem vollständig zurückgeben.

    Das ist die Prüfung, die den ursprünglichen Fehler gefunden hätte: Die
    erste Fassung las nur den stärksten Bin und maß dadurch gegen eine Datei
    mit exakt 5,00 % zweiter Oberwelle nur 4,58 % ab. Mit der Leistungssumme
    trifft dieselbe Messung auf zwei Nachkommastellen.
  */
  const verschmiert = new Float32Array(BINS).fill(-160);
  const mitte = Math.round(F0 / hzPerBin);
  // Eine Amplitude von 1, aufgeteilt nach Leistung auf fünf Bins.
  const anteile = [0.2, 0.5, 0.7, 0.5, 0.2];
  const norm = Math.sqrt(anteile.reduce((t, a) => t + a * a, 0));
  anteile.forEach((a, i) => {
    verschmiert[mitte - 2 + i] = 20 * Math.log10(a / norm);
  });
  const zurueck = amplitudeAt(verschmiert, RATE, F0);
  if (Math.abs(zurueck - 1) > 1e-6) {
    fail(`Eine über fünf Bins verteilte Amplitude kommt als ${zurueck.toFixed(4)} statt 1 zurück.`);
  } else {
    ok("eine über fünf Bins verschmierte Linie wird vollständig zurückgewonnen");
  }
}

/* ---- 10. Spannungsüberhöhung am Riss ------------------------------------ */

console.log("\nBruchmechanik – Inglis 1913\n");
{
  const before = failures;

  // Von Hand: a = 50 µm, ρ = 0,5 µm → 1 + 2·√100 = 21
  const handRechnung = stressConcentration(0.00005, 0.0000005);
  if (!near(handRechnung, 21, 1e-9)) {
    fail(`50 µm bei 0,5 µm Spitze ergibt ${handRechnung.toFixed(4)} statt 21.`);
  } else {
    ok("50 µm tief, 0,5 µm scharf → 21-fache Spannung");
  }

  // a = 1 mm, ρ = 0,1 µm → 1 + 2·√10000 = 201
  if (!near(stressConcentration(0.001, 0.0000001), 201, 1e-9)) {
    fail("Der Millimeterriss ergibt nicht die 201-fache Spannung.");
  } else {
    ok("1 mm tief, 0,1 µm scharf → 201-fache Spannung");
  }

  // Ohne Fehler keine Überhöhung, und eine unendlich scharfe Spitze muss
  // unendlich liefern statt einer erfundenen Zahl.
  if (stressConcentration(0, 0.000001) !== 1) fail("Ohne Fehler ist die Überhöhung nicht 1.");
  if (Number.isFinite(stressConcentration(0.001, 0))) {
    fail("Spitzenradius 0 liefert eine endliche Zahl.");
  } else {
    ok("Radius 0 ergibt unendlich, Tiefe 0 ergibt Faktor 1");
  }

  // Die Kernaussage der Seite: Schärfe zählt mehr als Tiefe. Vierfache Tiefe
  // verdoppelt die Überhöhung (√4 = 2) – ein Viertel des Radius ebenfalls.
  const basis = stressConcentration(0.0001, 0.000001) - 1;
  const tiefer = stressConcentration(0.0004, 0.000001) - 1;
  const schaerfer = stressConcentration(0.0001, 0.00000025) - 1;
  if (!near(tiefer / basis, 2, 1e-9) || !near(schaerfer / basis, 2, 1e-9)) {
    fail("Die Wurzelabhängigkeit stimmt nicht – vierfach müsste verdoppeln.");
  } else {
    ok("vierfache Tiefe und ein Viertel Radius wirken gleich stark (Wurzel)");
  }

  // Rest-Tragfähigkeit ist der Kehrwert.
  if (!near(remainingStrength(21), 1 / 21, 1e-12)) fail("remainingStrength ist nicht der Kehrwert.");
  if (remainingStrength(Infinity) !== 0) fail("Bei unendlicher Überhöhung bleibt nicht null.");

  // Die Beispiele müssen im Bereich der Schieber liegen, sonst springt der
  // Schieber beim Antippen an den Anschlag und zeigt etwas anderes an.
  for (const flaw of flaws) {
    if (flaw.depth < DEPTH_MIN || flaw.depth > DEPTH_MAX) {
      fail(`${flaw.label}: Tiefe ${formatLength(flaw.depth)} liegt außerhalb der Schieber.`);
    }
    if (flaw.tip < TIP_MIN || flaw.tip > TIP_MAX) {
      fail(`${flaw.label}: Spitzenradius ${formatLength(flaw.tip)} liegt außerhalb der Schieber.`);
    }
    if (!flaw.note || flaw.note.length < 40) fail(`${flaw.label}: ohne Erläuterung.`);
    if (/\*\*|__/.test(flaw.note + flaw.label)) fail(`${flaw.label}: Markdown im Text.`);
  }

  // Die Liste muss von harmlos nach gefährlich laufen – sie wird so gelesen.
  let steigend = true;
  for (let i = 1; i < flaws.length; i++) {
    if (
      stressConcentration(flaws[i].depth, flaws[i].tip) <=
      stressConcentration(flaws[i - 1].depth, flaws[i - 1].tip)
    ) {
      steigend = false;
    }
  }
  if (!steigend) fail("Die Beispiele sind nicht nach steigender Gefährlichkeit sortiert.");

  if (failures === before) {
    const span = [
      stressConcentration(flaws[0].depth, flaws[0].tip),
      stressConcentration(flaws.at(-1).depth, flaws.at(-1).tip),
    ];
    ok(
      `${flaws.length} Beispiele, aufsteigend von ${span[0].toFixed(1)}× bis ${Math.round(span[1])}×`,
    );
  }
}

/* ---- 11. Drosselschreiber ----------------------------------------------- */

console.log("\nDrosselung – Arbeitspaket und Auswertung\n");
{
  const before = failures;

  // Dasselbe Paket muss zweimal dasselbe ergeben, sonst misst man Zufall.
  if (work(50_000, 7) !== work(50_000, 7)) {
    fail("Das Arbeitspaket liefert bei gleicher Eingabe unterschiedliche Ergebnisse.");
  } else if (work(50_000, 7) === work(50_000, 8)) {
    fail("Verschiedene Startwerte ergeben dasselbe – die Schleife rechnet nichts.");
  } else {
    ok("das Arbeitspaket ist bestimmt und hängt am Startwert");
  }

  // Ganzzahlig und 32 Bit: Ein Ergebnis mit Nachkommastellen hieße, dass die
  // Maschine in Gleitkomma gerechnet hat und das Ergebnis auseinanderläuft.
  const value = work(1000, 1);
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    fail(`Das Arbeitspaket liefert ${value} – erwartet ist eine 32-Bit-Zahl ohne Vorzeichen.`);
  } else {
    ok("das Ergebnis bleibt eine vorzeichenlose 32-Bit-Zahl");
  }

  /*
    Doppelte Arbeit muss ungefähr doppelt so lange dauern. Ohne das wäre die
    Kalibrierung sinnlos – sie rechnet linear hoch.

    Die Eigenschaft ist deterministisch, die Messung ist es nicht: Sie liest
    eine Wanduhr auf fremder Hardware. Genau daran ist diese Prüfung einmal
    umgefallen, als sie zum Tor vor dem Merge wurde – auf einem
    GitHub-Runner kamen 2,31 ms → 6,83 ms heraus, Faktor 2,95. Das
    Arbeitspaket skaliert deswegen nicht anders; der Runner hatte während
    der zweiten Messreihe etwas anderes zu tun.

    Der Ausweg ist nicht mehr Statistik, sondern eine andere Uhr.

    Unter Last blieb die kurze Messung stabil bei 2,4 ms, während die lange
    auf 9 bis 13 ms sprang – ein Faktor von über 5. Das ist kein Rauschen,
    das sich wegmitteln ließe, sondern eine systematische Schieflage: Die
    doppelte Arbeit dauert länger als eine Zeitscheibe des Betriebssystems
    und wird deshalb fast immer mindestens einmal verdrängt, die einfache
    passt oft noch hinein. Das Minimum aus vielen Läufen hilft dagegen
    nicht, weil eben *jeder* lange Lauf betroffen ist.

    Eine Wanduhr misst hier also die Zuteilung des Betriebssystems und
    nicht die Arbeit. `process.cpuUsage()` misst die Rechenzeit, die dieser
    Prozess tatsächlich verbraucht hat; Verdrängung zählt darin nicht mit.
    Genau das ist die Größe, um die es geht – skaliert das Arbeitspaket
    linear?

    Die Arbeitspakete sind dafür zehnmal so groß wie zuvor (~25 ms statt
    ~2,5 ms). Die Buchführung des Kerns ist grobkörnig, und eine Messung
    dicht an ihrer Auflösung wäre wieder ein Zufallszahlengenerator.

    Dazu bleiben die Vorkehrungen gegen gewöhnliches Rauschen: Es zählt das
    Minimum statt des Mittelwerts, beide Größen werden abwechselnd
    gemessen, und bei einem Ausreißer wird die ganze Messung wiederholt.

    Die Toleranz bleibt eng. Sie zu weiten wäre der bequeme Weg und der
    falsche: Ein Faktor von 3 wäre ein echter Befund, und eine Prüfung, die
    ihn durchlässt, prüft nichts mehr.
  */
  const zeit = (n) => {
    const t0 = process.cpuUsage();
    work(n, 1);
    const verbraucht = process.cpuUsage(t0);
    return (verbraucht.user + verbraucht.system) / 1000;
  };

  const messen = () => {
    let einfach = Infinity;
    let doppelt = Infinity;
    for (let runde = 0; runde < 5; runde++) {
      einfach = Math.min(einfach, zeit(20_000_000));
      doppelt = Math.min(doppelt, zeit(40_000_000));
    }
    return { einfach, doppelt, faktor: doppelt / einfach };
  };

  const daneben = ({ faktor }) => faktor < 1.6 || faktor > 2.5;

  zeit(20_000_000); // einlaufen lassen, sonst misst man den Übersetzer
  let messung = messen();
  let anlaeufe = 1;
  while (daneben(messung) && anlaeufe < 3) {
    messung = messen();
    anlaeufe++;
  }

  const { einfach, doppelt, faktor } = messung;
  const anlauf = anlaeufe > 1 ? `, ${anlaeufe} Anläufe` : "";
  console.log(
    `        ${einfach.toFixed(2)} ms → ${doppelt.toFixed(2)} ms ` +
      `(Faktor ${faktor.toFixed(2)}${anlauf})`,
  );
  if (daneben(messung)) {
    fail(
      `Doppelte Arbeit dauert ${faktor.toFixed(2)}-mal so lange – die ` +
        `Kalibrierung träfe daneben. ${anlaeufe} Anläufe, jedes Mal daneben.`,
    );
  } else {
    ok("doppelte Arbeit dauert etwa doppelt so lange");
  }

  // Median – die Auswertung hängt daran.
  if (median([3, 1, 2]) !== 2) fail("Median einer ungeraden Liste ist falsch.");
  if (median([1, 2, 3, 4]) !== 2.5) fail("Median einer geraden Liste ist falsch.");
  if (median([]) !== 0) fail("Median einer leeren Liste wirft statt null zu liefern.");

  /** Baut einen Verlauf: konstante Grundzeit, dann linear ansteigend. */
  const verlauf = (endeFaktor) => {
    const out = [];
    for (let at = 0; at <= RUN_SECONDS; at += 0.05) {
      // Erst flach, ab der Hälfte ansteigend – der typische Knick.
      const t = Math.max(0, (at - RUN_SECONDS / 2) / (RUN_SECONDS / 2));
      out.push({ at, ms: TARGET_MS * (1 + t * (endeFaktor - 1)) });
    }
    return out;
  };

  const ohne = summarize(verlauf(1));
  if (!ohne || Math.abs(ohne.ratio - 1) > 1e-9) {
    fail(`Ein flacher Verlauf ergibt Verhältnis ${ohne ? ohne.ratio.toFixed(4) : "nichts"} statt 1.`);
  } else {
    ok("ein flacher Verlauf ergibt genau 1,0");
  }

  const mit = summarize(verlauf(2));
  if (!mit) {
    fail("Ein ansteigender Verlauf lässt sich nicht auswerten.");
  } else {
    // Das letzte Fenster liegt nicht ganz am Ende, deshalb etwas unter 2.
    const erwartet = 2 - (WINDOW_SECONDS / 2 / (RUN_SECONDS / 2)) * 1;
    if (Math.abs(mit.ratio - erwartet) > 0.05) {
      fail(`Verdopplung ergibt ${mit.ratio.toFixed(3)}, erwartet ${erwartet.toFixed(3)}.`);
    } else if (Math.abs(mit.remaining - 1 / mit.ratio) > 1e-12) {
      fail("Verbliebene Leistung ist nicht der Kehrwert des Verhältnisses.");
    } else {
      ok(`eine Verdopplung wird als ${mit.ratio.toFixed(2)}× erkannt`);
    }
    if (mit.ratio < NOTICEABLE) {
      fail("Eine Verdopplung läge unterhalb der Meldeschwelle.");
    }
  }

  // Zu wenig Daten dürfen keine Zahl ergeben, sondern nichts.
  if (summarize([{ at: 0, ms: 40 }]) !== null) {
    fail("Eine einzelne Messung liefert trotzdem ein Ergebnis.");
  }
  if (summarize(verlauf(1).slice(0, 20)) !== null) {
    fail("Ein zu kurzer Verlauf liefert trotzdem ein Ergebnis.");
  }
  if (failures === before) ok("zu wenig Daten ergeben nichts statt einer Zahl");

  if (NOTICEABLE <= 1) fail("Die Meldeschwelle liegt bei oder unter 1 – dann meldet jedes Rauschen.");
}

/* ---- 12. Mikrofon-Pegel -------------------------------------------------- */

console.log("\nMikrofon-Pegel – aufnehmen oder schweigen\n");
{
  // Effektivwert gegen von Hand gerechnete Fälle.
  const stille = new Float32Array(1024);
  if (windowRms(stille) !== 0) fail("Stille ergibt einen Effektivwert über null.");

  // Ein Rechteck mit Amplitude a hat den Effektivwert a.
  const rechteck = Float32Array.from({ length: 1024 }, (_, i) => (i % 2 ? 0.5 : -0.5));
  if (!near(windowRms(rechteck), 0.5, 1e-12)) {
    fail(`Rechteck 0,5 ergibt ${windowRms(rechteck)} statt 0,5.`);
  }

  // Ein Sinus mit Amplitude a hat den Effektivwert a/√2.
  const sinus = Float32Array.from({ length: 4096 }, (_, i) =>
    Math.sin((2 * Math.PI * 8 * i) / 4096),
  );
  if (!near(windowRms(sinus), 1 / Math.SQRT2, 1e-6)) {
    fail(`Sinus ergibt ${windowRms(sinus).toFixed(6)} statt ${(1 / Math.SQRT2).toFixed(6)}.`);
  } else {
    ok("Effektivwert: Stille 0, Rechteck a, Sinus a/√2");
  }

  /*
    Die Grenze der Stille ist gerechnet, nicht gegriffen: das Rauschen einer
    Quantisierung in Schritten von 1/128 hat den Effektivwert Schritt/√12.
    Wer den Wert ändert, muss diese Rechnung ändern.
  */
  const quantisierung = (1 / 128) / Math.sqrt(12);
  if (!near(SILENCE_RMS, quantisierung * 2, 1e-12)) {
    fail(`SILENCE_RMS ist nicht das Doppelte des Quantisierungsrauschens.`);
  } else {
    ok(`Grenze der Stille ${SILENCE_RMS.toFixed(5)} = 2 × (1/128)/√12`);
  }

  /*
    Der Fall, um den es geht: Ein totes Mikrofon liefert einen Untergrund von
    null. Würde blind das Verhältnis gerechnet, käme unendlich heraus – und
    das tote Gerät bestünde die Prüfung am besten von allen.
  */
  const tot = judgeLevel({ floor: 0, peak: 0 });
  if (tot.kind !== "silent") fail(`Ein totes Mikrofon wird als „${tot.kind}“ beurteilt.`);
  else ok("ein totes Mikrofon (Untergrund und Spitze null) heißt „kein Signal“");

  const fastTot = judgeLevel({ floor: 0, peak: SILENCE_RMS * 0.9 });
  if (fastTot.kind !== "silent") {
    fail("Ein Pegel unter der Wandlungsgrenze gilt als Signal.");
  } else {
    ok("ein Pegel unter der Grenze der Stille zählt nicht als Aufnahme");
  }

  // Ein arbeitendes Mikrofon: leiser Untergrund, deutlicher Ausschlag.
  const gut = judgeLevel({ floor: 0.002, peak: 0.2 });
  if (gut.kind !== "signal") fail(`Eine deutliche Aufnahme wird als „${gut.kind}“ beurteilt.`);
  else ok(`deutlicher Ausschlag → „nimmt auf“ (${Math.round(gut.ratio)}-fach)`);

  // Etwas kommt an, aber ohne Ausschlag – kein Mangelbefund, sondern eine
  // Bitte um Wiederholung.
  const flau = judgeLevel({ floor: 0.05, peak: 0.05 * (SIGNAL_RATIO - 1) });
  if (flau.kind !== "flat") fail(`Eine Aufnahme ohne Ausschlag wird als „${flau.kind}“ beurteilt.`);
  else ok("Signal ohne Ausschlag gilt weder als bestanden noch als Mangel");

  // Die Grenze selbst muss auf der bestehenden Seite liegen.
  const genau = judgeLevel({ floor: 0.01, peak: 0.01 * SIGNAL_RATIO });
  if (genau.kind !== "signal") fail("Genau am Verhältnis SIGNAL_RATIO gilt die Aufnahme nicht.");
  else ok(`genau ${SIGNAL_RATIO}-facher Ausschlag zählt noch als Aufnahme`);

  /*
    Ein lautes Zimmer hebt den Untergrund. Das darf ein arbeitendes Mikrofon
    nicht durchfallen lassen – wohl aber in die Bitte um Wiederholung führen,
    denn ohne Ausschlag ist nichts belegt.
  */
  const laut = judgeLevel({ floor: 0.08, peak: 0.9 });
  if (laut.kind !== "signal") fail("In lauter Umgebung wird ein klarer Ausschlag nicht erkannt.");
  else ok("lauter Untergrund mit klarem Ausschlag bleibt „nimmt auf“");

  // Kein Fall darf ohne Beurteilung bleiben.
  const arten = new Set(
    [
      [0, 0],
      [0, 1],
      [0.001, 0.001],
      [0.5, 0.5],
      [0.001, 0.9],
      [0.9, 0.9],
    ].map(([floor, peak]) => judgeLevel({ floor, peak }).kind),
  );
  for (const art of arten) {
    if (!["signal", "silent", "flat"].includes(art)) fail(`Unbekannte Beurteilung „${art}“.`);
  }
  ok(`${arten.size} verschiedene Beurteilungen, alle benannt`);
}

/* ---- 13. Lautsprecher-Entwässerung -------------------------------------- */

console.log("\nEntwässerung – der Ton, der auf der Seite versprochen wird\n");

{
  /*
    Auf der Seite steht: „Der Ton läuft achtmal von 110 auf 260 Hz und
    zurück.“ Genau das wird hier nachgerechnet – Zahl der Durchläufe, beide
    Endpunkte, und dass ein Durchlauf dort endet, wo der nächste anfängt.
  */
  if (!near(TOTAL_SECONDS, CYCLE_SECONDS * CYCLES, 1e-9)) {
    fail(`Gesamtdauer ${TOTAL_SECONDS} s passt nicht zu ${CYCLES} × ${CYCLE_SECONDS} s.`);
  } else {
    ok(`${CYCLES} Durchläufe × ${CYCLE_SECONDS} s = ${TOTAL_SECONDS} s`);
  }

  if (!near(frequencyAt(0), SWEEP_LOW, 1e-9)) {
    fail(`Ein Durchlauf beginnt bei ${frequencyAt(0)} Hz statt bei ${SWEEP_LOW}.`);
  } else if (!near(frequencyAt(CYCLE_SECONDS), SWEEP_LOW, 1e-9)) {
    /* Der Rückweg ist der Grund, warum die Kurve dreieckig ist: Endet ein
       Durchlauf oben und beginnt der nächste unten, springt die Frequenz –
       und ein Sprung ist ein Knacken. */
    fail(
      `Ein Durchlauf endet bei ${frequencyAt(CYCLE_SECONDS)} Hz; der nächste beginnt bei ${SWEEP_LOW} und springt.`,
    );
  } else {
    ok(`Anfang und Ende eines Durchlaufs liegen beide auf ${SWEEP_LOW} Hz`);
  }

  if (!near(frequencyAt(CYCLE_SECONDS / 2), SWEEP_HIGH, 1e-9)) {
    fail(
      `Die Bandmitte erreicht ${frequencyAt(CYCLE_SECONDS / 2).toFixed(1)} Hz statt ${SWEEP_HIGH}.`,
    );
  } else {
    ok(`die Spitze des Durchlaufs trifft ${SWEEP_HIGH} Hz`);
  }

  /* Das Band muss die Frequenz enthalten, mit der Apple dieselbe Aufgabe
     löst – sonst trägt der Absatz auf der Seite seine Begründung nicht. */
  if (!(SWEEP_LOW < 165 && 165 < SWEEP_HIGH)) {
    fail(`165 Hz liegt nicht im Band ${SWEEP_LOW}–${SWEEP_HIGH} Hz.`);
  } else {
    ok(`165 Hz liegt im Band ${SWEEP_LOW}–${SWEEP_HIGH} Hz`);
  }

  let ausserhalb = 0;
  let lautZuViel = 0;
  let lautNegativ = 0;
  for (let i = 0; i <= 2000; i++) {
    const t = (i / 2000) * CYCLE_SECONDS;
    const hz = frequencyAt(t);
    const g = envelopeAt(t);
    if (hz < SWEEP_LOW - 1e-9 || hz > SWEEP_HIGH + 1e-9) ausserhalb++;
    if (g > 1 + 1e-9) lautZuViel++;
    if (g < -1e-9) lautNegativ++;
  }
  if (ausserhalb) fail(`${ausserhalb} Stützstellen liegen außerhalb des Bandes.`);
  else if (lautZuViel) fail(`${lautZuViel} Stützstellen übersteuern (Faktor > 1).`);
  else if (lautNegativ) fail(`${lautNegativ} Stützstellen haben eine negative Lautstärke.`);
  else ok("2001 Stützstellen: Frequenz im Band, Lautstärke zwischen 0 und 1");

  /* Ohne die Ausblendung an beiden Enden knackt es, und das Knacken belastet
     die Membran an ihrem Anschlag statt sie zu bewegen. */
  if (envelopeAt(0) !== 0 || envelopeAt(CYCLE_SECONDS) !== 0) {
    fail(
      `Die Hüllkurve beginnt mit ${envelopeAt(0)} und endet mit ${envelopeAt(CYCLE_SECONDS)} – bei null wäre kein Knacken.`,
    );
  } else if (!near(envelopeAt(CYCLE_SECONDS / 2), 1, 1e-9)) {
    fail(`In der Mitte steht die Lautstärke auf ${envelopeAt(CYCLE_SECONDS / 2)} statt auf 1.`);
  } else {
    ok("die Hüllkurve fährt an beiden Enden auf null und in der Mitte auf voll");
  }

  /* Die Anzeige zählt Durchläufe von 1 bis CYCLES – nie 0, nie einen zu viel.
     Ein „Durchlauf 9 / 8“ wäre ein kleiner Fehler mit großer Wirkung: Er
     stellt die ganze Anzeige in Frage. */
  let zaehlerFalsch = 0;
  let fortschrittFalsch = 0;
  for (let i = 0; i <= 1000; i++) {
    const t = (i / 1000) * TOTAL_SECONDS;
    const c = cycleAt(t);
    if (!Number.isInteger(c) || c < 1 || c > CYCLES) zaehlerFalsch++;
    const p = progressAt(t);
    if (p < 0 || p > 1) fortschrittFalsch++;
  }
  if (zaehlerFalsch) fail(`${zaehlerFalsch} Zeitpunkte liefern einen Durchlauf außerhalb 1…${CYCLES}.`);
  else if (fortschrittFalsch) fail(`${fortschrittFalsch} Zeitpunkte liefern einen Fortschritt außerhalb 0…1.`);
  else ok(`Durchlauf bleibt in 1…${CYCLES}, Fortschritt in 0…1`);

  if (progressAt(TOTAL_SECONDS) !== 1 || cycleAt(TOTAL_SECONDS) !== CYCLES) {
    fail("Am Ende steht der Fortschritt nicht auf 1 bzw. der Durchlauf nicht auf dem letzten.");
  } else {
    ok("am Ende: Fortschritt 1, letzter Durchlauf");
  }

  /* Die Stützstellen gehen so in den Audio-Thread. Eine unsortierte oder
     unvollständige Kurve ergäbe dort einen anderen Ton als den geprüften. */
  const punkte = curve();
  const sortiert = punkte.every((p, i) => i === 0 || p.t > punkte[i - 1].t);
  if (!sortiert) fail("Die Stützstellen der Kurve laufen nicht durchgehend vorwärts.");
  else if (punkte[0].t !== 0 || !near(punkte[punkte.length - 1].t, CYCLE_SECONDS, 1e-9)) {
    fail("Die Kurve deckt nicht genau einen Durchlauf ab.");
  } else {
    ok(`${punkte.length} Stützstellen decken genau einen Durchlauf ab`);
  }

  /*
    Die volle Kurve.

    Sie ist der Grund, warum es sie gibt: Acht aneinandergereihte
    `setValueCurveAtTime` wirft Chromium als „überlappend“ zurück, und zwar
    vor dem Zustandswechsel – die Schaltfläche blieb einfach stehen, ohne
    Fehlermeldung. Geprüft wird deshalb, dass eine einzige Kurve die volle
    Dauer abdeckt und an jeder Naht auf null steht.
  */
  const voll = fullCurve();
  if (voll[0].t !== 0 || !near(voll[voll.length - 1].t, TOTAL_SECONDS, 1e-9)) {
    fail("Die volle Kurve deckt nicht die gesamte Behandlungsdauer ab.");
  } else if (!voll.every((p, i) => i === 0 || p.t > voll[i - 1].t)) {
    fail("Die volle Kurve läuft nicht durchgehend vorwärts.");
  } else {
    ok(`${voll.length} Stützstellen decken alle ${TOTAL_SECONDS} s in einer Kurve ab`);
  }

  /* An jeder Naht zwischen zwei Durchläufen muss die Hüllkurve auf null
     stehen – sonst knackt es achtmal. Die Nahtstellen aus dem Index, nicht
     aus der Zeit: t % CYCLE_SECONDS trifft sie nach acht Durchläufen knapp
     daneben, und knapp daneben ist die Hüllkurve nicht mehr null. */
  const proDurchlauf = (voll.length - 1) / CYCLES;
  let lauteNaht = null;
  for (let i = 0; i <= CYCLES; i++) {
    const p = voll[i * proDurchlauf];
    if (p.gain !== 0) lauteNaht = `${p.t.toFixed(3)} s (Lautstärke ${p.gain})`;
  }
  if (lauteNaht) fail(`An einer Naht steht die Hüllkurve nicht auf null: ${lauteNaht}`);
  else ok(`alle ${CYCLES + 1} Nahtstellen liegen auf null`);

  let vollAusserhalb = 0;
  for (const p of voll) {
    if (p.hz < SWEEP_LOW - 1e-9 || p.hz > SWEEP_HIGH + 1e-9) vollAusserhalb++;
    if (p.gain < 0 || p.gain > 1) vollAusserhalb++;
  }
  if (vollAusserhalb) fail(`${vollAusserhalb} Stützstellen der vollen Kurve liegen außerhalb ihrer Grenzen.`);
  else ok("die volle Kurve bleibt überall im Band und zwischen 0 und 1");
}

/* ---- 14. Bildfrequenz-Schreiber ----------------------------------------- */

console.log("\nBildfrequenz – Rate, Streuung und das ausgelassene Bild\n");

{
  const gleichmaessig = (hz, n) => Array.from({ length: n }, () => 1000 / hz);

  // Ein perfekt gleichmäßiger Bildschirm muss glatt durchgehen.
  for (const hz of [60, 90, 120, 144]) {
    const s = summarise(gleichmaessig(hz, 200));
    if (s.nearest !== hz) {
      fail(`${hz} Hz gleichmäßig wird als ${s.nearest ?? s.hz.toFixed(1)} gemeldet.`);
    } else if (s.late !== 0) {
      fail(`${hz} Hz gleichmäßig meldet ${s.late} zu späte Bilder.`);
    } else if (s.jitterMs > 1e-9) {
      fail(`${hz} Hz gleichmäßig meldet eine Streuung von ${s.jitterMs}.`);
    } else {
      ok(`${hz} Hz gleichmäßig: ${hz} Hz, keine Streuung, kein zu spätes Bild`);
    }
  }

  /*
    Der eigentliche Zweck des Werkzeugs: 119 saubere Bilder und ein sehr
    spätes messen sich als „120 Hz“ und ruckeln trotzdem sichtbar. Genau
    dieses eine Bild muss die Auswertung finden.
  */
  const mitRuckler = gleichmaessig(120, 200);
  mitRuckler[80] = (1000 / 120) * 4;
  mitRuckler[150] = (1000 / 120) * 2.5;
  const geruckelt = summarise(mitRuckler);
  if (geruckelt.nearest !== 120) {
    fail(`Mit zwei Rucklern kippt die Rate auf ${geruckelt.nearest ?? geruckelt.hz}.`);
  } else if (geruckelt.late !== 2) {
    fail(`Zwei ausgelassene Bilder werden als ${geruckelt.late} gezählt.`);
  } else if (!near(geruckelt.worstMs, (1000 / 120) * 4, 1e-9)) {
    fail("Der schlechteste Wert ist nicht der schlechteste.");
  } else {
    ok("120 Hz mit zwei Rucklern: Rate bleibt 120, beide Ruckler gefunden");
  }

  /* Die Schwelle selbst: knapp darunter ist Rauschen, knapp darüber ein
     ausgelassenes Bild. Wer LATE_FACTOR verstellt, verstellt beides. */
  const knapp = gleichmaessig(60, 101);
  knapp[50] = (1000 / 60) * (LATE_FACTOR - 0.05);
  const drueber = gleichmaessig(60, 101);
  drueber[50] = (1000 / 60) * (LATE_FACTOR + 0.05);
  if (summarise(knapp).late !== 0) fail(`Knapp unter ${LATE_FACTOR}× gilt ein Bild schon als zu spät.`);
  else if (summarise(drueber).late !== 1) fail(`Knapp über ${LATE_FACTOR}× gilt ein Bild nicht als zu spät.`);
  else ok(`die Schwelle liegt sauber bei ${LATE_FACTOR}× der üblichen Bilddauer`);

  /*
    Die wichtigste Eigenschaft von nearestRate: Sie darf schweigen. Ohne den
    Rückgabewert null bekäme jede krumme Messung das Etikett der nächsten
    Zeile aus einer Liste verpasst – erfundene Genauigkeit in Reinform.
  */
  const krumm = 200;
  if (nearestRate(krumm) !== null) {
    fail(`${krumm} Hz wird ${nearestRate(krumm)} Hz zugeordnet, obwohl nichts in der Nähe liegt.`);
  } else {
    ok(`${krumm} Hz bekommt keine Zuordnung, sondern seinen Messwert`);
  }

  /*
    Zwei Raten dürfen sich nicht in die Quere kommen.

    Überlappen die Toleranzbänder zweier Einträge, entscheidet in der
    Überlappung nicht die Messung, sondern die Reihenfolge in der Liste – und
    dieselbe gemessene Frequenz bekäme je nach Sortierung ein anderes
    Etikett. Genau das war der Fall, solange 45 und 48 Hz in der Liste
    standen (6,7 % auseinander bei 2 × 4 % Toleranz).
  */
  const sortiertRaten = [...KNOWN_RATES].sort((a, b) => a - b);
  let ueberlappung = null;
  for (let i = 1; i < sortiertRaten.length; i++) {
    const unten = sortiertRaten[i - 1];
    const oben = sortiertRaten[i];
    if (unten * (1 + SNAP_TOLERANCE) >= oben * (1 - SNAP_TOLERANCE)) {
      ueberlappung = [unten, oben];
      break;
    }
  }
  if (ueberlappung) {
    fail(
      `Die Bänder um ${ueberlappung[0]} und ${ueberlappung[1]} Hz überlappen – dort entscheidet die Listenreihenfolge statt der Messung.`,
    );
  } else {
    ok(`${KNOWN_RATES.length} Raten, keine zwei Bänder berühren sich`);
  }

  let rastFehler = null;
  for (const rate of KNOWN_RATES) {
    for (const richtung of [-1, 1]) {
      const innen = rate * (1 + richtung * SNAP_TOLERANCE * 0.9);
      if (nearestRate(innen) !== rate) {
        rastFehler = `${innen.toFixed(1)} Hz rastet nicht auf ${rate} Hz ein.`;
      }
    }
  }
  if (rastFehler) fail(rastFehler);
  else ok(`jede Rate fängt ihr Band von ±${(SNAP_TOLERANCE * 100).toFixed(0)} % ein`);

  /* Und in der Lücke zwischen zwei Bändern schweigt die Zuordnung. */
  let lueckeFehler = null;
  for (let i = 1; i < sortiertRaten.length; i++) {
    const mitte = (sortiertRaten[i - 1] + sortiertRaten[i]) / 2;
    if (nearestRate(mitte) !== null) {
      lueckeFehler = `Genau zwischen ${sortiertRaten[i - 1]} und ${sortiertRaten[i]} Hz wird ${nearestRate(mitte)} Hz behauptet.`;
    }
  }
  if (lueckeFehler) fail(lueckeFehler);
  else ok("genau zwischen zwei Raten wird keine Rate behauptet");

  // Abstände: aus n Zeitstempeln werden n-1 Abstände, nicht n.
  const stempel = [0, 10, 25, 40, 60];
  const abstaende = intervalsFrom(stempel);
  if (abstaende.length !== stempel.length - 1) {
    fail(`Aus ${stempel.length} Zeitstempeln werden ${abstaende.length} Abstände.`);
  } else if (abstaende.join(",") !== "10,15,15,20") {
    fail(`Die Abstände lauten ${abstaende.join(",")} statt 10,15,15,20.`);
  } else {
    ok("aus n Zeitstempeln werden n-1 Abstände, und sie stimmen");
  }

  /*
    Das Diagramm darf nichts verschlucken. Ein Ausreißer, der rechts aus der
    Achse liefe und dabei verschwände, zeigte ein ruhigeres Gerät, als vor
    einem liegt – und der Ausreißer ist hier gerade der Befund.
  */
  const werte = [...gleichmaessig(60, 60), 200, 500, 1200];
  const faecher = histogram(werte, 48, (1000 / 60) * 3);
  const summe = faecher.reduce((a, b) => a + b, 0);
  if (summe !== werte.length) {
    fail(`Das Diagramm zeigt ${summe} von ${werte.length} Werten – ${werte.length - summe} sind verschwunden.`);
  } else if (faecher[faecher.length - 1] < 3) {
    fail("Die drei Ausreißer landen nicht im letzten Fach.");
  } else {
    ok(`alle ${werte.length} Werte im Diagramm, die Ausreißer im letzten Fach`);
  }

  // Leere Messung: keine Zahl, kein Absturz, keine Behauptung.
  const leer = summarise([]);
  if (leer.count !== 0 || leer.hz !== 0 || leer.nearest !== null) {
    fail("Eine leere Messung liefert trotzdem Werte.");
  } else if (/\d+\s*Hz/.test(reading(leer))) {
    fail(`Ohne Messung wird eine Rate genannt: „${reading(leer)}“`);
  } else {
    ok("ohne verwertbare Bilder wird keine Rate behauptet");
  }

  // Unbrauchbare Abstände dürfen die Rechnung nicht vergiften.
  const dreck = summarise([0, -5, NaN, Infinity, ...gleichmaessig(60, 20)]);
  if (dreck.nearest !== 60) {
    fail(`Mit Nullen und NaN dazwischen kippt die Rate auf ${dreck.nearest ?? dreck.hz}.`);
  } else if (dreck.count !== 20) {
    fail(`${dreck.count} statt 20 verwertbare Abstände.`);
  } else {
    ok("Nullen, negative Werte, NaN und Infinity fliegen raus");
  }
}

/* ---- 15. Digitizer-Prüfstand -------------------------------------------- */

console.log("\nDigitizer – „nicht geprüft“ ist nicht „meldet nicht“\n");

{
  const alle = () => new Set(Array.from({ length: COLS * ROWS }, (_, i) => i));
  const at = (c, r) => r * COLS + c;

  /*
    Der wichtigste Einzelfall überhaupt: Wer nichts angefasst hat, hat kein
    totes Display. Ein Verfahren, das unbestrichene Felder für Löcher hält,
    meldete hier 96 tote Zonen – und der Kunde ginge mit einem
    Kostenvoranschlag über ein neues Display nach Hause.
  */
  const leer = enclosedGaps(new Set());
  if (leer.length !== 0) {
    fail(`Ein unberührtes Raster meldet ${leer.length} tote Felder statt keins.`);
  } else if (coverage(new Set()) !== 0) {
    fail("Ein unberührtes Raster meldet eine bestrichene Fläche.");
  } else {
    ok("ein unberührtes Raster meldet keine einzige tote Zone");
  }

  const voll = alle();
  if (enclosedGaps(voll).length !== 0 || coverage(voll) !== 1) {
    fail("Ein vollständig bestrichenes Raster meldet Lücken oder nicht 100 %.");
  } else {
    ok("vollständig bestrichen: 100 %, keine Lücke");
  }

  /* Ein einzelnes Loch mitten im bestrichenen Gebiet ist der Befund, um den
     es geht – es muss gefunden werden, und zwar genau dieses eine. */
  const einLoch = alle();
  einLoch.delete(at(5, 3));
  const gefunden = enclosedGaps(einLoch);
  if (gefunden.length !== 1 || gefunden[0] !== at(5, 3)) {
    fail(`Ein eingeschlossenes Loch wird als ${JSON.stringify(gefunden)} gemeldet.`);
  } else {
    ok("ein eingeschlossenes Loch wird genau dort gefunden, wo es liegt");
  }

  /* Dasselbe Loch am Rand ist keins: Dort kann der Finger auch einfach
     aufgehört haben. */
  for (const [c, r, wo] of [
    [0, 3, "linker Rand"],
    [COLS - 1, 3, "rechter Rand"],
    [5, 0, "obere Kante"],
    [5, ROWS - 1, "untere Kante"],
    [0, 0, "Ecke"],
  ]) {
    const amRand = alle();
    amRand.delete(at(c, r));
    if (enclosedGaps(amRand).length !== 0) {
      fail(`Eine ausgelassene Stelle am ${wo} wird als tote Zone gemeldet.`);
      break;
    }
  }
  ok("ausgelassene Stellen an Rand und Ecke gelten nicht als tote Zone");

  /* Ein Ring aus bestrichenen Feldern schließt alles darin ein – auch eine
     größere Fläche, nicht nur ein einzelnes Feld. */
  const ring = new Set();
  for (let c = 2; c <= 8; c++) {
    ring.add(at(c, 2));
    ring.add(at(c, 6));
  }
  for (let r = 2; r <= 6; r++) {
    ring.add(at(2, r));
    ring.add(at(8, r));
  }
  const innen = enclosedGaps(ring);
  const erwartet = (8 - 2 - 1) * (6 - 2 - 1);
  if (innen.length !== erwartet) {
    fail(`Ein Ring schließt ${innen.length} Felder ein, erwartet waren ${erwartet}.`);
  } else {
    ok(`ein Ring aus bestrichenen Feldern schließt alle ${erwartet} Felder darin ein`);
  }

  /* Ein Loch mit einem Ausgang zum Rand ist keins – die Flutfüllung muss
     durch die Öffnung hindurchkommen. */
  const offen = alle();
  for (let r = 3; r < ROWS; r++) offen.delete(at(5, r));
  if (enclosedGaps(offen).length !== 0) {
    fail("Eine zum Rand offene Lücke wird als eingeschlossen gemeldet.");
  } else {
    ok("eine zum Rand offene Lücke gilt nicht als eingeschlossen");
  }

  /* Kein gemeldetes Loch darf bestrichen sein – sonst zeigt die Fläche einen
     Warnhinweis auf einem Feld, das gerade eben noch reagiert hat. */
  const zufall = new Set();
  let seed = 20260809;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < COLS * ROWS; i++) if (rnd() < 0.7) zufall.add(i);
  const widerspruch = enclosedGaps(zufall).filter((i) => zufall.has(i));
  if (widerspruch.length) {
    fail(`${widerspruch.length} gemeldete Löcher sind in Wahrheit bestrichen.`);
  } else {
    ok("kein gemeldetes Loch liegt auf einem bestrichenen Feld");
  }

  /* Die Feldnummer muss die Ränder hineinklemmen: Ein Punkt genau auf der
     Kante ergäbe sonst eine Nummer, die es nicht gibt – und die Ecke, die am
     ehesten kaputt ist, wäre die einzige ohne Feld. */
  const ecken = [
    [0, 0, 0],
    [100, 0, COLS - 1],
    [0, 100, (ROWS - 1) * COLS],
    [100, 100, COLS * ROWS - 1],
  ];
  let klemmFehler = null;
  for (const [x, y, soll] of ecken) {
    const got = cellIndex(x, y, 100, 100);
    if (got !== soll) klemmFehler = `(${x},${y}) → ${got} statt ${soll}`;
  }
  let ausserhalb = 0;
  for (let x = 0; x <= 100; x += 0.5) {
    for (const y of [0, 50, 100]) {
      const i = cellIndex(x, y, 100, 100);
      if (!Number.isInteger(i) || i < 0 || i >= COLS * ROWS) ausserhalb++;
    }
  }
  if (klemmFehler) fail(`Die Ränder werden nicht hineingeklemmt: ${klemmFehler}`);
  else if (ausserhalb) fail(`${ausserhalb} Punkte ergeben eine Feldnummer außerhalb des Rasters.`);
  else ok("jeder Punkt einschließlich der Kanten trifft ein gültiges Feld");

  /* Unter der Mindestfläche gibt es keinen Befund, sondern die Bitte,
     weiterzufahren. Entwarnung nach halber Prüfung wäre schlimmer als kein
     Werkzeug. */
  /*
    Die Schwelle wird gegen feste Flächen geprüft, nicht gegen sich selbst.

    Der erste Anlauf baute seine Probe aus MIN_COVERAGE („zehn Prozent
    weniger als die Schwelle“) und konnte damit gar nicht anschlagen: Senkt
    jemand die Schwelle, sinkt die Probe mit, und der Test bleibt grün. Beim
    Selbsttest fiel genau das auf – von vier absichtlich eingebauten Fehlern
    meldete dieser als einziger nichts. Ein Test, dessen Sollwert vom
    Prüfling stammt, prüft nichts.
  */
  if (!(MIN_COVERAGE > 0.5 && MIN_COVERAGE <= 0.95)) {
    fail(
      `Die Mindestfläche steht auf ${Math.round(MIN_COVERAGE * 100)} %. Darunter gäbe es Entwarnung nach halber Prüfung, darüber käme man nie zu einem Befund.`,
    );
  } else {
    ok(`die Mindestfläche liegt mit ${Math.round(MIN_COVERAGE * 100)} % zwischen Leichtsinn und Unerreichbarkeit`);
  }

  const halb = new Set();
  for (let i = 0; i < (COLS * ROWS) / 2; i++) halb.add(i);
  const knapp = evaluate(halb, 1);
  if (knapp.conclusive) {
    fail("Bei nur halb bestrichener Fläche wird schon geurteilt.");
  } else if (!/zu wenig/.test(digitizerReading(knapp))) {
    fail(`Der Befund bei zu wenig Fläche lautet „${digitizerReading(knapp)}“.`);
  } else {
    ok("bei halb bestrichener Fläche gibt es keinen Befund, sondern die Bitte weiterzufahren");
  }

  const sauber = evaluate(alle(), 5);
  if (!sauber.conclusive || sauber.gaps.length !== 0 || sauber.maxPoints !== 5) {
    fail("Eine vollständige Prüfung liefert nicht das erwartete Ergebnis.");
  } else if (/tot|defekt/i.test(digitizerReading(sauber))) {
    fail(`Ein sauberer Befund spricht von Defekt: „${digitizerReading(sauber)}“`);
  } else {
    ok("eine vollständige, saubere Prüfung meldet keine Lücke und behauptet keinen Defekt");
  }
}

/* ---- 16. Farbraum-Beweis ------------------------------------------------ */

console.log("\nEingabe – Verzögerung und die Abtastrate des Digitizers\n");
{
  /*
    Die doppelte Stelle, maschinell zusammengehalten.

    `median` steht im Bildfrequenz-Schreiber und im Eingabe-Schreiber, weil
    die Prüfskripte diese Dateien ohne Bündler laden und ein Import ohne
    Dateiendung dort nicht auflösbar ist. Zwei Fassungen derselben Funktion
    driften auseinander – also werden sie hier gegen dieselben gewürfelten
    Reihen gestellt, dieselbe Mechanik wie beim Werkstattablauf, der ebenfalls
    zweimal steht.
  */
  let s = 20260810 >>> 0;
  const wuerfel = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let abweichung = null;
  for (let lauf = 0; lauf < 200 && !abweichung; lauf++) {
    const n = 1 + Math.floor(wuerfel() * 12);
    const werte = Array.from({ length: n }, () => Math.round(wuerfel() * 1000) / 10);
    /* summarise() zieht seinen Median aus derselben Funktion wie der
       Bildfrequenz-Schreiber; über eine Reihe gleicher Abstände ist der
       Median die Bilddauer. */
    const ausFrames = summarise(werte.filter((v) => v > 0)).medianMs;
    const ausLatency = latencyMedian(werte.filter((v) => v > 0));
    if (!near(ausFrames, ausLatency, 1e-12)) {
      abweichung = `${werte.join(", ")} → ${ausFrames} gegen ${ausLatency}`;
    }
  }
  if (abweichung) fail(`Die beiden Median-Fassungen weichen ab: ${abweichung}`);
  else ok("beide Median-Fassungen liefern über 200 gewürfelte Reihen dasselbe");

  if (TOUCH_SNAP_TOLERANCE !== SNAP_TOLERANCE) {
    fail(
      `Die Toleranz steht zweimal verschieden: ${TOUCH_SNAP_TOLERANCE} gegen ${SNAP_TOLERANCE}.`,
    );
  } else {
    ok("beide Toleranzen für die Zuordnung einer Rate sind dieselbe Zahl");
  }

  /*
    Der Median der Summen, nicht die Summe der Mediane.

    Die beiden Abschnitte schwanken nicht unabhängig voneinander: Eine
    ausgelastete Hauptschleife verlängert beide zugleich. Aus zwei getrennt
    gebildeten Medianen entstünde ein Wert, den keine einzelne Berührung je
    gebraucht hat. Hier: Der Median der Wartezeiten ist 10, der der Zeichenzeiten
    ebenfalls – zusammen 20 ms, die so keine der drei Berührungen gebraucht hat.
    Richtig sind 31 ms, nämlich der Median aus 31, 20 und 35.
  */
  const gegenlaeufig = [
    { queueMs: 1, frameMs: 30 },
    { queueMs: 10, frameMs: 10 },
    { queueMs: 30, frameMs: 5 },
  ];
  const zusammen = summariseTaps(gegenlaeufig);
  if (!near(zusammen.queueMs, 10, 1e-9) || !near(zusammen.frameMs, 10, 1e-9)) {
    fail("Die Mediane der beiden Abschnitte stimmen nicht.");
  } else if (!near(zusammen.totalMs, 31, 1e-9)) {
    fail(
      `Der Median der Summen steht auf ${zusammen.totalMs} statt 31 – das sieht nach der Summe der Mediane aus.`,
    );
  } else if (!near(zusammen.worstMs, 35, 1e-9)) {
    fail(`Die schlechteste Berührung steht auf ${zusammen.worstMs} statt 35.`);
  } else {
    ok("Gesamtzeit und schlechtester Fall kommen aus je einer Berührung");
  }

  /* Unbrauchbare Werte fliegen raus, statt das Ergebnis zu vergiften. Eine
     negative Wartezeit gibt es nicht – wohl aber Uhren, die sie liefern. */
  const schmutz = summariseTaps([
    { queueMs: 5, frameMs: 5 },
    { queueMs: -3, frameMs: 5 },
    { queueMs: NaN, frameMs: 5 },
    { queueMs: 5, frameMs: 5 },
  ]);
  if (schmutz.count !== 2 || !near(schmutz.totalMs, 10, 1e-9)) {
    fail(`Unbrauchbare Messwerte gehen in die Auswertung ein (${schmutz.count} Werte).`);
  } else {
    ok("negative und ungültige Messwerte fliegen raus");
  }

  /* Ohne Messwerte: Nullen, kein NaN und keine erfundene Zahl. */
  const leer = summariseTaps([]);
  if (leer.count !== 0 || leer.totalMs !== 0 || Number.isNaN(leer.jitterMs)) {
    fail("Eine leere Messung liefert etwas anderes als Nullen.");
  } else {
    ok("eine leere Messung liefert Nullen, kein NaN");
  }

  /*
    Die Bänder der Abtastraten dürfen sich nicht überlappen – dieselbe Regel
    wie beim Bildfrequenz-Schreiber, und aus demselben Anlass: In der
    Überlappung entschiede die Reihenfolge im Array statt der Messung.
  */
  const sortiert = [...KNOWN_TOUCH_RATES].sort((a, b) => a - b);
  let beruehrung = null;
  for (let i = 1; i < sortiert.length; i++) {
    const oben = sortiert[i - 1] * (1 + TOUCH_SNAP_TOLERANCE);
    const unten = sortiert[i] * (1 - TOUCH_SNAP_TOLERANCE);
    if (oben >= unten) beruehrung = `${sortiert[i - 1]} und ${sortiert[i]}`;
  }
  if (beruehrung) fail(`Die Bänder von ${beruehrung} Hz überlappen sich.`);
  else ok("keine zwei Abtastraten haben sich berührende Bänder");

  let danebenzugeordnet = null;
  for (const rate of KNOWN_TOUCH_RATES) {
    if (nearestTouchRate(rate) !== rate) danebenzugeordnet = `${rate} findet sich nicht selbst`;
  }
  /* Genau zwischen zwei Bändern wird keine Rate behauptet. Ohne diesen Fall
     lieferte `nearestTouchRate` immer den nächsten Eintrag – und 105 Hz hieße
     dann „120 Hz“. */
  for (let i = 1; i < sortiert.length; i++) {
    const mitte = (sortiert[i - 1] + sortiert[i]) / 2;
    if (nearestTouchRate(mitte) !== null) {
      danebenzugeordnet = `${mitte} Hz bekommt eine Zuordnung`;
    }
  }
  if (danebenzugeordnet) fail(`Zuordnung der Abtastrate: ${danebenzugeordnet}.`);
  else ok("jede Rate findet sich selbst, dazwischen wird nichts behauptet");

  /*
    Abstände von exakt null fliegen raus.

    Manche Browser liefern mehrere Zwischenpunkte mit demselben Zeitstempel,
    wenn sie im selben Zug aus dem Treiber kamen. Bliebe einer davon stehen,
    ginge der Median gegen null und die gemeldete Rate gegen unendlich – eine
    Zahl, die aussähe wie ein besonders gutes Panel.
  */
  const zeiten = [];
  for (let i = 0; i < 60; i++) {
    zeiten.push(i * 8.333);
    if (i % 5 === 0) zeiten.push(i * 8.333);
  }
  const rate = touchRate(zeiten);
  if (!rate.conclusive) {
    fail("Sechzig Zwischenpunkte reichen nicht für eine Aussage.");
  } else if (rate.nearest !== 120) {
    fail(`8,333 ms Abstand ergeben ${rate.nearest ?? rate.hz.toFixed(1)} statt 120 Hz.`);
  } else if (!Number.isFinite(rate.hz)) {
    fail("Doppelte Zeitstempel ergeben eine unendliche Rate.");
  } else {
    ok("doppelte Zeitstempel verfälschen die Abtastrate nicht");
  }

  /* Zu wenige Zwischenpunkte: keine Aussage, sondern eine Bitte. */
  const kurz = touchRate([0, 8, 16, 24]);
  if (kurz.conclusive) {
    fail("Vier Zwischenpunkte reichen für eine Abtastrate.");
  } else if (!new RegExp(String(MIN_TOUCH_SAMPLES)).test(touchRateReading(kurz))) {
    fail("Der Text sagt nicht, wie viele Punkte noch fehlen.");
  } else {
    ok(`unter ${MIN_TOUCH_SAMPLES} Zwischenpunkten gibt es keine Rate`);
  }

  /*
    Die Aussage bleibt einseitig – wie beim Bildfrequenz-Schreiber.

    „Wer 120 misst, hat ein Panel, das 120 kann“ ist belegbar. Der
    Umkehrschluss ist es nicht, und er darf deshalb nirgends stehen.
  */
  const text = touchRateReading(touchRate(Array.from({ length: 60 }, (_, i) => i * 8.333)));
  if (/kann nur|nicht mehr als|höchstens/.test(text)) {
    fail(`Der Text schließt von der Messung nach unten: „${text}“`);
  } else {
    ok("der Text behauptet keine Obergrenze des Panels");
  }

  /* Die Marke der Wahrnehmbarkeit ist eine Marke, kein Urteil – und sie ist
     die Zahl aus der Mensch-Maschine-Forschung, nicht eine gegriffene. */
  if (NOTICEABLE_MS !== 50) {
    fail(`Die Wahrnehmbarkeitsmarke steht auf ${NOTICEABLE_MS} ms statt 50.`);
  } else {
    ok("die Wahrnehmbarkeitsmarke steht auf 50 ms");
  }
}

console.log("\nFarbraum – die Auskunft und was aus ihr folgt\n");

{
  const probe = (over) => ({
    cssWidth: 393,
    cssHeight: 852,
    dpr: 3,
    gamut: "p3",
    highDynamicRange: true,
    colorDepth: 24,
    ...over,
  });

  const px = physicalPixels(probe());
  if (px.width !== 1179 || px.height !== 2556) {
    fail(`393 × 852 bei dreifacher Skalierung ergibt ${px.width} × ${px.height}.`);
  } else if (megapixels(probe()) !== 3) {
    fail(`1179 × 2556 sind ${megapixels(probe())} statt 3,0 Millionen Bildpunkte.`);
  } else {
    ok("393 × 852 × 3 → 1179 × 2556, 3 Millionen Bildpunkte");
  }

  const eins = physicalPixels(probe({ dpr: 1, cssWidth: 1920, cssHeight: 1080 }));
  if (eins.width !== 1920 || eins.height !== 1080) {
    fail("Ohne Skalierung weichen gerechnete und gemeldete Punkte voneinander ab.");
  } else {
    ok("ohne Skalierung sind gerechnete und gemeldete Punkte dieselben");
  }

  /* Jeder Farbraum bekommt eine Beschriftung – auch der unbekannte. Ein
     leerer Wert in der Tabelle sieht aus wie ein Fehler der Seite und nicht
     wie eine fehlende Auskunft des Browsers. */
  let ohneNamen = null;
  for (const g of ["srgb", "p3", "rec2020", "unbekannt"]) {
    const label = gamutLabel(g);
    if (!label || !label.trim()) ohneNamen = g;
  }
  if (ohneNamen) fail(`Der Farbraum „${ohneNamen}“ bleibt ohne Beschriftung.`);
  else ok("alle vier Farbraum-Fälle sind benannt, auch der unbekannte");

  if (!coversP3("p3") || !coversP3("rec2020")) {
    fail("P3 oder Rec. 2020 gilt nicht als mindestens P3.");
  } else if (coversP3("srgb") || coversP3("unbekannt")) {
    fail("sRGB oder eine fehlende Angabe gilt als P3.");
  } else {
    ok("nur P3 und Rec. 2020 gelten als mehr als sRGB");
  }

  /*
    Die Aussage darf in keiner Richtung zu weit gehen. Weder „Ihr Panel kann
    kein P3“ (die Auskunft des Browsers beweist das nicht) noch „Ihr Panel
    kann P3“ (dafür müsste jemand die Felder ansehen). Beide Sätze müssen
    deshalb auf die Felder verweisen statt selbst zu urteilen.
  */
  let zuWeit = null;
  for (const g of ["srgb", "p3", "rec2020", "unbekannt"]) {
    const text = gamutReading(probe({ gamut: g }));
    if (!/Feld/.test(text)) zuWeit = `${g}: „${text}“ verweist nicht auf die Felder`;
    if (/\bkann kein\b|\bbeweist\b/.test(text)) zuWeit = `${g}: „${text}“ urteilt selbst`;
  }
  if (zuWeit) fail(zuWeit);
  else ok("jede der vier Auskünfte verweist auf die Felder, statt selbst zu urteilen");
}

/* ---- Ergebnis ----------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.log(`${failures} Fehler. Die Instrumente zeigen etwas anderes, als sie sagen.`);
  process.exit(1);
}
console.log("Beide Instrumente rechnen, was sie behaupten.");
