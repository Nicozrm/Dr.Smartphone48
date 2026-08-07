/**
 * Das Signaturbild – die Unterschrift bekommt ein Gesicht.
 *
 * Eine 64 Byte lange Signatur ist als Zahlenkolonne unlesbar und als
 * base64-Zeichenkette nur unwesentlich besser. Niemand vergleicht 87
 * Zeichen; alle tun so, als hätten sie es getan. Deshalb wird sie hier
 * **gezeichnet**: 64 Speichen, eine je Byte, ihre Länge ist der Wert.
 *
 * Das Bild ist keine Verzierung und kein Hash des Hashes. Es ist die
 * Signatur selbst, in Polarkoordinaten. Wer zwei Bilder nebeneinander legt,
 * sieht in einem Bruchteil einer Sekunde, ob sie gleich sind – und
 * ein einziges geändertes Bit im Protokoll ergibt eine völlig andere
 * Figur, weil ECDSA für jede Eingabe eine neue Signatur liefert.
 *
 * Die Formensprache ist geborgt, wo sie hingehört: Der Ring aus Speichen und
 * die eingeschriebene Rosette sind dieselbe Technik wie die Guilloche im
 * Briefkopf des Rechnungswerkzeugs – Wertpapierdruck. Reines SVG, kein
 * Bildmaterial, keine Bibliothek.
 *
 * Was das Bild **nicht** ist: ein Prüfmerkmal für sich. Es zu fälschen ist
 * trivial, denn es steckt keine Information darin, die nicht schon im Code
 * steht. Es ist eine Lesehilfe für ein Ergebnis, das die Mathematik daneben
 * liefert. Auf der Prüfseite steht es deshalb nie ohne den Befund.
 */

/** Kantenlänge des Koordinatensystems. */
export const GLYPH_EXTENT = 220;

const CENTER = GLYPH_EXTENT / 2;
const INNER = 40;
const OUTER = 94;

export interface Glyph {
  /** Die 64 Speichen als ein einziger Pfad. */
  spokes: string;
  /** Die geglättete Hüllkurve durch die Speichenspitzen. */
  hull: string;
  /** Eine zweite, halb so weite Kurve – gibt der Figur Tiefe. */
  inner: string;
  /** Radius der Nabe, auf der alle Speichen beginnen. */
  hub: number;
  extent: number;
}

interface Point {
  x: number;
  y: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Geschlossene Catmull-Rom-Kurve, in kubische Béziers übersetzt.
 * Ein Polygon aus 64 Ecken sieht aus wie ein Sägeblatt; dieselben Punkte
 * weich verbunden ergeben die Rosette, die man wiedererkennt.
 *
 * Der Teiler bestimmt, wie stark die Kurve zwischen zwei Punkten ausholt.
 * Der Lehrbuchwert ist 6; bei 64 dicht beieinanderliegenden Punkten mit
 * großem radialem Unterschied schießt sie damit über die Spitzen hinaus und
 * die Figur bekommt Zacken, die nicht in den Daten stehen. 9 hält die Kurve
 * an den Punkten – gezeigt wird die Signatur, nicht der Interpolationsfehler.
 */
const TENSION = 9;

function closedCurve(points: Point[]): string {
  const n = points.length;
  if (n < 3) return "";
  const at = (i: number) => points[((i % n) + n) % n];

  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / TENSION;
    const c1y = p1.y + (p2.y - p0.y) / TENSION;
    const c2x = p2.x - (p3.x - p1.x) / TENSION;
    const c2y = p2.y - (p3.y - p1.y) / TENSION;
    d +=
      `C${round(c1x)} ${round(c1y)},${round(c2x)} ${round(c2y)},` +
      `${round(p2.x)} ${round(p2.y)}`;
  }
  return `${d}Z`;
}

/**
 * Erzeugt das Signaturbild. Nimmt beliebig viele Bytes entgegen; gebraucht
 * werden die 64 der Signatur, aber ein Ausschnitt zeichnet sich genauso.
 */
export function signatureGlyph(signature: Uint8Array): Glyph {
  const count = signature.length;
  if (count === 0) {
    return { spokes: "", hull: "", inner: "", hub: INNER, extent: GLYPH_EXTENT };
  }

  const tips: Point[] = [];
  const mids: Point[] = [];
  const spokes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Bei -90° beginnen, damit das erste Byte oben steht: Ein Bild, dessen
    // Anfang man kennt, lässt sich vergleichen.
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const reach = INNER + (signature[i] / 255) * (OUTER - INNER);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const from = { x: CENTER + cos * INNER, y: CENTER + sin * INNER };
    const to = { x: CENTER + cos * reach, y: CENTER + sin * reach };
    spokes.push(
      `M${round(from.x)} ${round(from.y)}L${round(to.x)} ${round(to.y)}`,
    );
    tips.push(to);

    // Die innere Kurve läuft um ein halbes Feld versetzt und auf halber
    // Auslenkung. Dadurch schneidet sie die Hüllkurve, statt ihr zu folgen –
    // erst das ergibt das Geflecht.
    const midAngle = angle + Math.PI / count;
    const midReach = INNER * 0.6 + ((reach - INNER) / 2) * 0.9;
    mids.push({
      x: CENTER + Math.cos(midAngle) * midReach,
      y: CENTER + Math.sin(midAngle) * midReach,
    });
  }

  return {
    spokes: spokes.join(""),
    hull: closedCurve(tips),
    inner: closedCurve(mids),
    hub: INNER,
    extent: GLYPH_EXTENT,
  };
}

/**
 * Kurzform der Signatur zum Vorlesen – acht Zeichen, in vier und vier.
 *
 * Dasselbe Alphabet wie beim Vorgangscode: ohne I, O, 0 und 1, weil diese
 * vier am Telefon und auf Thermopapier regelmäßig verwechselt werden.
 * Gerechnet wird über die **ganze** Signatur, damit sich jedes geänderte Bit
 * auswirkt und nicht nur die ersten fünf Byte.
 *
 * Diese Kurzform ist eine Bequemlichkeit, keine Prüfung: 32 Bit kann man mit
 * genug Rechenzeit treffen. Verglichen wird sie nur dort, wo die
 * Mathematik daneben schon geurteilt hat.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function fingerprint(signature: Uint8Array): string {
  // FNV-1a über alle Bytes: klein, verteilt gut, hier vollkommen ausreichend.
  let hash = 0x811c9dc5;
  for (const byte of signature) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[(hash >>> (i * 3)) & 31];
    // Nach jedem Zeichen weiterdrehen, sonst wiederholen sich die Bits.
    hash = Math.imul(hash ^ (hash >>> 13), 0x01000193) >>> 0;
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
