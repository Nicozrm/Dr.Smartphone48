/*
  Prüft den QR-Encoder aus lib/qr.ts – ausschließlich über die öffentliche
  Schnittstelle. Der Encoder hat keine Abhängigkeit, also braucht auch seine
  Verifikation keine: Die Matrix wird hier unabhängig zurückgelesen und mit
  der Norm verglichen.

  Geprüft wird:
   1. Statischer Aufbau – Such-, Takt- und Ausrichtungsmuster, dunkles Modul
   2. Formatinformation – gegen die Tabelle aus ISO/IEC 18004 (Stufe M)
   3. Versionsinformation – gegen die Tabelle für Version 7 bis 20
   4. Rundlauf – Matrix demaskieren, entschachteln, Nutzlast rekonstruieren
   5. Reed-Solomon – die Syndrome jedes Blocks müssen verschwinden

  Aufruf:  node --experimental-strip-types scripts/verify-qr.mjs
*/
import { encodeQr } from "../lib/qr.ts";

/* ---- Normtabellen ------------------------------------------------------ */

/** Formatinformation für Fehlerkorrekturstufe M, Masken 0–7. */
const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

/** Versionsinformation (BCH 18,6) für Version 7–20. */
const VERSION_INFO = {
  7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3, 11: 0x0bbf6,
  12: 0x0c762, 13: 0x0d847, 14: 0x0e60d, 15: 0x0f928, 16: 0x10b78,
  17: 0x1145d, 18: 0x12a17, 19: 0x13532, 20: 0x149a6,
};

const BLOCKS_M = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37], [26, 4, 43, 1, 44], [30, 1, 50, 4, 51], [22, 6, 36, 2, 37],
  [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42], [28, 7, 45, 3, 46],
  [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
];

const ALIGNMENT = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
  [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
];

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/* ---- Galois-Feld, unabhängig nachgebaut -------------------------------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/* ---- Rückleser --------------------------------------------------------- */

/** Baut die Karte der belegten (nicht-Daten-)Module unabhängig nach. */
function reservedMap(size, version) {
  const res = new Uint8Array(size * size);
  const mark = (x, y) => {
    if (x >= 0 && y >= 0 && x < size && y < size) res[y * size + x] = 1;
  };
  for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) mark(ox + dx, oy + dy);
    }
  }
  for (let i = 8; i < size - 8; i++) {
    mark(i, 6);
    mark(6, i);
  }
  const centers = ALIGNMENT[version - 1];
  for (const cy of centers) {
    for (const cx of centers) {
      const nearFinder =
        (cx <= 8 && cy <= 8) || (cx <= 8 && cy >= size - 9) || (cx >= size - 9 && cy <= 8);
      if (nearFinder) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) mark(cx + dx, cy + dy);
      }
    }
  }
  mark(8, size - 8);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      mark(i, 8);
      mark(8, i);
    }
  }
  for (let i = 0; i < 8; i++) mark(size - 1 - i, 8);
  for (let i = 0; i < 7; i++) mark(8, size - 1 - i);
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      mark(a, b);
      mark(b, a);
    }
  }
  return res;
}

/** Liest einen fertigen Code zurück und gibt alles zurück, was prüfbar ist. */
function readBack(qr) {
  const { size, version, modules } = qr;
  const at = (x, y) => (modules[y * size + x] ? 1 : 0);
  const problems = [];

  // 1) Statischer Aufbau
  for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        const expected = ring === 2 ? 0 : 1;
        if (at(ox + dx, oy + dy) !== expected) {
          problems.push(`Suchmuster bei ${ox},${oy} falsch (${dx},${dy})`);
        }
      }
    }
  }
  for (let i = 8; i < size - 8; i++) {
    if (at(i, 6) !== (i % 2 === 0 ? 1 : 0)) problems.push(`Taktmuster waagerecht bei ${i}`);
    if (at(6, i) !== (i % 2 === 0 ? 1 : 0)) problems.push(`Taktmuster senkrecht bei ${i}`);
  }
  if (at(8, size - 8) !== 1) problems.push("Dunkles Modul fehlt bei (8, size-8)");

  const centers = ALIGNMENT[version - 1];
  for (const cy of centers) {
    for (const cx of centers) {
      const nearFinder =
        (cx <= 8 && cy <= 8) || (cx <= 8 && cy >= size - 9) || (cx >= size - 9 && cy <= 8);
      if (nearFinder) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          if (at(cx + dx, cy + dy) !== (ring === 1 ? 0 : 1)) {
            problems.push(`Ausrichtungsmuster bei ${cx},${cy} falsch`);
          }
        }
      }
    }
  }

  // 2) Formatinformation zurücklesen – beide Kopien müssen übereinstimmen
  let copy1 = 0;
  for (let i = 0; i < 6; i++) copy1 |= at(8, i) << i;
  copy1 |= at(8, 7) << 6;
  copy1 |= at(8, 8) << 7;
  copy1 |= at(7, 8) << 8;
  for (let i = 9; i < 15; i++) copy1 |= at(14 - i, 8) << i;

  let copy2 = 0;
  for (let i = 0; i < 8; i++) copy2 |= at(size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) copy2 |= at(8, size - 15 + i) << i;

  if (copy1 !== copy2) problems.push("Die beiden Formatinformationen stimmen nicht überein");
  const maskIndex = FORMAT_M.indexOf(copy1);
  if (maskIndex === -1) {
    problems.push(`Formatinformation 0x${copy1.toString(16)} steht nicht in der Tabelle für Stufe M`);
    return { problems, text: null };
  }

  // 3) Versionsinformation (ab Version 7)
  if (version >= 7) {
    let bits = 0;
    for (let i = 0; i < 18; i++) {
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      bits |= at(a, b) << i;
    }
    if (bits !== VERSION_INFO[version]) {
      problems.push(`Versionsinformation v${version}: 0x${bits.toString(16)} statt 0x${VERSION_INFO[version].toString(16)}`);
    }
  }

  // 4) Demaskieren und Datenbits im Zickzack auslesen
  const res = reservedMap(size, version);
  const bits = [];
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (let col = 0; col < 2; col++) {
        const x = right - col;
        if (res[y * size + x]) continue;
        bits.push(at(x, y) ^ (MASKS[maskIndex](x, y) ? 1 : 0));
      }
    }
    upward = !upward;
  }

  const codewords = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  // 5) Entschachteln
  const [ecLen, g1Count, g1Size, g2Count, g2Size] = BLOCKS_M[version - 1];
  const sizes = [
    ...Array(g1Count).fill(g1Size),
    ...Array(g2Count).fill(g2Size),
  ];
  const dataBlocks = sizes.map(() => []);
  const ecBlocks = sizes.map(() => []);
  let idx = 0;
  for (let i = 0; i < Math.max(g1Size, g2Size); i++) {
    for (let b = 0; b < sizes.length; b++) {
      if (i < sizes[b]) dataBlocks[b].push(codewords[idx++]);
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (let b = 0; b < sizes.length; b++) ecBlocks[b].push(codewords[idx++]);
  }

  // 6) Reed-Solomon: p(alpha^i) muss für i = 0 .. ecLen-1 verschwinden
  for (let b = 0; b < sizes.length; b++) {
    const full = [...dataBlocks[b], ...ecBlocks[b]];
    for (let i = 0; i < ecLen; i++) {
      let acc = 0;
      for (const c of full) acc = gfMul(acc, EXP[i]) ^ c;
      if (acc !== 0) {
        problems.push(`Block ${b}: Syndrom ${i} ist ${acc}, nicht 0`);
        break;
      }
    }
  }

  // 7) Nutzlast rekonstruieren
  const flat = dataBlocks.flat();
  let pos = 0;
  const read = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = (v << 1) | ((flat[pos >> 3] >> (7 - (pos & 7))) & 1);
      pos++;
    }
    return v;
  };
  const mode = read(4);
  if (mode !== 0b0100) problems.push(`Modusanzeiger ${mode.toString(2)} statt 0100`);
  const len = read(version <= 9 ? 8 : 16);
  const payload = [];
  for (let i = 0; i < len; i++) payload.push(read(8));

  return { problems, text: new TextDecoder().decode(Uint8Array.from(payload)) };
}

/* ---- Durchlauf --------------------------------------------------------- */

const samples = [
  "HELLO WORLD",
  "https://www.drsmartphone48.repair/",
  "https://www.drsmartphone48.repair/ticket?t=U2FsdGVkX1-abc123_XYZ",
  "Straße & Größe – Umlaute ÄÖÜ, Anführung „so“",
  "tel:+491775196018",
  "x".repeat(1),
  "y".repeat(120),
  "z".repeat(300),
  "q".repeat(660),
  JSON.stringify({
    brand: "apple",
    model: "iphone-15-pro",
    repairs: ["display", "battery"],
    total: 454,
  }),
];

let failures = 0;
console.log("QR-Encoder – Prüfung gegen ISO/IEC 18004\n");

for (const text of samples) {
  const qr = encodeQr(text);
  const { problems, text: decoded } = readBack(qr);
  if (decoded !== text) {
    problems.push(`Nutzlast weicht ab: ${JSON.stringify(decoded?.slice(0, 48))}`);
  }
  const label = `Version ${String(qr.version).padStart(2)} · ${String(text.length).padStart(3)} Zeichen · ${qr.size}×${qr.size}`;
  if (problems.length === 0) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FEHLER ${label}`);
    for (const p of problems.slice(0, 5)) console.log(`         ${p}`);
  }
}

// Kapazitätsgrenze: ein Zeichen mehr als Version 20 fasst, muss auffallen.
try {
  encodeQr("a".repeat(670));
  failures++;
  console.log("  FEHLER Kapazitätsgrenze: 670 Zeichen wurden angenommen");
} catch {
  console.log("  ok    Kapazitätsgrenze meldet sich bei 670 Zeichen");
}

console.log(
  failures === 0
    ? "\nAlle Prüfungen bestanden."
    : `\n${failures} Prüfung(en) fehlgeschlagen.`,
);
process.exit(failures === 0 ? 0 : 1);
