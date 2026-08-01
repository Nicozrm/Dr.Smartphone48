/**
 * QR-Encoder – Byte-Modus, Fehlerkorrektur M, Versionen 1 bis 13.
 *
 * Bewusst ohne Bibliothek: Der GiroCode ist die einzige Stelle der Seite, die
 * einen QR-Code braucht, und der EPC-Standard begrenzt ihn ohnehin auf
 * Fehlerkorrektur M und höchstens Version 13. Dafür eine Abhängigkeit samt
 * Lieferkette einzukaufen, wäre unverhältnismäßig – zumal die Nutzlast einer
 * Zahlungsaufforderung nicht in fremde Hände gehört.
 *
 * Implementiert nach ISO/IEC 18004: Bitstrom, Reed-Solomon über GF(256),
 * Blockverschränkung, Modulplatzierung im Zickzack, alle acht Masken mit
 * Bewertung nach den vier Straffunktionen.
 */

/* ---- Tabellen (Fehlerkorrektur M) ---------------------------------------- */

/** Gesamtzahl der Codewörter je Version (Daten + Fehlerkorrektur). */
const RAW_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532];
/** Fehlerkorrektur-Codewörter je Block. */
const ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22];
/** Anzahl der Fehlerkorrektur-Blöcke. */
const NUM_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9];

/** Mittelpunkte der Ausrichtungsmuster je Version. */
const ALIGN_POS: number[][] = [
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
];

const MAX_VERSION = 13;

/* ---- Galois-Feld GF(256), Primpolynom 0x11D ------------------------------ */

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/** Generatorpolynom vom Grad `degree`. */
function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMul(divisor[i], factor);
    }
  }
  return result;
}

/* ---- Bitstrom ------------------------------------------------------------ */

class BitBuffer {
  readonly bits: number[] = [];

  append(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }
}

/** UTF-8-Kodierung – GiroCode erlaubt daneben auch Latin-1, UTF-8 ist sicherer. */
function toUtf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/* ---- Aufbau -------------------------------------------------------------- */

function dataCodewords(version: number): number {
  const i = version - 1;
  return RAW_CODEWORDS[i] - ECC_PER_BLOCK[i] * NUM_BLOCKS[i];
}

function pickVersion(byteLength: number): number {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const countBits = v <= 9 ? 8 : 16;
    const needed = 4 + countBits + byteLength * 8;
    if (needed <= dataCodewords(v) * 8) return v;
  }
  throw new Error("QR: Nutzlast überschreitet Version 13");
}

function buildCodewords(bytes: number[], version: number): number[] {
  const capacity = dataCodewords(version) * 8;
  const bb = new BitBuffer();
  bb.append(0b0100, 4); // Byte-Modus
  bb.append(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) bb.append(b, 8);

  // Abschlusszeichen, dann auf volle Bytes auffüllen.
  bb.append(0, Math.min(4, capacity - bb.bits.length));
  bb.append(0, (8 - (bb.bits.length % 8)) % 8);

  // Füllbytes im vorgeschriebenen Wechsel.
  for (let pad = 0xec; bb.bits.length < capacity; pad ^= 0xec ^ 0x11) {
    bb.append(pad, 8);
  }

  const words: number[] = [];
  for (let i = 0; i < bb.bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
    words.push(byte);
  }
  return words;
}

/** Fehlerkorrektur anhängen und Blöcke verschränken. */
function addEcc(data: number[], version: number): number[] {
  const i = version - 1;
  const raw = RAW_CODEWORDS[i];
  const eccLen = ECC_PER_BLOCK[i];
  const blocks = NUM_BLOCKS[i];
  const shortLen = Math.floor(raw / blocks);
  const numShort = blocks - (raw % blocks);
  const divisor = rsDivisor(eccLen);

  const chunks: number[][] = [];
  let offset = 0;
  for (let b = 0; b < blocks; b++) {
    const len = shortLen - eccLen + (b < numShort ? 0 : 1);
    const dat = data.slice(offset, offset + len);
    offset += len;
    const ecc = rsRemainder(dat, divisor);
    // Kurze Blöcke bekommen einen Platzhalter, damit die Verschränkung
    // rechteckig bleibt; er wird beim Zusammenfügen wieder übersprungen.
    if (b < numShort) dat.push(0);
    chunks.push([...dat, ...ecc]);
  }

  const result: number[] = [];
  for (let c = 0; c < chunks[0].length; c++) {
    for (let b = 0; b < chunks.length; b++) {
      if (c !== shortLen - eccLen || b >= numShort) result.push(chunks[b][c]);
    }
  }
  return result;
}

/* ---- Matrix -------------------------------------------------------------- */

type Grid = boolean[][];

function drawFunctionPatterns(modules: Grid, fn: Grid, version: number): void {
  const size = modules.length;

  const set = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    fn[y][x] = true;
  };

  // Taktmuster
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Suchmuster inklusive Trennlinie
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          set(x, y, dist !== 2 && dist !== 4);
        }
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // Ausrichtungsmuster – nicht über den Suchmustern
  const pos = ALIGN_POS[version - 1];
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === pos.length - 1) ||
        (i === pos.length - 1 && j === 0);
      if (corner) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Versionsinformation ab Version 7
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // Platzhalter der Formatinformation – Werte folgen je Maske.
  drawFormat(modules, fn, 0, true);
}

function drawFormat(modules: Grid, fn: Grid, mask: number, reserveOnly = false): void {
  const size = modules.length;
  const data = (0b00 << 3) | mask; // Fehlerkorrektur M = 0b00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  const set = (x: number, y: number, i: number) => {
    if (!reserveOnly) modules[y][x] = ((bits >>> i) & 1) !== 0;
    fn[y][x] = true;
  };

  for (let i = 0; i <= 5; i++) set(8, i, i);
  set(8, 7, 6);
  set(8, 8, 7);
  set(7, 8, 8);
  for (let i = 9; i < 15; i++) set(14 - i, 8, i);

  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, i);
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, i);

  // Dieses Modul ist in jedem QR-Code dunkel.
  modules[size - 8][8] = true;
  fn[size - 8][8] = true;
}

function drawCodewords(modules: Grid, fn: Grid, data: number[]): void {
  const size = modules.length;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && i < data.length * 8) {
          modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Straffunktion nach ISO/IEC 18004 – je niedriger, desto lesbarer. */
function penalty(m: Grid): number {
  const size = m.length;
  let score = 0;

  // Regel 1: ab fünf gleichfarbigen Modulen 3 Punkte, je weiteres Modul einer
  // mehr. 3 + (n - 5) ist genau n - 2 – der Dreier steckt bereits darin.
  const runScore = (run: number) => (run >= 5 ? run - 2 : 0);

  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x < size; x++) {
      if (m[y][x] === m[y][x - 1]) run++;
      else {
        score += runScore(run);
        run = 1;
      }
    }
    score += runScore(run);
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y < size; y++) {
      if (m[y][x] === m[y - 1][x]) run++;
      else {
        score += runScore(run);
        run = 1;
      }
    }
    score += runScore(run);
  }

  // Gleichfarbige 2×2-Blöcke
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
  }

  // Muster, die dem Suchmuster ähneln
  const A = [true, false, true, true, true, false, true, false, false, false, false];
  const B = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get: (i: number) => boolean, start: number, pat: boolean[]) =>
    pat.every((p, i) => get(start + i) === p);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x + 11 <= size; x++) {
      const get = (i: number) => m[y][i];
      if (matches(get, x, A) || matches(get, x, B)) score += 40;
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y + 11 <= size; y++) {
      const get = (i: number) => m[i][x];
      if (matches(get, y, A) || matches(get, y, B)) score += 40;
    }
  }

  // Verhältnis dunkler Module zur Gesamtfläche
  let dark = 0;
  for (const row of m) for (const c of row) if (c) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  score += Math.max(0, k) * 10;

  return score;
}

export interface QrMatrix {
  size: number;
  modules: boolean[][];
  version: number;
}

/** Kodiert Text als QR-Matrix. Wirft, wenn die Nutzlast zu groß ist. */
export function encodeQr(text: string): QrMatrix {
  const bytes = toUtf8(text);
  const version = pickVersion(bytes.length);
  const size = version * 4 + 17;

  const codewords = addEcc(buildCodewords(bytes, version), version);

  const blank = (): Grid =>
    Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const base = blank();
  const fn = blank();
  drawFunctionPatterns(base, fn, version);
  drawCodewords(base, fn, codewords);

  let best: Grid | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.map((row) => [...row]);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!fn[y][x] && maskBit(mask, x, y)) candidate[y][x] = !candidate[y][x];
      }
    }
    drawFormat(candidate, fn.map((r) => [...r]), mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return { size, modules: best as Grid, version };
}

/**
 * Matrix als SVG-Pfad. Ein einziger `d`-String statt tausender Rechtecke –
 * das hält das DOM klein und den Druck scharf.
 */
export function qrPath(matrix: QrMatrix): string {
  const parts: string[] = [];
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.modules[y][x]) parts.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return parts.join("");
}
