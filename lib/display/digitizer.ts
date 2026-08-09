/**
 * Der Digitizer-Prüfstand – wo der Touchscreen nichts mehr merkt.
 *
 * Der Geräte-Check oben auf /check hat einen Touch-Punkt, und der zählt
 * bestrichene Felder. Das reicht für ein Häkchen, aber es beantwortet die
 * Frage nicht, die jemand mit gesprungenem Display tatsächlich hat: *Wo*
 * reagiert er nicht mehr?
 *
 * ## Das Problem mit der Lücke
 *
 * Ein nicht bestrichenes Feld heißt zunächst gar nichts. Es kann eine tote
 * Zone sein – oder schlicht eine Stelle, über die der Finger nicht gelaufen
 * ist. Die beiden zu verwechseln wäre genau die Sorte Behauptung, die dieses
 * Projekt sonst vermeidet: Wer langsam über die Mitte wischt und die Ränder
 * auslässt, bekäme „30 % tot“ gemeldet und ginge mit einem Schreck nach
 * Hause, den die Messung nicht hergibt.
 *
 * Unterscheiden lässt sich beides an der Form. Wer eine Fläche bestreicht,
 * hört irgendwo auf – und alles, was er auslässt, hängt am Rand. Eine tote
 * Zone dagegen liegt **mitten im** bestrichenen Gebiet: Der Finger ist
 * darübergelaufen, gemeldet wurde nichts. Also gilt als verdächtig nur, was
 * von bestrichenen Feldern vollständig **eingeschlossen** ist.
 *
 * Gefunden wird das mit einer Flutfüllung vom Rand her: Alles Unbestrichene,
 * das vom Rand aus über Unbestrichenes erreichbar ist, ist „nicht geprüft“.
 * Was übrigbleibt, ist ein Loch – und nur das wird angezeigt.
 *
 * Das ist bewusst vorsichtig. Eine tote Zone, die bis an den Rand reicht,
 * findet dieses Verfahren nicht; sie sieht aus wie eine ausgelassene Ecke.
 * Lieber ein übersehenes Loch als ein erfundenes: Der Befund führt zu einem
 * Kostenvoranschlag über ein neues Display.
 */

/** Spalten des Rasters. */
export const COLS = 12;

/** Zeilen des Rasters. Zusammen 96 Felder – fein genug, dass eine tote Zone
    von der Größe einer Fingerkuppe auffällt, grob genug, dass ein Mensch die
    Fläche in ein paar Sekunden bestreichen kann. */
export const ROWS = 8;

/** Ab wie viel bestrichener Fläche eine Auswertung überhaupt etwas taugt.
    Darunter ist die Aussage „keine Löcher gefunden“ wertlos – man hat ja
    kaum gesucht. */
export const MIN_COVERAGE = 0.6;

/**
 * Feldnummer zu einem Punkt.
 *
 * Die Ränder werden hineingeklemmt: Ein Punkt genau auf der rechten Kante
 * ergäbe sonst Spalte `cols` und damit eine Nummer, die es nicht gibt – und
 * die Ecke, die am ehesten kaputt ist, wäre die einzige ohne Feld.
 */
export function cellIndex(
  x: number,
  y: number,
  width: number,
  height: number,
  cols = COLS,
  rows = ROWS,
): number {
  if (width <= 0 || height <= 0) return 0;
  const cx = clamp(Math.floor((x / width) * cols), 0, cols - 1);
  const cy = clamp(Math.floor((y / height) * rows), 0, rows - 1);
  return cy * cols + cx;
}

/** Anteil der bestrichenen Felder (0 … 1). */
export function coverage(covered: Iterable<number>, cols = COLS, rows = ROWS): number {
  const set = covered instanceof Set ? covered : new Set(covered);
  const total = cols * rows;
  if (total <= 0) return 0;
  return Math.min(1, set.size / total);
}

/**
 * Die eingeschlossenen Löcher.
 *
 * Flutfüllung vom Rand über unbestrichene Felder (Vierer-Nachbarschaft).
 * Was danach unbestrichen und ungeflutet ist, liegt vollständig im
 * bestrichenen Gebiet.
 *
 * Ein leeres Raster liefert eine leere Liste – nicht 96 Löcher. Das ist der
 * wichtigste Einzelfall: Wer nichts tut, hat kein totes Display.
 */
export function enclosedGaps(
  covered: Iterable<number>,
  cols = COLS,
  rows = ROWS,
): number[] {
  const set = covered instanceof Set ? covered : new Set(covered);
  const total = cols * rows;
  const reached = new Uint8Array(total);
  const stack: number[] = [];

  const push = (index: number) => {
    if (index < 0 || index >= total) return;
    if (reached[index] || set.has(index)) return;
    reached[index] = 1;
    stack.push(index);
  };

  // Alle Randfelder als Startpunkte.
  for (let c = 0; c < cols; c++) {
    push(c);
    push((rows - 1) * cols + c);
  }
  for (let r = 0; r < rows; r++) {
    push(r * cols);
    push(r * cols + cols - 1);
  }

  while (stack.length) {
    const index = stack.pop()!;
    const c = index % cols;
    const r = (index - c) / cols;
    if (c > 0) push(index - 1);
    if (c < cols - 1) push(index + 1);
    if (r > 0) push(index - cols);
    if (r < rows - 1) push(index + cols);
  }

  const out: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!set.has(i) && !reached[i]) out.push(i);
  }
  return out;
}

export interface DigitizerResult {
  /** Anteil der bestrichenen Fläche. */
  coverage: number;
  /** Eingeschlossene, nicht meldende Felder. */
  gaps: number[];
  /** Gleichzeitig erkannte Berührungen. */
  maxPoints: number;
  /** Reichte die bestrichene Fläche für eine Aussage? */
  conclusive: boolean;
}

export function evaluate(
  covered: Iterable<number>,
  maxPoints: number,
  cols = COLS,
  rows = ROWS,
): DigitizerResult {
  const set = covered instanceof Set ? covered : new Set(covered);
  const cov = coverage(set, cols, rows);
  return {
    coverage: cov,
    gaps: enclosedGaps(set, cols, rows),
    maxPoints,
    conclusive: cov >= MIN_COVERAGE,
  };
}

/**
 * Der Befund in Worten.
 *
 * Drei Fälle, und der erste ist der wichtigste: Zu wenig bestrichen heißt
 * „noch mal“, nicht „in Ordnung“. Ein Werkzeug, das bei halber Prüfung
 * Entwarnung gibt, ist schlimmer als keins.
 */
export function reading(result: DigitizerResult): string {
  const percent = Math.round(result.coverage * 100);
  if (!result.conclusive) {
    return `Erst ${percent} % bestrichen – für eine Aussage zu wenig. Fahren Sie die ganze Fläche ab, auch die Ecken.`;
  }
  if (result.gaps.length === 0) {
    return `${percent} % bestrichen, keine eingeschlossene Lücke. Auf der geprüften Fläche hat jede Berührung gemeldet.`;
  }
  if (result.gaps.length === 1) {
    return `${percent} % bestrichen – ein Feld mitten im geprüften Gebiet hat nicht gemeldet.`;
  }
  return `${percent} % bestrichen – ${result.gaps.length} Felder mitten im geprüften Gebiet haben nicht gemeldet.`;
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}
