/**
 * Der Kamera-Prüfstand – was der Sensor zeigt, wenn niemand hinsieht.
 *
 * Die Kamera ist das teuerste Bauteil eines Smartphones und das einzige, das
 * sich am Tresen praktisch nicht prüfen lässt. Ein Blick auf das Vorschaubild
 * sagt nichts: Die Bildaufbereitung im Gerät ist so gut, dass ein Kratzer auf
 * der Linse erst dann auffällt, wenn die Sonne von der Seite kommt – und ein
 * heißer Bildpunkt erst nachts. Wer ein aufbereitetes Gerät kauft, kauft die
 * Kamera ungeprüft mit.
 *
 * Hier stehen die drei Messungen, die ein Browser tatsächlich hergibt. Alle
 * drei rechnen auf Zahlen, nicht auf Eindrücken, und alle drei können ihre
 * Antwort verweigern.
 *
 * ## 1. Dunkelbild: heiße Bildpunkte und Ausleserauschen
 *
 * Bei abgedeckter Linse muss ein Sensor Schwarz liefern. Was trotzdem
 * leuchtet, ist ein defekter Bildpunkt; wie stark der Rest zappelt, ist das
 * Ausleserauschen. Der entscheidende Unterschied zu einem einzelnen Bild:
 * Gemessen wird über **mehrere Bilder** und je Bildpunkt das **Minimum**. Ein
 * heißer Punkt leuchtet in jedem Bild; ein Lichtschlitz zwischen Finger und
 * Gehäuse leuchtet mal hier, mal dort. Ein einzelnes Bild könnte beide nicht
 * auseinanderhalten – und der Befund „acht defekte Bildpunkte“ wäre dann in
 * Wahrheit ein schlecht abgedeckter Finger.
 *
 * ## 2. Hellbild: Staub, Fett und Kratzer auf der Linse
 *
 * Vor einer gleichmäßig hellen Fläche muss ein Bild gleichmäßig hell sein.
 * Ist es das nicht, liegt etwas davor. Der Haken: Es ist **nie** gleichmäßig
 * hell – jedes Objektiv dunkelt zu den Rändern hin ab (Vignettierung), und
 * das ist kein Mangel, sondern Physik. Wer die Helligkeit gegen einen festen
 * Wert prüft, meldet jedem Gerät vier dunkle Ecken.
 *
 * Verglichen wird deshalb jede Stelle mit **ihrer eigenen Umgebung**: Das
 * Bild wird stark weichgezeichnet, und gesucht wird, wo das scharfe Bild
 * unter seiner eigenen Weichzeichnung liegt. Die Vignettierung ist niederfrequent
 * und steckt in beiden – sie kürzt sich heraus. Ein Staubkorn ist
 * hochfrequent und bleibt stehen.
 *
 * ## 3. Schärfe: läuft der Autofokus noch?
 *
 * Ein verharzter oder gestoßener Autofokus ist die häufigste Kamerareparatur
 * nach dem Displayglas. Messbar ist er über den Laplace-Operator: Die zweite
 * Ableitung des Bildes ist dort groß, wo Kanten sind – und Kanten hat nur ein
 * scharfes Bild. Der Wert wird durch das Quadrat der mittleren Helligkeit
 * geteilt, damit er von der Belichtung unabhängig bleibt: Ein doppelt so
 * helles Bild derselben Szene ist nicht doppelt so scharf.
 *
 * ## Was dieser Prüfstand nicht kann
 *
 * Die Bildaufbereitung im Gerät korrigiert bekannte defekte Bildpunkte
 * bereits im Sensor-Chip, bevor irgendein Browser etwas zu sehen bekommt. Ein
 * sauberes Dunkelbild beweist also nicht, dass der Sensor makellos ist – es
 * beweist, dass **kein unkorrigierter** Fehler übrig ist. Das ist genau die
 * Aussage, die einen Käufer interessiert, und es ist eine kleinere Aussage,
 * als sie klingt. Sie steht auf der Seite dabei.
 */

/* ---- Grundrechenarten ---------------------------------------------------- */

/**
 * Helligkeit aus Rot, Grün und Blau nach Rec. 709.
 *
 * Nicht der Mittelwert der drei Kanäle: Das menschliche Auge und jeder
 * Bildsensor gewichten Grün am stärksten. Für die Suche nach heißen
 * Bildpunkten wäre der Mittelwert sogar aktiv schädlich – ein defekter Punkt
 * sitzt in genau einem Farbkanal des Bayer-Musters, und ein Drittel eines
 * hellen Ausschlags kann unter der Schwelle verschwinden.
 */
export function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Ein ganzes RGBA-Bild in eine Helligkeitsfläche (0 … 1). */
export function grayFrom(data: ArrayLike<number>, pixels: number): Float32Array {
  const out = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    out[i] = luma(data[o], data[o + 1], data[o + 2]);
  }
  return out;
}

/**
 * Verkleinern durch Mittelung ganzer Kacheln (Box-Filter).
 *
 * Kein Nächster-Nachbar: Der überspränge beim Verkleinern um den Faktor 20
 * neunzehn von zwanzig Bildpunkten, und ein Staubkorn läge mit hoher
 * Wahrscheinlichkeit in einem der übersprungenen. Gemittelt wird über alles,
 * damit nichts verlorengeht – ein Korn wird schwächer, aber es bleibt.
 */
export function downsample(
  gray: ArrayLike<number>,
  width: number,
  height: number,
  cols: number,
  rows: number,
): Float32Array {
  const out = new Float32Array(cols * rows);
  if (width <= 0 || height <= 0 || cols <= 0 || rows <= 0) return out;

  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor((r * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * height) / rows));
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * width) / cols));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1 && y < height; y++) {
        const row = y * width;
        for (let x = x0; x < x1 && x < width; x++) {
          sum += gray[row + x];
          n++;
        }
      }
      out[r * cols + c] = n > 0 ? sum / n : 0;
    }
  }
  return out;
}

/**
 * Die erwartete Helligkeit als angepasste Fläche zweiter Ordnung.
 *
 * Hier stand zuerst eine Weichzeichnung: jede Kachel gegen den Mittelwert
 * ihrer Umgebung. Das ist das naheliegende Verfahren und am Bildrand
 * nachweislich falsch. Ein Fenster, das über den Rand hinausragt, wird dort
 * abgeschnitten und mittelt deshalb überwiegend über Kacheln, die **weiter
 * innen** liegen – und weiter innen ist heller. Jede Randkachel liegt damit
 * unter ihrer eigenen Umgebung, und zwar systematisch. Der Selbsttest
 * meldete an einer makellosen Wand vier dunkle Ecken: die Vignettierung,
 * verkleidet als Befund.
 *
 * Der Ausweg ist kein anderer Radius, sondern ein anderes Modell. Die
 * Abdunklung eines Objektivs zum Rand hin ist nichts Zufälliges, das man
 * wegmitteln müsste – sie ist eine glatte, um die Mitte herum gewölbte
 * Fläche. Also wird genau so eine angepasst: sechs Zahlen für das ganze
 * Bild (1, x, y, x², xy, y²), bestimmt nach der Methode der kleinsten
 * Quadrate. Ein Staubkorn auf drei von dreitausend Kacheln kann sechs
 * Zahlen nicht nennenswert verbiegen; die Wölbung des Objektivs bestimmt sie
 * vollständig. Am Rand gibt es dabei keine Bevorzugung, weil es kein Fenster
 * gibt.
 *
 * `weights` erlaubt einen zweiten Durchgang, in dem die im ersten gefundenen
 * Verdächtigen nicht mehr mitreden – sonst zöge ein großer Fettfleck das
 * Modell zu sich herunter und machte sich selbst unsichtbar.
 */
export function fitSurface(
  field: ArrayLike<number>,
  cols: number,
  rows: number,
  weights?: ArrayLike<number>,
): Float32Array {
  const out = new Float32Array(cols * rows);
  if (cols < 3 || rows < 3) {
    for (let i = 0; i < out.length; i++) out[i] = field[i] ?? 0;
    return out;
  }

  /* Auf −1 … 1 normierte Koordinaten. Mit rohen Kachelnummern stünden in der
     Normalengleichung Zahlen bis 64⁴ neben Zahlen um 1, und die Lösung wäre
     eine Frage der Gleitkomma-Laune. */
  const nx = (c: number) => (2 * c) / (cols - 1) - 1;
  const ny = (r: number) => (2 * r) / (rows - 1) - 1;

  const M = 6;
  const ata = Array.from({ length: M }, () => new Float64Array(M));
  const atb = new Float64Array(M);
  const basis = new Float64Array(M);

  for (let r = 0; r < rows; r++) {
    const y = ny(r);
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const w = weights ? weights[i] : 1;
      if (!(w > 0)) continue;
      const x = nx(c);
      basis[0] = 1;
      basis[1] = x;
      basis[2] = y;
      basis[3] = x * x;
      basis[4] = x * y;
      basis[5] = y * y;
      const v = field[i];
      for (let a = 0; a < M; a++) {
        atb[a] += w * basis[a] * v;
        for (let b = 0; b < M; b++) ata[a][b] += w * basis[a] * basis[b];
      }
    }
  }

  const coeff = solve(ata, atb, M);
  if (!coeff) {
    /* Nicht lösbar – etwa, wenn zu wenige Kacheln mitreden dürfen. Dann ist
       der Mittelwert das ehrlichste Modell: eine waagerechte Fläche. */
    let sum = 0;
    let n = 0;
    for (let i = 0; i < cols * rows; i++) {
      const w = weights ? weights[i] : 1;
      if (!(w > 0)) continue;
      sum += field[i];
      n++;
    }
    out.fill(n > 0 ? sum / n : 0);
    return out;
  }

  for (let r = 0; r < rows; r++) {
    const y = ny(r);
    for (let c = 0; c < cols; c++) {
      const x = nx(c);
      out[r * cols + c] =
        coeff[0] +
        coeff[1] * x +
        coeff[2] * y +
        coeff[3] * x * x +
        coeff[4] * x * y +
        coeff[5] * y * y;
    }
  }
  return out;
}

/** Gauß-Elimination mit Spaltenpivotisierung. Gibt null zurück, wenn das
    Gleichungssystem entartet ist – geraten wird nicht. */
function solve(a: Float64Array[], b: Float64Array, n: number): Float64Array | null {
  const m = a.map((row) => Float64Array.from(row));
  const y = Float64Array.from(b);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      [m[pivot], m[col]] = [m[col], m[pivot]];
      const t = y[pivot];
      y[pivot] = y[col];
      y[col] = t;
    }
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col];
      if (!f) continue;
      for (let c = col; c < n; c++) m[r][c] -= f * m[col][c];
      y[r] -= f * y[col];
    }
  }

  const out = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let sum = y[r];
    for (let c = r + 1; c < n; c++) sum -= m[r][c] * out[c];
    out[r] = sum / m[r][r];
  }
  return out;
}

/**
 * Zusammenhängende Gruppen aus einer Menge von Feldnummern (Vierer-Nachbarschaft).
 *
 * Zwei Staubkörner nebeneinander sind zwei Körner; ein Korn, das über vier
 * Kacheln reicht, ist eines. Ohne diese Unterscheidung meldete der Prüfstand
 * bei einem Fettfleck „siebzehn Stellen“ – eine Zahl, die den Befund
 * dramatischer aussehen lässt, als er ist.
 *
 * Diagonale Nachbarn zählen nicht. Vier Kacheln, die sich nur an den Ecken
 * berühren, sind bei dieser Auflösung eher zwei Körner als eines.
 */
export function clusters(
  indices: Iterable<number>,
  cols: number,
  rows: number,
): number[][] {
  const set = indices instanceof Set ? indices : new Set(indices);
  const seen = new Set<number>();
  const out: number[][] = [];

  for (const start of set) {
    if (seen.has(start)) continue;
    const group: number[] = [];
    const stack = [start];
    seen.add(start);

    while (stack.length) {
      const index = stack.pop()!;
      group.push(index);
      const c = index % cols;
      const r = (index - c) / cols;
      const push = (next: number) => {
        if (!set.has(next) || seen.has(next)) return;
        seen.add(next);
        stack.push(next);
      };
      if (c > 0) push(index - 1);
      if (c < cols - 1) push(index + 1);
      if (r > 0) push(index - cols);
      if (r < rows - 1) push(index + cols);
    }
    out.push(group.sort((a, b) => a - b));
  }

  return out.sort((a, b) => b.length - a.length || a[0] - b[0]);
}

/* ---- 1. Dunkelbild ------------------------------------------------------- */

/**
 * Wie viele Bilder das Dunkelbild sammelt.
 *
 * Unter acht wird das Minimum je Bildpunkt zur Glückssache: Ein Lichtschlitz,
 * der drei Bilder lang zu sieht, überlebt eine Messung aus vier Bildern.
 * Zwölf Bilder sind bei 30 Bildern je Sekunde vier Zehntelsekunden – kurz
 * genug, dass eine Hand ruhig bleibt.
 */
export const DARK_FRAMES = 12;

/** Weniger als so viele Bilder ergeben keine Aussage. */
export const MIN_DARK_FRAMES = 8;

/**
 * Bis zu welcher mittleren Helligkeit ein Bild als „abgedeckt“ gilt.
 *
 * Darüber ist es kein Dunkelbild, sondern ein Zimmer. Der Wert ist großzügig:
 * Kein Finger deckt vollständig ab, und rote Haut vor der Linse liefert
 * durchaus 8 % Helligkeit. Alles darüber ist aber keine Messung mehr,
 * sondern eine Schätzung mit Zahlen dran.
 */
export const DARK_MAX_LEVEL = 0.12;

/**
 * Wie weit ein Bildpunkt über dem Dunkelwert liegen muss, um als heiß zu
 * gelten – und wo die absolute Untergrenze liegt.
 *
 * Beide Bedingungen zusammen, nicht einzeln: Der Abstand allein meldete bei
 * einem perfekt schwarzen Sensor jedes Rauschkorn; die absolute Grenze allein
 * meldete bei einem leicht undichten Finger die ganze helle Seite.
 */
export const HOT_MARGIN = 0.18;
export const HOT_FLOOR = 0.2;

/**
 * Ab welchem Anteil heißer Bildpunkte die Messung sich selbst für ungültig
 * erklärt.
 *
 * Ein Sensor mit einem halben Promille defekter Punkte existiert nicht – wer
 * so etwas misst, hat Licht im Bild und nicht einen kaputten Sensor. Die
 * Grenze ist die zweite Sicherung hinter `DARK_MAX_LEVEL`: Ein schmaler,
 * heller Schlitz kann den Mittelwert unter der Schwelle lassen und trotzdem
 * Tausende Punkte über die Hitzeschwelle heben.
 */
export const MAX_HOT_SHARE = 0.0005;

/** Wie viele heiße Punkte höchstens einzeln zurückgemeldet werden. */
export const HOT_LIST_LIMIT = 64;

export interface DarkAccumulator {
  frames: number;
  pixels: number;
  /** Je Bildpunkt die kleinste bisher gesehene Helligkeit. */
  min: Float32Array;
  sum: Float32Array;
  sumSq: Float32Array;
}

export function createDark(pixels: number): DarkAccumulator {
  const min = new Float32Array(pixels);
  min.fill(Infinity);
  return {
    frames: 0,
    pixels,
    min,
    sum: new Float32Array(pixels),
    sumSq: new Float32Array(pixels),
  };
}

/**
 * Ein Bild dazunehmen.
 *
 * Der Speicher wächst nicht mit der Zahl der Bilder – bei 12 Bildern zu je
 * zwei Millionen Bildpunkten wären das sonst 96 MB im Tab eines Telefons, das
 * gerade zur Reparatur ansteht.
 */
export function addDarkFrame(acc: DarkAccumulator, gray: ArrayLike<number>): void {
  const n = Math.min(acc.pixels, gray.length);
  for (let i = 0; i < n; i++) {
    const v = gray[i];
    if (v < acc.min[i]) acc.min[i] = v;
    acc.sum[i] += v;
    acc.sumSq[i] += v * v;
  }
  acc.frames++;
}

export interface DarkResult {
  frames: number;
  pixels: number;
  /** Mittlere Helligkeit über alle Bilder – der Beleg für „abgedeckt“. */
  level: number;
  /** Mittlere zeitliche Streuung je Bildpunkt: das Ausleserauschen. */
  noise: number;
  /** Zahl der heißen Bildpunkte. */
  hot: number;
  /** Die ersten `HOT_LIST_LIMIT` davon, als Bildpunktnummern. */
  hotPoints: number[];
  /** Reichte die Abdeckung für eine Aussage? */
  conclusive: boolean;
  /** Falls nicht: woran es lag. */
  reason: "zu-hell" | "zu-wenig-bilder" | "streulicht" | null;
}

export function evaluateDark(acc: DarkAccumulator): DarkResult {
  const { frames, pixels } = acc;
  const empty: DarkResult = {
    frames,
    pixels,
    level: 0,
    noise: 0,
    hot: 0,
    hotPoints: [],
    conclusive: false,
    reason: "zu-wenig-bilder",
  };
  if (frames < MIN_DARK_FRAMES || pixels <= 0) return empty;

  let levelSum = 0;
  let noiseSum = 0;
  for (let i = 0; i < pixels; i++) {
    const mean = acc.sum[i] / frames;
    levelSum += mean;
    /* Varianz über die Zeit, je Bildpunkt. Negative Werte kann nur die
       Gleitkomma-Arithmetik erzeugen; sie werden geklemmt, damit die Wurzel
       kein NaN liefert und das Ergebnis stillschweigend verschwindet. */
    const variance = Math.max(0, acc.sumSq[i] / frames - mean * mean);
    noiseSum += Math.sqrt(variance);
  }
  const level = levelSum / pixels;
  const noise = noiseSum / pixels;

  if (level > DARK_MAX_LEVEL) {
    return { ...empty, level, noise, reason: "zu-hell" };
  }

  const threshold = Math.max(level + HOT_MARGIN, HOT_FLOOR);
  let hot = 0;
  const hotPoints: number[] = [];
  for (let i = 0; i < pixels; i++) {
    if (acc.min[i] > threshold) {
      hot++;
      if (hotPoints.length < HOT_LIST_LIMIT) hotPoints.push(i);
    }
  }

  if (hot > pixels * MAX_HOT_SHARE) {
    return { ...empty, level, noise, hot, hotPoints, reason: "streulicht" };
  }

  return {
    frames,
    pixels,
    level,
    noise,
    hot,
    hotPoints,
    conclusive: true,
    reason: null,
  };
}

/* ---- 2. Hellbild --------------------------------------------------------- */

/** Auflösung, auf die das Hellbild heruntergerechnet wird. */
export const FIELD_COLS = 64;
export const FIELD_ROWS = 48;

/**
 * Wie weit eine Kachel unter ihrer Umgebung liegen muss, um als Fleck zu
 * gelten.
 *
 * Sieben Prozent sind auf einem Foto sichtbar, wenn man weiß, wo man suchen
 * muss, und liegen deutlich über dem, was Rauschen nach der Mittelung über
 * eine ganze Kachel übriglässt.
 */
export const FIELD_DROP = 0.07;

/** Unterhalb dieser mittleren Helligkeit ist die Fläche nicht hell genug. */
export const FIELD_MIN_LEVEL = 0.35;

/**
 * Ab welchem Anteil auffälliger Kacheln die Fläche keine Fläche mehr ist.
 *
 * Wer statt einer weißen Wand ein Bücherregal fotografiert, bekommt Hunderte
 * dunkle Stellen gemeldet – und jede davon wäre richtig gerechnet und als
 * Befund vollkommen falsch. Über einem Sechstel wird deshalb nichts gemeldet,
 * sondern um eine ruhigere Fläche gebeten. Dieselbe Regel wie beim
 * Digitizer-Prüfstand, der unter 60 % bestrichener Fläche schweigt.
 */
export const FIELD_MAX_SPOT_SHARE = 1 / 6;

export interface FieldResult {
  /** Mittlere Helligkeit der Fläche. */
  level: number;
  /** Kacheln, die deutlich unter ihrer Umgebung liegen. */
  spots: number[];
  /** Diese Kacheln zu Gruppen zusammengefasst. */
  groups: number[][];
  /** Der stärkste Einbruch, als Anteil (0,12 = 12 % dunkler). */
  worstDrop: number;
  conclusive: boolean;
  reason: "zu-dunkel" | "keine-flaeche" | null;
}

export function evaluateField(
  cells: ArrayLike<number>,
  cols = FIELD_COLS,
  rows = FIELD_ROWS,
): FieldResult {
  const total = cols * rows;
  const empty: FieldResult = {
    level: 0,
    spots: [],
    groups: [],
    worstDrop: 0,
    conclusive: false,
    reason: "zu-dunkel",
  };
  if (total <= 0 || cells.length < total) return empty;

  let sum = 0;
  for (let i = 0; i < total; i++) sum += cells[i];
  const level = sum / total;
  if (level < FIELD_MIN_LEVEL) return { ...empty, level };

  /*
    Zwei Durchgänge, und der zweite ist der wichtige.

    Im ersten reden alle Kacheln mit; ein großer Fettfleck zieht das Modell
    dabei ein Stück zu sich herunter und verkleinert damit seinen eigenen
    Ausschlag. Im zweiten sind die Verdächtigen des ersten stummgeschaltet –
    das Modell beschreibt dann nur noch das Objektiv, und der Fleck steht in
    voller Höhe darüber hinaus.
  */
  const first = fitSurface(cells, cols, rows);
  const weights = new Float32Array(total).fill(1);
  for (let i = 0; i < total; i++) {
    if (first[i] > 0 && 1 - cells[i] / first[i] > FIELD_DROP) weights[i] = 0;
  }
  const model = fitSurface(cells, cols, rows, weights);

  const spots: number[] = [];
  let worstDrop = 0;
  for (let i = 0; i < total; i++) {
    const reference = model[i];
    if (reference <= 0) continue;
    const drop = 1 - cells[i] / reference;
    if (drop > worstDrop) worstDrop = drop;
    if (drop > FIELD_DROP) spots.push(i);
  }

  if (spots.length > total * FIELD_MAX_SPOT_SHARE) {
    return {
      level,
      spots: [],
      groups: [],
      worstDrop,
      conclusive: false,
      reason: "keine-flaeche",
    };
  }

  return {
    level,
    spots,
    groups: clusters(spots, cols, rows),
    worstDrop,
    conclusive: true,
    reason: null,
  };
}

/* ---- 3. Schärfe ---------------------------------------------------------- */

/**
 * Schärfe als Varianz des Laplace-Operators, normiert auf die Belichtung.
 *
 * Der Laplace-Operator ist die zweite Ableitung: In einer gleichmäßigen
 * Fläche ist er null, an einer Kante schlägt er aus. Seine Varianz über das
 * ganze Bild ist damit ein Maß dafür, wie viele scharfe Kanten es gibt – das
 * Standardverfahren der Autofokus-Messung.
 *
 * Geteilt wird durch das Quadrat der mittleren Helligkeit, und das ist
 * wesentlich: Ohne diese Normierung wäre dasselbe Motiv unter heller
 * Beleuchtung „schärfer“. Der Autofokus-Verlauf zeigte dann die
 * Belichtungsautomatik, die im selben Moment mitregelt.
 */
export function sharpness(
  gray: ArrayLike<number>,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3) return 0;

  let mean = 0;
  const n = width * height;
  for (let i = 0; i < n; i++) mean += gray[i];
  mean /= n;
  if (mean <= 0) return 0;

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (!count) return 0;
  const variance = Math.max(0, sumSq / count - (sum / count) ** 2);
  return variance / (mean * mean);
}

export interface FocusSample {
  /** Millisekunden seit Beginn der Messung. */
  t: number;
  value: number;
}

export interface FocusResult {
  /** Höchster gemessener Schärfewert. */
  peak: number;
  /** Wann er erreicht wurde, in Millisekunden. */
  peakAtMs: number;
  /**
   * Wann die Schärfe erstmals 90 % des Höchstwerts erreicht hat.
   *
   * Das ist die Zahl, die ein Mensch als „Fokussierzeit“ erlebt – der Rest
   * des Wegs zum Maximum ist Feinschliff, den niemand abwartet.
   */
  settleMs: number;
  /** Verhältnis vom höchsten zum ersten Wert. */
  gain: number;
  samples: number;
  conclusive: boolean;
}

/**
 * Wie stark die Schärfe zunehmen muss, damit von einem Fokusvorgang die Rede
 * sein kann.
 *
 * Darunter ist nichts passiert – entweder war schon scharf gestellt, oder es
 * ist nichts im Bild, worauf sich scharf stellen ließe. Beides ist kein
 * Befund über den Autofokus, und beides als „fokussiert in 0 ms“ zu melden
 * wäre eine Zahl ohne Inhalt.
 */
export const FOCUS_MIN_GAIN = 1.5;

export function focusSummary(samples: FocusSample[]): FocusResult {
  const clean = samples.filter((s) => Number.isFinite(s.value) && s.value >= 0);
  if (clean.length < 3) {
    return {
      peak: 0,
      peakAtMs: 0,
      settleMs: 0,
      gain: 0,
      samples: clean.length,
      conclusive: false,
    };
  }

  let peak = 0;
  let peakAtMs = 0;
  for (const s of clean) {
    if (s.value > peak) {
      peak = s.value;
      peakAtMs = s.t;
    }
  }

  const first = clean[0].value;
  const gain = first > 0 ? peak / first : 0;
  const target = peak * 0.9;
  let settleMs = peakAtMs;
  for (const s of clean) {
    if (s.value >= target) {
      settleMs = s.t;
      break;
    }
  }

  return {
    peak,
    peakAtMs,
    settleMs,
    gain,
    samples: clean.length,
    conclusive: peak > 0 && gain >= FOCUS_MIN_GAIN,
  };
}

/* ---- Die Befunde in Worten ----------------------------------------------- */

/**
 * Kein Satz urteilt über den Sensor, jeder beschreibt die Messung.
 *
 * Dieselbe Regel wie beim Farbraum-Beweis: Was hier steht, muss aus den
 * Zahlen folgen. „Ihre Kamera ist in Ordnung“ folgt aus einem sauberen
 * Dunkelbild nicht – die Bildaufbereitung des Geräts korrigiert defekte
 * Punkte, bevor der Browser sie sieht.
 */
export function darkReading(r: DarkResult): string {
  if (!r.conclusive) {
    if (r.reason === "zu-wenig-bilder") {
      return "Zu wenige Bilder für eine Aussage.";
    }
    if (r.reason === "streulicht") {
      return "Es fällt Licht ein – die vielen hellen Punkte sind kein Sensorbefund. Decken Sie die Linse vollständig ab.";
    }
    return `Noch zu hell (${Math.round(r.level * 100)} % Helligkeit). Legen Sie einen Finger flach über die Linse, ohne Spalt.`;
  }
  const rauschen = `Ausleserauschen ${(r.noise * 100).toFixed(2)} %.`;
  if (r.hot === 0) {
    return `Über ${r.frames} Bilder kein Bildpunkt, der im Dunkeln leuchtet. ${rauschen}`;
  }
  if (r.hot === 1) {
    return `Ein Bildpunkt leuchtet in jedem der ${r.frames} Bilder. ${rauschen}`;
  }
  return `${r.hot} Bildpunkte leuchten in jedem der ${r.frames} Bilder. ${rauschen}`;
}

export function fieldReading(r: FieldResult): string {
  if (!r.conclusive) {
    if (r.reason === "keine-flaeche") {
      return "Das ist keine gleichmäßige Fläche – zu viele dunkle Stellen, um eine davon der Linse zuzuschreiben. Richten Sie die Kamera auf eine weiße Wand oder den hellen Himmel.";
    }
    return `Noch zu dunkel (${Math.round(r.level * 100)} % Helligkeit). Der Prüfstand braucht eine helle, gleichmäßige Fläche.`;
  }
  if (!r.groups.length) {
    return `Gleichmäßig ausgeleuchtet – keine Stelle liegt mehr als ${Math.round(
      FIELD_DROP * 100,
    )} % unter ihrer Umgebung. Der stärkste Einbruch: ${Math.round(r.worstDrop * 100)} %.`;
  }
  const stellen = r.groups.length === 1 ? "eine Stelle" : `${r.groups.length} Stellen`;
  return `${stellen} liegen deutlich unter der Umgebung, die stärkste um ${Math.round(
    r.worstDrop * 100,
  )} %. Das sitzt vor dem Sensor, nicht darin – Staub, Fett oder ein Kratzer.`;
}

export function focusReading(r: FocusResult): string {
  if (!r.samples) return "Keine Messwerte.";
  if (!r.conclusive) {
    return "Die Schärfe hat sich kaum verändert – entweder war bereits scharf gestellt, oder im Bild ist keine Kante, auf die sich der Autofokus setzen könnte. Halten Sie die Kamera erst dicht an einen Text und ziehen Sie sie dann weg.";
  }
  const faktor = r.gain.toFixed(1).replace(".", ",");
  return `Nach ${Math.round(r.settleMs)} ms stand die Schärfe bei 90 % ihres Höchstwerts, das Maximum bei ${Math.round(
    r.peakAtMs,
  )} ms. Zwischen Anfang und Maximum liegt das ${faktor}-fache.`;
}
