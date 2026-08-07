/**
 * Rechenteil des Stethoskops – ohne Browser, damit prüfbar.
 *
 * ## Warum die Frequenzachse logarithmisch ist
 *
 * Die FFT liefert Bins in gleichen Abständen: Bei 48 kHz Abtastrate und 4096
 * Punkten sind das 2048 Bins zu je 11,7 Hz. Trägt man die linear auf, liegt
 * die halbe Bildbreite zwischen 12 und 24 kHz – ein Bereich, in dem bei einem
 * Telefon so gut wie nichts passiert –, während Netzbrummen (50 Hz) und
 * Vibrationsmotor (um 200 Hz) sich die ersten zwanzig Pixel teilen.
 *
 * Auf einer logarithmischen Achse bekommt jede Oktave dieselbe Breite. Das
 * entspricht dem Gehör, und es entspricht der Physik: Die interessanten
 * Phänomene sind nach Größenordnungen verteilt, nicht nach Hertz.
 *
 * ## Warum die Bins zusammengefasst werden
 *
 * Unten ist die Auflösung zu grob (zwischen 30 und 60 Hz liegen ganze drei
 * Bins), oben viel zu fein (zwischen 10 und 20 kHz liegen über achthundert).
 * Für jede Bildspalte wird deshalb der **stärkste** Bin ihres Bereichs
 * genommen, nicht der Mittelwert: Ein schmaler, lauter Pfeifton wäre im
 * Mittel über achthundert Bins nicht mehr zu sehen – und genau ihn sucht man.
 */

/**
 * Ordnet einer Bildspalte ihren Frequenzbereich zu.
 *
 * Liefert für jede der `columns` Spalten das erste und letzte FFT-Bin, das
 * dazugehört. Die Grenzen überlappen nie und lassen keine Lücke: Spalte n
 * endet dort, wo Spalte n+1 beginnt.
 */
export function columnBins(
  columns: number,
  binCount: number,
  sampleRate: number,
  minHz: number,
  maxHz: number,
): { from: number; to: number }[] {
  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / binCount;
  const logMin = Math.log10(minHz);
  const logMax = Math.log10(Math.min(maxHz, nyquist));
  const out: { from: number; to: number }[] = [];

  for (let i = 0; i < columns; i++) {
    const loHz = 10 ** (logMin + ((logMax - logMin) * i) / columns);
    const hiHz = 10 ** (logMin + ((logMax - logMin) * (i + 1)) / columns);
    // Mindestens ein Bin je Spalte, sonst bleiben unten Spalten leer.
    const from = Math.min(binCount - 1, Math.floor(loHz / hzPerBin));
    const to = Math.min(binCount - 1, Math.max(from, Math.ceil(hiHz / hzPerBin) - 1));
    out.push({ from, to });
  }
  return out;
}

/** Wo auf einer logarithmischen Achse von 0 bis 1 liegt diese Frequenz? */
export function logPosition(hz: number, minHz: number, maxHz: number): number {
  const value = (Math.log10(hz) - Math.log10(minHz)) / (Math.log10(maxHz) - Math.log10(minHz));
  return Math.max(0, Math.min(1, value));
}

/** Umkehrung – für die Beschriftung der Achse. */
export function positionToHz(position: number, minHz: number, maxHz: number): number {
  const logMin = Math.log10(minHz);
  return 10 ** (logMin + (Math.log10(maxHz) - logMin) * position);
}

/**
 * dBFS auf 0…1 abbilden.
 *
 * `getFloatFrequencyData` liefert Dezibel bezogen auf Vollaussteuerung, in der
 * Praxis zwischen −100 (Stille) und 0 (Übersteuerung). Der Bereich hier ist
 * enger gewählt: Unterhalb von −90 dB steht auf jedem Telefonmikrofon nur noch
 * Eigenrauschen, oberhalb von −20 dB ist ohnehin alles hell.
 */
export const DB_FLOOR = -90;
export const DB_CEIL = -20;

export function dbToLevel(db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)));
}

/**
 * Farbrampe des Wasserfalls: Schwarz → Blau → Weiß.
 *
 * Bewusst nicht der übliche Regenbogen. Er ist in der Fachwelt seit Jahren
 * verpönt, weil er künstliche Kanten erzeugt – das Auge sieht an den
 * Farbübergängen Strukturen, die in den Daten nicht stehen. Diese Rampe
 * steigt monoton in der Helligkeit und bleibt damit auch für Menschen mit
 * Farbsehschwäche lesbar; die Information steckt in der Helligkeit, nicht im
 * Farbton.
 *
 * Der Akzent der Seite kommt trotzdem vor – als Zwischenstufe, nicht als
 * eigene Bedeutung.
 */
export function rampColor(level: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, level));
  if (t < 0.5) {
    // Schwarz → Akzentblau
    const k = t / 0.5;
    return [Math.round(8 + k * 28), Math.round(9 + k * 77), Math.round(10 + k * 220)];
  }
  // Akzentblau → Weiß
  const k = (t - 0.5) / 0.5;
  return [Math.round(36 + k * 219), Math.round(86 + k * 169), Math.round(230 + k * 25)];
}

/**
 * Der stärkste Bin und seine Frequenz. Das ist die Zahl, die man mitnimmt.
 *
 * Die Grenzen werden hier nach **innen** gerundet, anders als in
 * `columnBins`. Der Unterschied hat einen Grund: Eine Bildspalte muss ihren
 * Bereich lückenlos abdecken, deshalb greift sie großzügig zu. Der
 * Ablesewert dagegen ist eine Behauptung („der lauteste Ton liegt bei …“),
 * und die darf nicht auf eine Frequenz zeigen, die auf der Achse gar nicht
 * vorkommt.
 *
 * Ohne diese Rundung meldete der Wert bei 48 kHz Abtastrate und 30 Hz
 * Untergrenze regelmäßig 23 Hz – ein Bin unterhalb des Dargestellten, und
 * genau dort sitzt bei jedem Mikrofon der Gleichanteil.
 */
export function peakFrequency(
  bins: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
): { hz: number; db: number } | null {
  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / bins.length;
  const first = Math.max(1, Math.ceil(minHz / hzPerBin));
  const last = Math.min(bins.length - 1, Math.floor(maxHz / hzPerBin));
  if (first > last) return null;

  let bestIndex = -1;
  let bestDb = -Infinity;
  for (let i = first; i <= last; i++) {
    if (bins[i] > bestDb) {
      bestDb = bins[i];
      bestIndex = i;
    }
  }
  if (bestIndex < 0 || !Number.isFinite(bestDb)) return null;
  return { hz: bestIndex * hzPerBin, db: bestDb };
}

/*
  Deutsche Schreibweise, also Komma. `toFixed` liefert einen Punkt, und ein
  Punkt ist auf einer deutschen Seite ein Tausendertrennzeichen – „20.0 kHz"
  liest sich als zwanzigtausend.
*/
const kHzFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** 1,24 kHz statt 1240.0000001 Hz – Ziffern, die niemand braucht, lügen über die Genauigkeit. */
export function formatHz(hz: number): string {
  if (hz >= 1000) return `${kHzFormat.format(hz / 1000)} kHz`;
  return `${Math.round(hz)} Hz`;
}

/* ==========================================================================
   Klirrfaktor
   ==========================================================================
   Ein Lautsprecher, der nachgibt, erzeugt aus einem reinen Ton Vielfache
   davon. Spielt man 1 kHz und misst bei 2, 3 und 4 kHz mit, hat man ein Maß
   dafür, wie sauber die Membran der Spannung folgt – den Klirrfaktor
   (englisch THD, total harmonic distortion).

   Das ist keine Spielerei, sondern die Größe, an der ein defekter
   Lautsprecher als Erstes auffällt: Eine angerissene Sicke oder eine
   schleifende Schwingspule verzerrt lange, bevor man den Fehler hört.

   ## Was diese Messung kann und was nicht

   Gemessen wird die ganze Kette: Verstärker, Lautsprecher, Luft, Mikrofon,
   Vorverstärker. Der Absolutwert hängt deshalb am Raum, am Abstand und am
   Mikrofon – ein Wert von „3 %" bedeutet ohne diese Angaben nichts, und die
   Seite behauptet auch nichts anderes.

   Belastbar ist der **Verlauf über die Lautstärke**. Ein gesunder
   Lautsprecher bleibt bis kurz unter Vollaussteuerung sauber und klirrt erst
   dann; ein beschädigter klirrt von Anfang an. Diese Form ist von Raum und
   Mikrofon weitgehend unabhängig, weil sie ein Vergleich desselben Aufbaus
   mit sich selbst ist.
   ========================================================================== */

/** dBFS in eine lineare Amplitude. 20·log₁₀ gilt für Amplituden, nicht 10·log₁₀. */
export function dbToAmplitude(db: number): number {
  return Number.isFinite(db) ? 10 ** (db / 20) : 0;
}

/**
 * Amplitude eines Tons bei `hz`, aufsummiert über sein Fenster.
 *
 * Ein Ton liegt fast nie genau auf einem Bin. Die FFT verteilt seine Energie
 * dann auf die Nachbarn – zusätzlich verschmiert das Fenster, mit dem die
 * Analyse arbeitet, jede Linie über mehrere Bins. Wer nur den stärksten Bin
 * abliest, misst deshalb systematisch zu wenig.
 *
 * Gemessen wird stattdessen die **Leistung** im Fenster, also die Summe der
 * Quadrate, und daraus wieder die Amplitude. Der Unterschied ist nicht
 * theoretisch: Gegen eine Datei mit exakt 5,00 % zweiter Oberwelle las die
 * Einzelbin-Fassung 4,58 % ab, die Summe trifft.
 *
 * `spread` ist die Zahl der Bins zu jeder Seite. Zwei decken die Hauptkeule
 * der üblichen Fensterfunktion ab; mehr würde nur Rauschen dazuzählen.
 */
export function amplitudeAt(
  bins: Float32Array,
  sampleRate: number,
  hz: number,
  spread = 2,
): number {
  const hzPerBin = sampleRate / 2 / bins.length;
  const center = Math.round(hz / hzPerBin);
  let power = 0;
  for (let i = center - spread; i <= center + spread; i++) {
    if (i < 1 || i >= bins.length) continue;
    const amplitude = dbToAmplitude(bins[i]);
    power += amplitude * amplitude;
  }
  return Math.sqrt(power);
}

export interface Distortion {
  /** Klirrfaktor als Anteil, 0.03 heißt 3 Prozent. */
  thd: number;
  /** Amplitude der Grundwelle – unterhalb der Rauschgrenze ist alles Unsinn. */
  fundamental: number;
  /** Die einzelnen Oberwellen, beginnend bei der zweiten. */
  harmonics: number[];
}

/**
 * Klirrfaktor aus einem Spektrum.
 *
 * THD = √(a₂² + a₃² + … + aₙ²) / a₁ – die geometrische Summe der Oberwellen,
 * bezogen auf die Grundwelle. Das ist die in der Akustik übliche Definition
 * (THD_R, bezogen auf die Grundwelle; die Variante bezogen auf das
 * Gesamtsignal liefert bei kleinen Werten fast dasselbe und bei großen
 * weniger, sieht also besser aus – deshalb nicht sie).
 *
 * Oberwellen oberhalb der Nyquist-Grenze werden übersprungen statt als null
 * gezählt: Dort steht kein Signal, sondern nichts, und eine Null im Zähler
 * schönte das Ergebnis.
 */
export function harmonicDistortion(
  bins: Float32Array,
  sampleRate: number,
  fundamentalHz: number,
  count = 5,
): Distortion {
  const nyquist = sampleRate / 2;
  const fundamental = amplitudeAt(bins, sampleRate, fundamentalHz);
  const harmonics: number[] = [];

  for (let n = 2; n <= count; n++) {
    const hz = fundamentalHz * n;
    if (hz >= nyquist) break;
    harmonics.push(amplitudeAt(bins, sampleRate, hz));
  }

  if (fundamental <= 0) return { thd: 0, fundamental: 0, harmonics };
  const sum = harmonics.reduce((total, a) => total + a * a, 0);
  return { thd: Math.sqrt(sum) / fundamental, fundamental, harmonics };
}
