import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";

/**
 * Rendert das Vorschaubild für geteilte Links nach public/og.png.
 *
 * Warum ein echtes PNG in public/ und keine Route über `next/og`:
 * Die Metadata-Route liefert im statischen Export eine Datei **ohne**
 * Dateiendung ("out/opengraph-image"). GitHub Pages und Cloudflare Pages
 * senden dafür `application/octet-stream`, und die Crawler von WhatsApp,
 * iMessage und Facebook verwerfen alles, was nicht als Bild ausgeliefert wird.
 * Ein statisches public/og.png hat auf allen drei Deploy-Zielen denselben
 * korrekten Content-Type – und kostet zur Laufzeit nichts.
 *
 * Neu rendern nach Änderungen an Name, Ort, Garantie oder Öffnungszeiten:
 *   node scripts/generate-og.mjs
 */

// Stammdaten direkt aus lib/site.ts lesen, damit das Bild nicht auseinander-
// läuft. Ein kleiner Parser genügt – die Datei ist ein flaches Objektliteral.
const siteSource = readFileSync(new URL("../lib/site.ts", import.meta.url), "utf8");
const field = (key, fallback) => {
  const match = siteSource.match(new RegExp(`\\n\\s*${key}:\\s*"([^"]*)"`));
  return match ? match[1] : fallback;
};
const numberField = (key, fallback) => {
  const match = siteSource.match(new RegExp(`\\n\\s*${key}:\\s*(\\d+)`));
  return match ? match[1] : fallback;
};

const name = field("name", "Dr Smartphone48");
const city = field("city", "Greven");
const hours = field("openingHoursShort", "Mo–Fr 11–19 Uhr");
const warranty = numberField("warrantyMonths", "12");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @import url('');
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; flex-direction: column;
    justify-content: space-between; background: #f7f7f5; padding: 72px 80px;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .brand { display: flex; align-items: center; gap: 18px; }
  .brand span { font-size: 30px; font-weight: 600; color: #141517; letter-spacing: -0.02em; }
  .eyebrow {
    font-size: 21px; letter-spacing: 0.14em; text-transform: uppercase; color: #71757c;
  }
  h1 {
    font-size: 84px; font-weight: 600; letter-spacing: -0.035em; line-height: 1.04;
    color: #141517; margin-top: 22px;
  }
  .foot {
    display: flex; align-items: center; gap: 20px; border-top: 1px solid rgba(20,21,23,0.12);
    padding-top: 30px; font-size: 24px; color: #3d4045;
  }
  .dot { color: #a4a7ad; }
</style></head><body>
  <div class="brand">
    <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
      <rect x="7.25" y="2.25" width="17.5" height="27.5" rx="4.25" stroke="#141517" stroke-width="1.9"/>
      <path d="M16 9.5v13M9.5 16h13" stroke="#2456e6" stroke-width="2.4" stroke-linecap="square"/>
    </svg>
    <span>${name}</span>
  </div>

  <div>
    <p class="eyebrow">Smartphone-Reparatur · ${city}</p>
    <h1>Reparatur, wie sie<br>sein sollte.</h1>
  </div>

  <div class="foot">
    <span>Festpreis in Sekunden</span><span class="dot">·</span>
    <span>${warranty} Monate Garantie</span><span class="dot">·</span>
    <span>${hours}</span>
  </div>
</body></html>`;

const outDir = new URL("../public", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: `${outDir}/og.png` });
await browser.close();

console.log(`wrote ${outDir}/og.png (1200×630)`);
