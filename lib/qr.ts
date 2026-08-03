/*
  QR-Encoder – vollständig eigenimplementiert, ohne Abhängigkeit.

  Warum selbst geschrieben: Der Code läuft im Browser des Besuchers, oft
  offline, und er kodiert einen Kostenvoranschlag. Eine Bibliothek dafür
  nachzuladen wäre mehr Gewicht als der Rest der Seite – und ein QR-Code ist
  ein exakt spezifiziertes Verfahren, kein Ratespiel.

  Umfang: Byte-Modus (UTF-8), Fehlerkorrektur M (bis zu 15 % Verlust
  wiederherstellbar – die Stufe, die auch auf Papier robust bleibt),
  Versionen 1–20. Das reicht für 669 Byte, weit mehr als jede Ticket-URL.

  Referenz: ISO/IEC 18004. Die Schritte folgen der Norm in dieser Reihenfolge:
  kodieren → auffüllen → Reed-Solomon → verschachteln → platzieren →
  maskieren → Formatinformation.
*/

/** Datencodewörter je Version bei Fehlerkorrekturstufe M. */
const DATA_CODEWORDS_M = [
  16, 28, 44, 64, 86, 108, 124, 154, 182, 216, 254, 290, 334, 365, 415, 453,
  507, 563, 627, 669,
];

/**
 * Blockaufteilung je Version bei Stufe M:
 * [EC-Codewörter je Block, Blöcke Gruppe 1, Datenwörter Gruppe 1,
 *  Blöcke Gruppe 2, Datenwörter Gruppe 2].
 */
const BLOCKS_M: [number, number, number, number, number][] = [
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
  [30, 1, 50, 4, 51],
  [22, 6, 36, 2, 37],
  [22, 8, 37, 1, 38],
  [24, 4, 40, 5, 41],
  [24, 5, 41, 5, 42],
  [28, 7, 45, 3, 46],
  [28, 10, 46, 1, 47],
  [26, 9, 43, 4, 44],
  [26, 3, 44, 11, 45],
  [26, 3, 41, 13, 42],
];

/** Mittelpunkte der Ausrichtungsmuster je Version (Version 1 hat keine). */
const ALIGNMENT: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

/* ---- Galois-Feld GF(256), Primpolynom 0x11D ---------------------------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Generatorpolynom für n Fehlerkorrektur-Codewörter. */
function generatorPoly(n: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < n; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon-Rest: die Fehlerkorrektur-Codewörter eines Datenblocks. */
function ecCodewords(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = generatorPoly(ecLen);
  const rest = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ rest[0];
    rest.copyWithin(0, 1);
    rest[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < ecLen; i++) {
        rest[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return rest;
}

/* ---- Bitstrom ---------------------------------------------------------- */

class BitBuffer {
  private bits: number[] = [];

  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }

  get length() {
    return this.bits.length;
  }

  /** Auf Byte-Grenze auffüllen und als Codewörter ausgeben. */
  toCodewords(totalDataCodewords: number): Uint8Array {
    const capacity = totalDataCodewords * 8;
    // Abschlusszeichen: bis zu vier Nullbits.
    const terminator = Math.min(4, capacity - this.bits.length);
    for (let i = 0; i < terminator; i++) this.bits.push(0);
    while (this.bits.length % 8 !== 0) this.bits.push(0);

    const out = new Uint8Array(totalDataCodewords);
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | this.bits[i + j];
      out[i / 8] = byte;
    }
    // Füllbytes laut Norm, abwechselnd 0xEC / 0x11.
    for (let i = this.bits.length / 8; i < totalDataCodewords; i++) {
      out[i] = (i - this.bits.length / 8) % 2 === 0 ? 0xec : 0x11;
    }
    return out;
  }
}

/* ---- Formatinformation ------------------------------------------------- */

/** BCH(15,5) für die Formatinformation, danach Maske 0x5412. */
function formatBits(mask: number): number {
  // Fehlerkorrekturstufe M entspricht dem Bitmuster 00.
  const data = (0b00 << 3) | mask;
  let rest = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rest >>> i) & 1) rest ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rest) ^ 0x5412;
}

/** BCH(18,6) für die Versionsinformation (ab Version 7). */
function versionBits(version: number): number {
  let rest = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rest >>> i) & 1) rest ^= 0x1f25 << (i - 12);
  }
  return (version << 12) | rest;
}

/* ---- Matrix ------------------------------------------------------------ */

type Matrix = { size: number; modules: Int8Array; reserved: Uint8Array };

function createMatrix(size: number): Matrix {
  return {
    size,
    modules: new Int8Array(size * size),
    reserved: new Uint8Array(size * size),
  };
}

function setModule(m: Matrix, x: number, y: number, dark: boolean, reserve = true) {
  m.modules[y * m.size + x] = dark ? 1 : 0;
  if (reserve) m.reserved[y * m.size + x] = 1;
}

function placeFinder(m: Matrix, ox: number, oy: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = ox + dx;
      const y = oy + dy;
      if (x < 0 || y < 0 || x >= m.size || y >= m.size) continue;
      const inRing = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const isBorder = inRing && (dx === 0 || dx === 6 || dy === 0 || dy === 6);
      const isCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      setModule(m, x, y, isBorder || isCore);
    }
  }
}

function placeAlignment(m: Matrix, version: number) {
  const centers = ALIGNMENT[version - 1];
  for (const cy of centers) {
    for (const cx of centers) {
      // Die drei Ecken tragen bereits Suchmuster.
      const nearFinder =
        (cx <= 8 && cy <= 8) ||
        (cx <= 8 && cy >= m.size - 9) ||
        (cx >= m.size - 9 && cy <= 8);
      if (nearFinder) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          setModule(m, cx + dx, cy + dy, ring !== 1);
        }
      }
    }
  }
}

function placeStatic(m: Matrix, version: number) {
  placeFinder(m, 0, 0);
  placeFinder(m, m.size - 7, 0);
  placeFinder(m, 0, m.size - 7);

  // Taktmuster
  for (let i = 8; i < m.size - 8; i++) {
    const dark = i % 2 === 0;
    setModule(m, i, 6, dark);
    setModule(m, 6, i, dark);
  }

  placeAlignment(m, version);

  // Bereiche der Formatinformation reservieren. Die Formatinformation steht
  // zweimal im Code: einmal um das linke obere Suchmuster (15 Module) und
  // einmal aufgeteilt auf die beiden anderen – dort 8 Module waagerecht und
  // 7 senkrecht. Das achte senkrechte Modul gehört NICHT dazu: es ist das
  // stets dunkle Modul und wird gleich danach gesetzt.
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setModule(m, i, 8, false);
      setModule(m, 8, i, false);
    }
  }
  for (let i = 0; i < 8; i++) setModule(m, m.size - 1 - i, 8, false);
  for (let i = 0; i < 7; i++) setModule(m, 8, m.size - 1 - i, false);

  // Immer dunkles Modul
  setModule(m, 8, m.size - 8, true);

  // Versionsinformation ab Version 7
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + m.size - 11;
      setModule(m, a, b, dark);
      setModule(m, b, a, dark);
    }
  }
}

/** Datenbits im Zickzack von rechts unten nach oben einsetzen. */
function placeData(m: Matrix, codewords: Uint8Array) {
  let bitIndex = 0;
  let upward = true;

  for (let right = m.size - 1; right > 0; right -= 2) {
    // Die senkrechte Taktspalte wird übersprungen.
    if (right === 6) right = 5;
    for (let step = 0; step < m.size; step++) {
      const y = upward ? m.size - 1 - step : step;
      for (let col = 0; col < 2; col++) {
        const x = right - col;
        if (m.reserved[y * m.size + x]) continue;
        const byte = codewords[bitIndex >>> 3];
        const bit = byte === undefined ? 0 : (byte >>> (7 - (bitIndex & 7))) & 1;
        m.modules[y * m.size + x] = bit;
        bitIndex++;
      }
    }
    upward = !upward;
  }
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(m: Matrix, mask: number): Matrix {
  const out: Matrix = {
    size: m.size,
    modules: Int8Array.from(m.modules),
    reserved: m.reserved,
  };
  const fn = MASKS[mask];
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (m.reserved[y * m.size + x]) continue;
      if (fn(x, y)) out.modules[y * m.size + x] ^= 1;
    }
  }
  return out;
}

function placeFormat(m: Matrix, mask: number) {
  const bits = formatBits(mask);
  for (let i = 0; i < 15; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    // Erste Kopie: um das linke obere Suchmuster.
    if (i < 6) setModule(m, 8, i, dark);
    else if (i < 8) setModule(m, 8, i + 1, dark);
    else if (i === 8) setModule(m, 7, 8, dark);
    else setModule(m, 14 - i, 8, dark);

    // Zweite Kopie: geteilt auf die beiden anderen Suchmuster.
    if (i < 8) setModule(m, m.size - 1 - i, 8, dark);
    else setModule(m, 8, m.size - 15 + i, dark);
  }
}

/** Bewertung laut Norm – je niedriger, desto besser lesbar. */
function penalty(m: Matrix): number {
  const { size, modules } = m;
  const at = (x: number, y: number) => modules[y * size + x];
  let score = 0;

  // Regel 1: Folgen gleicher Farbe ab fünf Modulen.
  for (let i = 0; i < size; i++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const cur = horizontal ? at(j, i) : at(i, j);
        const prev = horizontal ? at(j - 1, i) : at(i, j - 1);
        if (cur === prev) {
          run++;
        } else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Regel 2: gleichfarbige 2×2-Blöcke.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v = at(x, y);
      if (v === at(x + 1, y) && v === at(x, y + 1) && v === at(x + 1, y + 1)) {
        score += 3;
      }
    }
  }

  // Regel 3: Muster, die einem Suchmuster ähneln.
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        if (x + dx * 10 >= size || y + dy * 10 >= size) continue;
        let m1 = true;
        let m2 = true;
        for (let k = 0; k < 11; k++) {
          const v = at(x + dx * k, y + dy * k);
          if (v !== p1[k]) m1 = false;
          if (v !== p2[k]) m2 = false;
        }
        if (m1) score += 40;
        if (m2) score += 40;
      }
    }
  }

  // Regel 4: Abweichung vom hälftigen Dunkelanteil.
  let dark = 0;
  for (let i = 0; i < modules.length; i++) dark += modules[i];
  const ratio = (dark * 100) / modules.length;
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

/* ---- Öffentliche Schnittstelle ----------------------------------------- */

export interface QrResult {
  /** Kantenlänge in Modulen (ohne Ruhezone). */
  size: number;
  /** true = dunkles Modul. Zeilenweise, Länge size × size. */
  modules: boolean[];
  version: number;
}

/**
 * Kodiert Text als QR-Code (Byte-Modus, Fehlerkorrektur M).
 * Wirft, wenn der Text die Kapazität von Version 20 übersteigt.
 */
export function encodeQr(text: string): QrResult {
  const bytes = new TextEncoder().encode(text);

  // Kleinste Version wählen, die Modusanzeiger, Längenfeld und Daten fasst.
  let version = 0;
  for (let v = 1; v <= 20; v++) {
    const countBits = v <= 9 ? 8 : 16;
    const needed = 4 + countBits + bytes.length * 8;
    if (needed <= DATA_CODEWORDS_M[v - 1] * 8) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    throw new Error("QR: Inhalt zu lang für Version 20 bei Stufe M.");
  }

  const buffer = new BitBuffer();
  buffer.put(0b0100, 4); // Byte-Modus
  buffer.put(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) buffer.put(byte, 8);

  const dataCodewords = buffer.toCodewords(DATA_CODEWORDS_M[version - 1]);

  // In Blöcke teilen, je Block die Fehlerkorrektur rechnen.
  const [ecLen, g1Count, g1Size, g2Count, g2Size] = BLOCKS_M[version - 1];
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < g1Count + g2Count; i++) {
    const size = i < g1Count ? g1Size : g2Size;
    const block = dataCodewords.subarray(offset, offset + size);
    offset += size;
    dataBlocks.push(block);
    ecBlocks.push(ecCodewords(block, ecLen));
  }

  // Verschachteln: erst spaltenweise die Daten, dann die Fehlerkorrektur.
  const interleaved: number[] = [];
  const maxData = Math.max(g1Size, g2Size);
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of ecBlocks) interleaved.push(block[i]);
  }

  const size = version * 4 + 17;
  const base = createMatrix(size);
  placeStatic(base, version);
  placeData(base, Uint8Array.from(interleaved));

  // Die Maske mit der niedrigsten Bewertung gewinnt.
  let best: Matrix | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = applyMask(base, mask);
    placeFormat(candidate, mask);
    const s = penalty(candidate);
    if (s < bestScore) {
      bestScore = s;
      best = candidate;
    }
  }

  const chosen = best!;
  return {
    size,
    version,
    modules: Array.from(chosen.modules, (v) => v === 1),
  };
}

/**
 * Rendert den Code als SVG-Pfad. Ein einziger Pfad statt tausender Rechtecke –
 * das hält das Markup klein und den Browser ruhig.
 *
 * @param quiet Ruhezone in Modulen (Norm: 4).
 */
export function qrToPath(qr: QrResult, quiet = 4): { d: string; extent: number } {
  const parts: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y * qr.size + x]) {
        parts.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
      }
    }
  }
  return { d: parts.join(""), extent: qr.size + quiet * 2 };
}
