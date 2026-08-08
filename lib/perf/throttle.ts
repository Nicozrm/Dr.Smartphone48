/**
 * Der Drosselschreiber – wie schnell ein Gerät müde wird.
 *
 * Jedes Telefon drosselt. Wird der Prozessor warm, senkt das System seinen
 * Takt, damit die Wärme abfließen kann. Das ist richtig so und kein Fehler –
 * ohne diese Regelung würde das Gerät nach zwei Minuten Videoaufnahme
 * abschalten.
 *
 * Interessant ist nicht **ob**, sondern **wann und wie stark**. Ein Gerät mit
 * gealtertem Akku, mit einem nach einer Reparatur schlecht sitzenden
 * Wärmeleitpad oder mit einem aufgeblähten Zellenpaket drosselt früher und
 * härter. Genau das lässt sich im Browser messen, ohne eine einzige
 * Berechtigung: Man gibt dem Gerät immer dieselbe Arbeit und schaut zu, wie
 * lange sie jedes Mal dauert.
 *
 * ## Warum kalibriert wird
 *
 * Ein festes Arbeitspaket wäre auf einem aktuellen Gerät in zwei
 * Millisekunden erledigt und auf einem sechs Jahre alten in zweihundert – die
 * Kurven ließen sich nicht nebeneinanderlegen. Deshalb wird zuerst die Menge
 * gesucht, die auf **diesem** Gerät etwa `TARGET_MS` dauert. Gemessen wird
 * danach die Veränderung gegenüber dem eigenen Anfangswert, nicht gegen ein
 * fremdes Gerät.
 *
 * ## Warum auf dem Hauptstrang und nicht in einem Worker
 *
 * Ein Worker liefe womöglich auf einem anderen Kern, und moderne Telefone
 * haben absichtlich langsame Sparkerne. Das Betriebssystem schiebt
 * Hintergrundarbeit gern genau dorthin – gemessen würde dann die Zuteilung,
 * nicht die Drosselung. Der Hauptstrang ist außerdem der, dessen Tempo ein
 * Mensch tatsächlich spürt.
 *
 * ## Was die Messung nicht ist
 *
 * Kein Vergleich zwischen Geräten und kein Urteil. Andere Anwendungen,
 * Stromsparmodus, ein warmer Raum und ein im Hintergrund liegender Tab
 * verändern das Ergebnis. Die Seite sagt das dazu.
 */

/** Zielzeit einer Runde. Kurz genug für eine flüssige Kurve, lang genug,
    dass die Uhr des Browsers (etwa 0,1 ms Auflösung) nicht ins Gewicht fällt. */
export const TARGET_MS = 45;

/** Dauer der Messung. Darunter zeigt sich die Drosselung oft noch nicht. */
export const RUN_SECONDS = 30;

/**
 * Das Arbeitspaket: ein linearer Kongruenzgenerator.
 *
 * Bewusst ganzzahlig und ohne Speicherzugriff – so misst man den Takt des
 * Rechenwerks und nicht die Geschwindigkeit des Arbeitsspeichers. `Math.imul`
 * ist die einzige Multiplikation in JavaScript, die 32 Bit sauber abschneidet;
 * ohne sie rechnete die Maschine in Gleitkomma und das Ergebnis liefe
 * auseinander.
 *
 * Der Rückgabewert wird vom Aufrufer weiterverwendet. Das ist kein Zierrat:
 * Eine Schleife, deren Ergebnis niemand liest, darf ein optimierender
 * Übersetzer vollständig streichen – und dann misst man das Nichts.
 */
export function work(rounds: number, seed = 1): number {
  let x = seed >>> 0;
  for (let i = 0; i < rounds; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
  }
  return x;
}

/** Median. Robust gegen den einen Ausreißer, den jedes System hat. */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export interface Sample {
  /** Sekunden seit dem Start. */
  at: number;
  /** Dauer dieser Runde in Millisekunden. */
  ms: number;
}

export interface Verdict {
  /** Median der ersten Sekunden – das Tempo im kalten Zustand. */
  baseline: number;
  /** Median der letzten Sekunden. */
  current: number;
  /** current / baseline. 1,0 heißt: keine Drosselung. */
  ratio: number;
  /** Anteil der ursprünglichen Leistung, der noch übrig ist. */
  remaining: number;
}

/** Wie viele Sekunden am Anfang und am Ende zusammengefasst werden. */
export const WINDOW_SECONDS = 4;

/**
 * Vergleicht Anfang und Ende.
 *
 * Die erste halbe Sekunde bleibt außen vor: Dort läuft die Maschine noch
 * warm, im Wortsinn wie im übertragenen – der Übersetzer optimiert die
 * Schleife erst nach einigen Durchläufen fertig, und diese Beschleunigung
 * hat mit dem Gerät nichts zu tun.
 */
export function summarize(samples: Sample[]): Verdict | null {
  if (samples.length < 8) return null;
  const total = samples[samples.length - 1].at;
  if (total < WINDOW_SECONDS * 2) return null;

  const first = samples.filter((s) => s.at >= 0.5 && s.at <= WINDOW_SECONDS);
  const last = samples.filter((s) => s.at >= total - WINDOW_SECONDS);
  if (!first.length || !last.length) return null;

  const baseline = median(first.map((s) => s.ms));
  const current = median(last.map((s) => s.ms));
  if (baseline <= 0) return null;

  const ratio = current / baseline;
  return { baseline, current, ratio, remaining: 1 / ratio };
}

/**
 * Ab hier heißt es Drosselung.
 *
 * Unterhalb von fünf Prozent ist der Unterschied das übliche Rauschen eines
 * Systems, auf dem noch anderes läuft. Ein Wert darunter wird deshalb nicht
 * als Befund ausgegeben – dieselbe Regel wie beim Ablesewert des Stethoskops.
 */
export const NOTICEABLE = 1.05;
