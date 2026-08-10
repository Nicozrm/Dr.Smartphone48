/**
 * Der Eingabe-Schreiber – wie lange dieses Gerät braucht, bis es reagiert.
 *
 * Auf /ersatzteile steht ein Vergleich, der die Eingabeverzögerung eines
 * billigen Ersatzdisplays *veranschaulicht*: zwei Punkte, einer läuft dem
 * Finger hinterher. Er ist ehrlich beschriftet – er zeigt einen bekannten
 * Unterschied, er misst ihn nicht. Hier wird gemessen, und zwar am Gerät, das
 * gerade in der Hand liegt.
 *
 * ## Was ein Browser tatsächlich hergibt
 *
 * Eine Berührung durchläuft vier Abschnitte:
 *
 *   1. Finger → Digitizer meldet (Abtastung und Filterung im Panel)
 *   2. Meldung → Ereignis erreicht das JavaScript (Warteschlange des Browsers)
 *   3. Ereignis → das nächste Bild ist gezeichnet (Layout, Malen, Compositing)
 *   4. Bild fertig → das Licht ändert sich (Bildschirm)
 *
 * Messbar sind **2 und 3**, und zwar genau:
 * `PointerEvent.timeStamp` trägt den Zeitpunkt, zu dem der Browser das
 * Ereignis erzeugt hat, auf derselben Uhr wie `performance.now()`. Die
 * Differenz zum Eintritt in den Handler ist Abschnitt 2; die Differenz zum
 * Zeitstempel des nächsten `requestAnimationFrame` ist Abschnitt 3.
 *
 * 1 und 4 sind aus dem Browser heraus nicht zu haben – dafür bräuchte es eine
 * Hochgeschwindigkeitskamera, die Finger und Bildschirm gleichzeitig sieht.
 * Der gemessene Wert ist deshalb ausdrücklich eine **Untergrenze** der
 * gefühlten Verzögerung, so wie der Sturzschreiber seinen Spitzenwert als
 * Untergrenze ausweist. Ein Messgerät, das seine eigene Grenze verschweigt,
 * ist ein Ratespiel mit Nachkommastellen.
 *
 * ## Die zweite Zahl: die Abtastrate des Digitizers
 *
 * `getCoalescedEvents()` gibt die Zwischenpunkte heraus, die der Browser vor
 * der Auslieferung zusammengefasst hat – also die Meldungen des Digitizers in
 * ihrem ursprünglichen Takt. Deren Abstände sind die Abtastrate des
 * Touchscreens, und die ist eine Eigenschaft des verbauten Panels: 120 Hz ab
 * Werk, 60 Hz nach einer billigen Reparatur. Sie steht auf keinem Kassenbon
 * und lässt sich sonst nirgends nachsehen.
 *
 * Die Aussage ist einseitig wie beim Bildfrequenz-Schreiber: Gemessene 120
 * beweisen ein Panel, das 120 kann. Gemessene 60 können auch am Stromsparen
 * liegen.
 */

/**
 * Median. Robust gegen den einen Ausreißer, den jede Messung hat.
 *
 * Dieselbe Funktion steht im Bildfrequenz-Schreiber. Sie hier zu importieren
 * wäre der geradere Weg und geht nicht: Die Prüfskripte laden diese Dateien
 * ohne Bündler, und dort ist ein Import ohne Dateiendung nicht auflösbar.
 * Also steht sie zweimal – und wird, wie jede doppelte Stelle in diesem
 * Projekt, maschinell zusammengehalten: `verify:instruments` wirft beide
 * Fassungen gegen dieselben gewürfelten Reihen und verlangt dasselbe
 * Ergebnis.
 */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Wie viele Berührungen gesammelt werden, bevor ausgewertet wird. */
export const TAPS = 10;

/**
 * Die Abtastraten, mit denen Digitizer tatsächlich laufen.
 *
 * Sie sind nicht dieselben wie die Bildraten: 240 Hz Abtastung bei 120 Hz
 * Bild ist bei Geräten mit Stifteingabe der Normalfall. Umgekehrt gibt es
 * keinen 30-Hz-Digitizer. Die Liste ist deshalb eine eigene – geprüft wird
 * aber mit derselben Regel, dass sich keine zwei Bänder überlappen dürfen.
 */
export const KNOWN_TOUCH_RATES = [60, 90, 120, 144, 240];

/**
 * Wie weit ein Messwert von einer bekannten Abtastrate abweichen darf – als
 * Anteil der Rate.
 *
 * Derselbe Wert wie beim Bildfrequenz-Schreiber, und aus demselben Grund
 * ausgeschrieben statt importiert (siehe `median`). Das Prüfskript vergleicht
 * beide Zahlen; wer eine ändert, bekommt es dort gesagt.
 */
export const SNAP_TOLERANCE = 0.04;

/**
 * Ab welcher Gesamtverzögerung ein Wert hervorgehoben wird.
 *
 * 50 ms ist die Schwelle, ab der eine Verzögerung von einem Menschen als
 * solche wahrgenommen wird statt als Trägheit des eigenen Fingers – sie
 * stammt nicht aus diesem Projekt, sondern ist der seit Jahrzehnten
 * gebräuchliche Wert aus der Mensch-Maschine-Forschung. Sie ist eine
 * Markierung, kein Urteil: Über der Marke steht kein „defekt“, sondern eine
 * andere Farbe an einer Zahl.
 */
export const NOTICEABLE_MS = 50;

export interface Tap {
  /** Warteschlange: vom Ereignis bis in den Handler. */
  queueMs: number;
  /** Vom Handler bis zum nächsten gezeichneten Bild. */
  frameMs: number;
}

export interface LatencySummary {
  count: number;
  /** Median der Warteschlangenzeit. */
  queueMs: number;
  /** Median der Zeit bis zum Bild. */
  frameMs: number;
  /** Median der Summe – und zwar je Berührung summiert, nicht die Summe der Mediane. */
  totalMs: number;
  /** Mittlere absolute Abweichung der Summe vom Median. */
  jitterMs: number;
  /** Die längste gemessene Gesamtverzögerung. */
  worstMs: number;
}

/**
 * Auswertung der gesammelten Berührungen.
 *
 * Der Median der Summen, nicht die Summe der Mediane: Die beiden Abschnitte
 * schwanken nicht unabhängig voneinander – eine ausgelastete Hauptschleife
 * verlängert beide zugleich. Aus zwei getrennt gebildeten Medianen entstünde
 * ein Wert, den keine einzelne Berührung je gebraucht hat.
 */
export function summariseTaps(taps: Tap[]): LatencySummary {
  const clean = taps.filter(
    (t) =>
      Number.isFinite(t.queueMs) &&
      Number.isFinite(t.frameMs) &&
      t.queueMs >= 0 &&
      t.frameMs >= 0,
  );
  if (!clean.length) {
    return { count: 0, queueMs: 0, frameMs: 0, totalMs: 0, jitterMs: 0, worstMs: 0 };
  }

  const totals = clean.map((t) => t.queueMs + t.frameMs);
  const med = median(totals);
  return {
    count: clean.length,
    queueMs: median(clean.map((t) => t.queueMs)),
    frameMs: median(clean.map((t) => t.frameMs)),
    totalMs: med,
    jitterMs: median(totals.map((v) => Math.abs(v - med))),
    worstMs: Math.max(...totals),
  };
}

export interface TouchRate {
  /** Gemessene Rate in Hertz. */
  hz: number;
  /** Zugeordnete übliche Rate – oder null. */
  nearest: number | null;
  medianMs: number;
  /** Zahl der ausgewerteten Abstände. */
  count: number;
  conclusive: boolean;
}

/**
 * Wie viele Zwischenpunkte mindestens vorliegen müssen.
 *
 * Unter zwanzig Abständen ist der Median einer Abtastrate Zufall – ein
 * langsamer Wisch über zwei Zentimeter liefert sie nicht.
 */
export const MIN_TOUCH_SAMPLES = 20;

/**
 * Nächste übliche Abtastrate – oder null.
 *
 * Eigene Umsetzung statt `nearestRate` aus dem Bildfrequenz-Schreiber, weil
 * die Liste eine andere ist. Die Toleranz ist bewusst dieselbe Konstante:
 * Zwei Zahlen für dieselbe Regel driften auseinander.
 */
export function nearestTouchRate(hz: number): number | null {
  let best: number | null = null;
  let bestDelta = Infinity;
  for (const rate of KNOWN_TOUCH_RATES) {
    const delta = Math.abs(hz - rate);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = rate;
    }
  }
  if (best === null) return null;
  return bestDelta <= best * SNAP_TOLERANCE ? best : null;
}

/**
 * Abtastrate aus den Zeitstempeln der Zwischenpunkte.
 *
 * Abstände von exakt null fliegen raus: Manche Browser liefern mehrere
 * Zwischenpunkte mit demselben Zeitstempel, wenn sie im selben Zug aus dem
 * Treiber kamen. Bliebe einer davon stehen, ginge der Median gegen null und
 * die gemeldete Rate gegen unendlich.
 */
export function touchRate(times: number[]): TouchRate {
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const d = times[i] - times[i - 1];
    if (d > 0 && Number.isFinite(d)) gaps.push(d);
  }
  if (gaps.length < MIN_TOUCH_SAMPLES) {
    return {
      hz: 0,
      nearest: null,
      medianMs: 0,
      count: gaps.length,
      conclusive: false,
    };
  }
  const med = median(gaps);
  const hz = med > 0 ? 1000 / med : 0;
  return {
    hz,
    nearest: nearestTouchRate(hz),
    medianMs: med,
    count: gaps.length,
    conclusive: true,
  };
}

/** Die Verzögerung in Worten – beschreibend, ohne Note. */
export function latencyReading(s: LatencySummary): string {
  if (!s.count) return "Noch keine Berührung gemessen.";
  const total = s.totalMs.toFixed(1).replace(".", ",");
  const anteil =
    s.frameMs > s.queueMs
      ? "Der größere Teil geht dabei aufs Zeichnen des nächsten Bildes"
      : "Der größere Teil geht dabei auf die Warteschlange des Browsers";
  return `${total} ms vom Ereignis bis zum fertigen Bild, aus ${s.count} Berührungen. ${anteil}. Was Panel und Bildschirm davor und danach brauchen, steckt nicht darin – der Wert ist eine Untergrenze.`;
}

export function touchRateReading(r: TouchRate): string {
  if (!r.conclusive) {
    return `Erst ${r.count} von ${MIN_TOUCH_SAMPLES} Zwischenpunkten – wischen Sie länger und ohne abzusetzen.`;
  }
  if (r.nearest) {
    return `Der Digitizer meldet ${r.nearest} Mal je Sekunde. Nach oben ist das belastbar: Wer ${r.nearest} misst, hat ein Panel, das ${r.nearest} kann.`;
  }
  return `Der Digitizer meldet ${r.hz.toFixed(0)} Mal je Sekunde – keiner üblichen Abtastrate nahe genug, um sie zu behaupten.`;
}
