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

/* ---- Ergebnis ----------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.log(`${failures} Fehler. Die Instrumente zeigen etwas anderes, als sie sagen.`);
  process.exit(1);
}
console.log("Beide Instrumente rechnen, was sie behaupten.");
