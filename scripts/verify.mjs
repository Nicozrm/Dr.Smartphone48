/*
  Prüfstand für die Regeln aus CLAUDE.md.

  Der Grund für diese Datei: Jede Regel dieses Projekts stand bisher als
  Prosa in CLAUDE.md und wurde von Hand geprüft. Genau deshalb sind
  nacheinander durchgerutscht – ein Kontrastwert unter dem Schwellenwert,
  jede Unterseite mit der Startseite als kanonischer URL, Markdown-Sternchen
  in gerendertem Text, zweimal ein Backtick im GLSL-Literal und ein
  reserviertes Wort als Shader-Variable. Keiner dieser Fehler war schwer zu
  finden. Alle waren schwer zu *bemerken*.

  Eine Regel, die niemand prüft, ist keine Regel, sondern eine Absicht.
  Was hier steht, ist deshalb ausführbar.

  Aufruf:  npm run verify
  Rückgabe: 0 wenn alles hält, 1 bei mindestens einem Befund.

  Bewusst ohne Abhängigkeit und ohne Testrahmen – wie verify-qr.mjs.
*/

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const findings = [];
let checksRun = 0;

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const rel = (p) => relative(ROOT, p) || p;

function report(check, file, message) {
  findings.push({ check, file, message });
}

/** Alle Dateien unter dir, die auf eine der Endungen passen. */
function walk(dir, exts, out = []) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) walk(join(dir, name), exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** Zeilennummer eines Zeichenindex – für Befunde, die man anspringen kann. */
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/* ================================================================== */
/* 1. Kontrast                                                        */
/*                                                                    */
/* CLAUDE.md: „Alle vier Textstufen erreichen in beiden Themes         */
/* mindestens 4.5:1 gegen die dunkelste Fläche, auf der sie stehen."   */
/* ================================================================== */

const AA = 4.5;

const hex = (h) => {
  const m = h.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** Liest einen Deklarationsblock als Token-Tabelle. */
function tokenBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return null;
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function checkContrast() {
  checksRun++;
  const css = read("app/globals.css");
  const themes = {
    hell: tokenBlock(css, ":root {"),
    dunkel: tokenBlock(css, ':root[data-theme="dark"] {'),
  };

  const inks = ["--ink-strong", "--ink", "--ink-soft", "--ink-faint"];
  const surfaces = ["--surface-page", "--surface-raised", "--surface-sunken"];
  const status = ["--positive", "--warn", "--danger"];

  for (const [themeName, tokens] of Object.entries(themes)) {
    if (!tokens) {
      report("kontrast", "app/globals.css", `Theme-Block „${themeName}" nicht gefunden.`);
      continue;
    }
    // Der Dunkelmodus erbt Flächen und Farben, die er nicht selbst setzt.
    const get = (name) => tokens[name] ?? themes.hell?.[name];

    for (const inkName of [...inks, ...status]) {
      const ink = hex(get(inkName) ?? "");
      if (!ink) continue;
      for (const surfName of surfaces) {
        const surf = hex(get(surfName) ?? "");
        if (!surf) continue;
        const r = contrast(ink, surf);
        if (r < AA) {
          report(
            "kontrast",
            "app/globals.css",
            `${themeName}: ${inkName} auf ${surfName} = ${r.toFixed(2)}:1 (nötig ${AA})`,
          );
        }
      }
    }

    // Schrift auf gefüllter Akzentfläche – eigenes Token, eigene Prüfung.
    const accent = hex(get("--accent") ?? "");
    const onAccent = hex(get("--accent-contrast") ?? "");
    if (accent && onAccent) {
      const r = contrast(onAccent, accent);
      if (r < AA) {
        report(
          "kontrast",
          "app/globals.css",
          `${themeName}: --accent-contrast auf --accent = ${r.toFixed(2)}:1 (nötig ${AA})`,
        );
      }
    }
  }

  /*
    text-white auf einer Akzentfläche umgeht das Token und damit die Prüfung
    oben.

    Gesucht wird in **allen** Zeichenketten, nicht nur in className-Attributen:
    Die Varianten der Schaltfläche stehen als Objektwerte in einer Tabelle, und
    genau dort saß der Fehler ursprünglich. Ein Muster, das nur `className=`
    kennt, übersieht ihn – so geschehen beim ersten Selbsttest dieses
    Prüfstands.
  */
  for (const file of walk("components", [".tsx"]).concat(walk("app", [".tsx"]))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g)) {
      const s = m[2];
      if (!/\bbg-accent(?![-\w])/.test(s)) continue;
      if (!/\btext-white\b/.test(s)) continue;
      report(
        "kontrast",
        `${rel(file)}:${lineOf(src, m.index)}`,
        "text-white auf bg-accent – text-accent-contrast verwenden.",
      );
    }
  }
}

/* ================================================================== */
/* 2. Redaktion                                                       */
/*                                                                    */
/* CLAUDE.md: keine erfundenen Zahlen, Garantie nur aus site.ts,      */
/* keine Markdown-Syntax in Textwerten, die direkt gerendert werden.  */
/* ================================================================== */

function checkEditorial() {
  checksRun++;

  // 2a) Markdown-Betonung in Datenstrings. Die Werte gehen unverändert ins
  //     JSX – `**fett**` erscheint wörtlich auf der Seite.
  for (const file of walk("lib/data", [".ts"])) {
    const src = readFileSync(file, "utf8");
    // Kommentare ausblenden, dort ist Markdown erwünscht.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/\S/g, " "))
      .replace(/\/\/[^\n]*/g, (m) => m.replace(/\S/g, " "));
    for (const m of code.matchAll(/\*\*[^*\n]+\*\*/g)) {
      report(
        "redaktion",
        `${rel(file)}:${lineOf(src, m.index)}`,
        `Markdown-Betonung in einem Textwert: ${m[0].slice(0, 40)}`,
      );
    }
  }

  // 2b) Garantiedauer als feste Zahl. Sie darf ausschließlich aus
  //     site.warrantyMonths kommen, sonst laufen die Angaben auseinander.
  const files = [
    ...walk("app", [".tsx", ".ts"]),
    ...walk("components", [".tsx"]),
    ...walk("lib", [".ts", ".tsx"]),
  ].filter((f) => !f.endsWith("lib/site.ts"));

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/\S/g, " "))
      .replace(/\/\/[^\n]*/g, (m) => m.replace(/\S/g, " "));
    for (const m of code.matchAll(/\b(\d{1,2})\s*(?:-)?\s*Monate?n?\b[^\n]{0,24}(?:Garantie|Gewährleistung)/gi)) {
      report(
        "redaktion",
        `${rel(file)}:${lineOf(src, m.index)}`,
        `Feste Garantiedauer „${m[0].trim().slice(0, 40)}" – site.warrantyMonths verwenden.`,
      );
    }
  }
}

/* ================================================================== */
/* 3. Shader                                                          */
/*                                                                    */
/* Zwei Fehlerklassen, die beide still zuschlagen: ein Backtick im     */
/* GLSL-Literal beendet den JavaScript-String mitten im Shader, und    */
/* ein reserviertes Wort als Variablenname lässt die Übersetzung zur   */
/* Laufzeit scheitern – sichtbar nur als fehlendes Objekt.             */
/* ================================================================== */

/** Reservierte bzw. belegte Bezeichner in GLSL ES 1.00. */
const GLSL_RESERVED = [
  "asm", "class", "union", "enum", "typedef", "template", "this", "packed",
  "goto", "switch", "default", "inline", "noinline", "volatile", "public",
  "static", "extern", "external", "interface", "long", "short", "double",
  "half", "fixed", "unsigned", "input", "output", "sizeof", "cast",
  "namespace", "using", "hvec2", "hvec3", "hvec4", "dvec2", "dvec3", "dvec4",
  "fvec2", "fvec3", "fvec4", "sampler1D", "sampler3D", "sampler1DShadow",
  "sampler2DShadow", "sampler2DRect", "sampler3DRect", "sampler2DRectShadow",
];

const GLSL_TYPES =
  "(?:float|int|bool|void|vec2|vec3|vec4|ivec2|ivec3|ivec4|bvec2|bvec3|bvec4|mat2|mat3|mat4)";

function checkShaders() {
  checksRun++;
  const files = walk("components", [".tsx"]).filter((f) => {
    const s = readFileSync(f, "utf8");
    return s.includes("precision highp float") || s.includes("gl_FragColor");
  });

  for (const file of files) {
    const src = readFileSync(file, "utf8");

    // 3a) Backtick innerhalb eines GLSL-Literals.
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*`/g)) {
      const open = m.index + m[0].length;
      const close = src.indexOf("`", open);
      if (close === -1) continue;
      const body = src.slice(open, close);
      // Ein GLSL-Literal erkennt man am Inhalt, nicht am Namen.
      const isGlsl = /precision|gl_Position|gl_FragColor|attribute|uniform/.test(body);
      if (!isGlsl) continue;
      // Endet das Literal tatsächlich mit `; – oder mitten im Shader?
      const after = src.slice(close, close + 2);
      if (after !== "`;") {
        report(
          "shader",
          `${rel(file)}:${lineOf(src, close)}`,
          `GLSL-Literal ${m[1]} endet unerwartet – vermutlich ein Backtick im Kommentar.`,
        );
      }

      // 3b) Reservierte Wörter als Bezeichner.
      const reserved = new RegExp(`\\b${GLSL_TYPES}\\s+(${GLSL_RESERVED.join("|")})\\b`, "g");
      for (const r of body.matchAll(reserved)) {
        report(
          "shader",
          `${rel(file)}:${lineOf(src, open + r.index)}`,
          `„${r[1]}" ist in GLSL reserviert und kann nicht als Bezeichner dienen.`,
        );
      }
    }
  }
}

/* ================================================================== */
/* 4. Metadaten                                                       */
/*                                                                    */
/* CLAUDE.md: „Jede Route exportiert metadata über pageMeta() –        */
/* niemals ein handgeschriebenes Metadata-Objekt."                    */
/* ================================================================== */

/*
  Zwei zulässige Formen, nicht eine.

  Statische Seiten exportieren `metadata`. Dynamische Routen (`[id]`,
  `[ticketCode]`) können das gar nicht – ihr Titel hängt vom Parameter ab –
  und nutzen `generateMetadata()`. Die Prüfung sah zunächst nur die erste Form
  und meldete damit ausgerechnet die Seiten als fehlerhaft, die es richtig
  machen. Entscheidend ist nicht die Form, sondern dass `pageMeta()` den
  Canonical setzt.
*/
const META_STATIC = /export\s+const\s+metadata/;
const META_DYNAMIC = /export\s+(?:async\s+)?function\s+generateMetadata/;

function checkPageMeta() {
  checksRun++;
  for (const file of walk("app", ["page.tsx"])) {
    const src = readFileSync(file, "utf8");
    const hasStatic = META_STATIC.test(src);
    const hasDynamic = META_DYNAMIC.test(src);

    if (!hasStatic && !hasDynamic) {
      // Seiten ohne eigene Metadaten erben Titel und Beschreibung – erlaubt,
      // aber dann fehlt der Canonical. Deshalb ein Befund.
      report("metadaten", rel(file), "Kein metadata-Export – pageMeta() fehlt.");
      continue;
    }
    if (!/pageMeta\(/.test(src)) {
      const at = src.search(hasStatic ? META_STATIC : META_DYNAMIC);
      report(
        "metadaten",
        `${rel(file)}:${lineOf(src, at)}`,
        "Handgeschriebenes Metadata-Objekt statt pageMeta() – Canonical und OG-Bild fehlen.",
      );
    }
  }
}

/* ================================================================== */
/* 5. Export (nur wenn ./out vorliegt)                                */
/* ================================================================== */

function checkExport() {
  const outDir = join(ROOT, "out");
  if (!existsSync(outDir)) {
    return { skipped: true };
  }
  checksRun++;

  const pages = walk("out", [".html"]);
  const canonicals = new Map();

  for (const file of pages) {
    const name = rel(file);
    if (name.endsWith("404.html")) continue;
    const html = readFileSync(file, "utf8");
    const m = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (!m) {
      report("export", name, "Kein Canonical.");
      continue;
    }
    const prev = canonicals.get(m[1]);
    if (prev) {
      report("export", name, `Canonical doppelt vergeben mit ${prev}: ${m[1]}`);
    } else {
      canonicals.set(m[1], name);
    }
    if (!/<meta property="og:image"/.test(html)) {
      report("export", name, "Kein og:image – geteilte Links bleiben ohne Vorschau.");
    }
  }

  // Sitemap und robots-Meta dürfen sich nicht widersprechen.
  const sitemapPath = join(outDir, "sitemap.xml");
  if (existsSync(sitemapPath)) {
    const xml = readFileSync(sitemapPath, "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const path = new URL(m[1]).pathname.replace(/^\/[^/]*\/?/, (s) =>
        // Der GitHub-Pages-Build trägt den Repo-Unterpfad – der gehört nicht zum Dateinamen.
        s.startsWith("/Koko") ? "/" : s,
      );
      const slug = path === "/" || path === "" ? "index" : path.replace(/^\/|\/$/g, "");
      const file = join(outDir, `${slug}.html`);
      if (!existsSync(file)) continue;
      const html = readFileSync(file, "utf8");
      if (/<meta name="robots" content="[^"]*noindex/.test(html)) {
        report(
          "export",
          `out/${slug}.html`,
          "Steht in der Sitemap und trägt zugleich noindex – widersprüchliches Signal.",
        );
      }
    }
  }
  return { skipped: false };
}

/* ================================================================== */

const CHECKS = [
  ["Kontrast", checkContrast],
  ["Redaktion", checkEditorial],
  ["Shader", checkShaders],
  ["Metadaten", checkPageMeta],
];

console.log("Prüfstand – die Regeln aus CLAUDE.md, ausgeführt\n");

for (const [name, fn] of CHECKS) {
  const before = findings.length;
  fn();
  const n = findings.length - before;
  console.log(`  ${n === 0 ? "ok  " : "FEHL"}  ${name}${n ? `  (${n})` : ""}`);
}

const exportResult = checkExport();
if (exportResult.skipped) {
  console.log("  --    Export        (kein ./out – zuerst npm run build:static)");
} else {
  const n = findings.filter((f) => f.check === "export").length;
  console.log(`  ${n === 0 ? "ok  " : "FEHL"}  Export${n ? `  (${n})` : ""}`);
}

if (findings.length === 0) {
  console.log(`\n${checksRun} Prüfungen, keine Befunde.`);
  process.exit(0);
}

console.log(`\n${findings.length} Befund${findings.length === 1 ? "" : "e"}:\n`);
for (const f of findings) {
  console.log(`  [${f.check}] ${f.file}`);
  console.log(`      ${f.message}`);
}
process.exit(1);
