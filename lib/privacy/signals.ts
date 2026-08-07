/**
 * Was ein Browser preisgibt, ohne dass jemand fragt.
 *
 * ## Warum das auf der Datenschutzseite steht
 *
 * Jede Datenschutzerklärung in diesem Land behauptet dasselbe: Wir gehen
 * sorgsam mit Ihren Daten um. Nachprüfen kann das niemand, und deshalb liest
 * es auch niemand. Diese Seite versucht das Gegenteil: Sie zeigt live, was
 * eine Website über Sie erfahren kann, **ohne** um Erlaubnis zu fragen – und
 * überlässt es Ihnen, danach zu bewerten, was die Zusage „wir speichern das
 * nicht" wert ist.
 *
 * Kein einziger Wert hier löst eine Nachfrage aus. Es gibt keinen Dialog,
 * kein Schloss in der Adresszeile, keinen Hinweis. Ein Besucherzähler, ein
 * Werbenetzwerk oder ein eingebettetes Kartenfenster liest genau das, sobald
 * die Seite geladen ist.
 *
 * ## Die Regel, an der sich diese Seite selbst misst
 *
 * Was hier ausgelesen wird, bleibt im Tab: nicht gesendet, nicht
 * gespeichert, nicht gezählt. `npm run verify:privacy` prüft das nicht als
 * Zusage, sondern im Quelltext – die beteiligten Dateien dürfen kein
 * `fetch`, kein `sendBeacon`, kein `XMLHttpRequest` und keinen Zugriff auf
 * `localStorage` enthalten. Was nur behauptet wird, ist nicht geprüft.
 *
 * ## Was diese Seite bewusst nicht sagt
 *
 * Sie sagt Ihnen nicht, wie einzigartig Sie sind. Das wäre die
 * eindrucksvollste Zahl und die einzige, die wir nicht haben dürften: Um sie
 * zu nennen, müsste man Ihre Kombination mit der von tausenden anderen
 * Besuchern vergleichen – also genau die Sammlung angelegt haben, deren
 * Nichtvorhandensein hier der Punkt ist.
 *
 * Wer Ihnen sagt, wie selten Sie sind, hat Sie mit anderen verglichen.
 */

export interface Signal {
  id: string;
  label: string;
  /** Was dieser Wert verrät – steht auf der Seite unter dem Messwert. */
  reason: string;
  /**
   * Liest den Wert. Läuft nur im Browser; die Definition selbst ist harmlos
   * und lässt sich deshalb auch außerhalb laden – der Prüfstand importiert
   * diese Datei, ohne eine dieser Funktionen aufzurufen.
   */
  read: () => string;
}

/** Wert oder ein Strich. „undefined" auf einer Seite zu zeigen, ist unhöflich. */
function or(value: unknown, fallback = "nicht verfügbar"): string {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

/**
 * Die Schriften, auf die geprüft wird.
 *
 * Erkannt wird eine Schrift, indem dieselbe Zeichenfolge einmal in einer
 * bekannten Ersatzschrift und einmal in der gesuchten gemessen wird.
 * Unterscheiden sich die Breiten, ist sie vorhanden. Die Auswahl mischt
 * absichtlich Windows-, macOS- und Linux-Schriften: Schon welche davon
 * fehlen, sagt etwas über das System.
 */
const FONT_PROBES = [
  "Arial",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Segoe UI",
  "Calibri",
  "Cambria",
  "Consolas",
  "Menlo",
  "Monaco",
  "Optima",
  "Futura",
  "Ubuntu",
  "Cantarell",
  "DejaVu Sans",
  "Liberation Sans",
  "Noto Sans",
  "Roboto",
];

export const FONT_PROBE_COUNT = FONT_PROBES.length;

function detectFonts(): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const probe = "mmmmmmmmmmlli WwGg08";
  const fallbacks = ["monospace", "sans-serif", "serif"];
  const base: Record<string, number> = {};
  for (const fallback of fallbacks) {
    ctx.font = `72px ${fallback}`;
    base[fallback] = ctx.measureText(probe).width;
  }
  let found = 0;
  for (const font of FONT_PROBES) {
    // Vorhanden, sobald die Breite gegen irgendeine Ersatzschrift abweicht.
    const differs = fallbacks.some((fallback) => {
      ctx.font = `72px "${font}", ${fallback}`;
      return ctx.measureText(probe).width !== base[fallback];
    });
    if (differs) found++;
  }
  return found;
}

/** Bildpunkte zu zwei Zahlen falten, ohne Megabyte zu bewegen. */
function fold(data: Uint8ClampedArray): string {
  let a = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 4) {
    a = (a + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7) >>> 0;
    b = (b ^ (a + i)) >>> 0;
  }
  return `${a}:${b}`;
}

/**
 * Die Zeichen-Signatur.
 *
 * Dieselbe Anweisung – ein paar Buchstaben, eine Fläche, eine Kurve – ergibt
 * auf verschiedenen Geräten minimal verschiedene Bildpunkte, weil
 * Grafikchip, Treiber und Kantenglättung sich unterscheiden. Für das Auge
 * identisch, für einen Vergleich der Bildpunkte nicht.
 */
function canvasSignature(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "nicht verfügbar";
  ctx.textBaseline = "alphabetic";
  ctx.font = '17px "Arial"';
  ctx.fillStyle = "#f60";
  ctx.fillRect(2, 2, 90, 24);
  ctx.fillStyle = "#069";
  ctx.fillText("Dr Smartphone48 – Größe 48°", 4, 42);
  ctx.fillStyle = "rgba(102, 200, 0, 0.7)";
  ctx.fillText("Dr Smartphone48 – Größe 48°", 6, 46);
  ctx.beginPath();
  ctx.arc(190, 30, 18, 0, Math.PI * 1.6);
  ctx.stroke();
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return shortHash(`${data.length}${fold(data)}`);
}

function webglRenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "kein WebGL";
    // Safari verweigert diese Erweiterung bewusst – dann bleibt der
    // allgemeine Name stehen, und auch das ist eine Information.
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return or(
      info
        ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    );
  } catch {
    return "nicht verfügbar";
  }
}

function preferences(): string {
  const ask = (query: string) => (window.matchMedia(query).matches ? "ja" : "nein");
  return [
    `dunkel ${ask("(prefers-color-scheme: dark)")}`,
    `weniger Bewegung ${ask("(prefers-reduced-motion: reduce)")}`,
    `mehr Kontrast ${ask("(prefers-contrast: more)")}`,
  ].join(" · ");
}

export const signals: Signal[] = [
  {
    id: "bildschirm",
    label: "Bildschirm",
    reason:
      "Auflösung und Pixeldichte zusammen grenzen das Gerätemodell oft auf eine Handvoll ein. Ein Fenster in ungewöhnlicher Größe engt weiter ein.",
    read: () =>
      `${screen.width} × ${screen.height} Punkte, ${window.devicePixelRatio}-fach, ${screen.colorDepth} Bit Farbe`,
  },
  {
    id: "zeit",
    label: "Zeitzone",
    reason:
      "Sagt, wo Sie ungefähr sind, ohne dass jemand nach dem Standort fragen musste. Ein Fenster, das dafür um Erlaubnis bittet, gibt es nicht.",
    read: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  {
    id: "sprache",
    label: "Sprachen",
    reason:
      "Die Reihenfolge der bevorzugten Sprachen ist erstaunlich individuell – besonders, wenn mehr als eine eingestellt ist.",
    read: () =>
      navigator.languages?.length ? navigator.languages.join(", ") : navigator.language,
  },
  {
    id: "rechenwerk",
    label: "Rechenkerne und Speicher",
    reason:
      "Zwei Zahlen, die der Browser ungefragt herausgibt, damit Webseiten ihre Last anpassen können. Sie beschreiben die Geräteklasse.",
    read: () =>
      `${or(navigator.hardwareConcurrency, "?")} Kerne, ` +
      `${or((navigator as Navigator & { deviceMemory?: number }).deviceMemory, "?")} GB angegeben`,
  },
  {
    id: "grafik",
    label: "Grafikeinheit",
    reason:
      "Der Name des Grafikchips, den WebGL nennt. Unter den Einzelangaben eine der aussagekräftigsten, weil sie das Modell fast direkt benennt.",
    read: webglRenderer,
  },
  {
    id: "schriften",
    label: "Installierte Schriften",
    reason:
      "Welche Schriften vorhanden sind, verrät Betriebssystem und installierte Programme. Gefragt wird dafür niemand – es reicht, Textbreiten zu messen.",
    read: () => `${detectFonts()} von ${FONT_PROBES.length} geprüften erkannt`,
  },
  {
    id: "zeichnung",
    label: "Zeichen-Signatur",
    reason:
      "Dieselbe Zeichenanweisung ergibt je nach Grafikchip, Treiber und Kantenglättung andere Bildpunkte. Für das Auge identisch, für einen Vergleich nicht.",
    read: canvasSignature,
  },
  {
    id: "beruehrung",
    label: "Bedienung",
    reason:
      "Die Zahl gleichzeitiger Berührungspunkte trennt Telefon, Tablet und Rechner – und bei Rechnern Touchscreens von reinen Mausgeräten.",
    read: () => `${navigator.maxTouchPoints} gleichzeitige Berührungspunkte`,
  },
  {
    id: "einstellungen",
    label: "Systemeinstellungen",
    reason:
      "Wünsche zu Darstellung und Barrierefreiheit werden an jede Website weitergereicht, damit sie sich anpassen kann. Sie unterscheiden Besucher zusätzlich.",
    read: preferences,
  },
];

/* ---- Der zusammengesetzte Wert ------------------------------------------ */

/**
 * Alphabet ohne I, O, 0 und 1 – dieselbe Regel wie beim Vorgangscode und beim
 * Zertifikat: Diese vier werden auf Papier und am Telefon verwechselt.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Ein kurzer, stabiler Wert aus einer Zeichenkette.
 *
 * Zwei unabhängige FNV-1a-Durchgänge mit verschiedenen Startwerten, daraus
 * zehn Zeichen. Ein Tracker nähme SHA-256; das Verfahren ist hier
 * nebensächlich, denn die Information steckt nicht im Hash, sondern in der
 * Kombination, die hineingeht.
 */
export function shortHash(input: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ (code + i), 0x85ebca6b) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += ALPHABET[(i % 2 === 0 ? a : b) & 31];
    a = Math.imul(a ^ (a >>> 15), 0x01000193) >>> 0;
    b = Math.imul(b ^ (b >>> 13), 0x85ebca6b) >>> 0;
  }
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/** Der Wert aus allen Einzelwerten – in der Reihenfolge von `signals`. */
export function combine(values: string[]): string {
  return shortHash(values.join(" "));
}
