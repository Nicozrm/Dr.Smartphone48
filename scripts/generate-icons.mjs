import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const outDir = new URL("../public/icons", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

// Maskable-Variante: gleiche Marke, mehr Innenabstand (safe zone)
const mark = (scale, bg) => `<!doctype html><html><body style="margin:0">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" style="display:block">
  <rect width="64" height="64" ${bg ? 'rx="0"' : 'rx="16"'} fill="#141517"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">
    <path d="M23.4 45.2H26c-3.8-2.6-6.2-6.9-6.2-11.9 0-7.2 5.4-12.9 12.2-12.9s12.2 5.7 12.2 12.9c0 5-2.4 9.3-6.2 11.9h2.6" fill="none" stroke="#f5f5f3" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M19.2 45.2h6.9M37.9 45.2h6.9" stroke="#f5f5f3" stroke-width="3.6" stroke-linecap="round"/>
  </g>
</svg></body></html>`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });

async function shot(html, path, size) {
  await page.setContent(html);
  const el = page.locator("svg");
  const buf = await el.screenshot({ omitBackground: true });
  if (size === 512) {
    writeFileSync(path, buf);
  } else {
    // herunterskalieren über canvas im Browser
    const dataUrl = await page.evaluate(async ([b64, s]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = s; canvas.height = s;
      canvas.getContext("2d").drawImage(img, 0, 0, s, s);
      return canvas.toDataURL("image/png");
    }, [buf.toString("base64"), size]);
    writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
  }
  console.log("wrote", path);
}

await shot(mark(1, false), `${outDir}/icon-512.png`, 512);
await shot(mark(1, false), `${outDir}/icon-192.png`, 192);
await shot(mark(0.72, true), `${outDir}/icon-maskable-512.png`, 512);

await browser.close();
