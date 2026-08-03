import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

/*
  PWA-Icons aus app/icon.svg rendern.

  Eine Quelle, drei Ausgaben. Vorher lag die Marke zweimal im Code – einmal
  als Favicon, einmal hier als Zeichenkette – und die beiden liefen beim
  ersten Redesign prompt auseinander. Jetzt liest das Skript dieselbe Datei,
  die auch der Browser als Favicon ausliefert.

  Aufruf: node scripts/generate-icons.mjs
*/

const outDir = new URL("../public/icons", import.meta.url).pathname;
const iconPath = new URL("../app/icon.svg", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const source = readFileSync(iconPath, "utf8");

/**
 * @param scale  Verkleinerung der Marke innerhalb der Fläche.
 * @param maskable  Für maskierbare Icons: randlose Fläche, Marke in der
 *   sicheren Zone. Android beschneidet das Icon je nach Launcher zu einem
 *   Kreis oder Rundeck – wer die Superellipse stehen ließe, bekäme eine
 *   Superellipse in einem Kreis.
 */
function page(scale, maskable) {
  // Die Superellipse ist der Rahmen des Icons. Für die maskierbare Variante
  // wird sie durch die volle Fläche ersetzt, den Rest besorgt der Launcher.
  const svg = maskable
    ? source.replace(
        '<use href="#dsShape" fill="url(#dsBody)" />',
        '<rect width="128" height="128" fill="url(#dsBody)" />',
      )
    : source;

  return `<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:512px;height:512px">
${svg.replace("<svg ", `<svg style="display:block;width:512px;height:512px" data-scale="${scale}" `)}
</div>
<script>
  // Marke (die weiße Gruppe) zentriert skalieren – nur sie, nicht der Körper.
  var g = document.querySelector('svg > g[fill="none"]');
  if (g && ${scale} !== 1) g.setAttribute("transform", "translate(64 64) scale(${scale}) translate(-64 -64)");
</script>
</body></html>`;
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const view = await browser.newPage({ viewport: { width: 512, height: 512 } });

async function shot(html, path, size) {
  await view.setContent(html);
  const buf = await view.locator("svg").screenshot({ omitBackground: true });
  if (size === 512) {
    writeFileSync(path, buf);
  } else {
    // Herunterskalieren über canvas im Browser – ergibt eine saubere
    // Interpolation, ohne eine Bildbibliothek einzukaufen.
    const dataUrl = await view.evaluate(async ([b64, s]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = s;
      canvas.height = s;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, s, s);
      return canvas.toDataURL("image/png");
    }, [buf.toString("base64"), size]);
    writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
  }
  console.log("geschrieben:", path);
}

await shot(page(1, false), `${outDir}/icon-512.png`, 512);
await shot(page(1, false), `${outDir}/icon-192.png`, 192);
await shot(page(0.68, true), `${outDir}/icon-maskable-512.png`, 512);

// Apple-Touch-Icon: iOS rundet selbst und mag keine Transparenz.
await shot(page(1, true), `${outDir}/apple-touch-icon.png`, 180);

await browser.close();
