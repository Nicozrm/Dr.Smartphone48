import { brands, type Brand, type DeviceModel } from "@/lib/data/devices";

/**
 * Geräte-Erkennung aus dem Browser.
 *
 * Der Browser verrät die logische Bildschirmgröße und die Pixeldichte. Das
 * genügt, um aus dem Katalog eine kleine Kandidatenliste zu bilden – aber
 * nicht immer für ein eindeutiges Modell: mehrere Generationen teilen exakt
 * dieselbe Auflösung (etwa iPhone 12, 13 und 14).
 *
 * Deshalb gibt diese Funktion bewusst **mehrere** Kandidaten zurück, statt
 * ein Modell zu behaupten. Die Website sagt dann ehrlich „passt zu diesen
 * Geräten" und lässt den Besucher wählen. Ein falsch geratenes Modell wäre
 * schlimmer als eine kurze Rückfrage – daran hängt der Preis.
 */

interface Fingerprint {
  modelId: string;
  /** Logische CSS-Pixel im Portrait-Modus. */
  w: number;
  h: number;
  /** Erwartete devicePixelRatio. */
  dpr: number;
}

const FINGERPRINTS: Fingerprint[] = [
  // Apple
  { modelId: "iphone-16-pro-max", w: 440, h: 956, dpr: 3 },
  { modelId: "iphone-16-pro", w: 402, h: 874, dpr: 3 },
  { modelId: "iphone-16", w: 393, h: 852, dpr: 3 },
  { modelId: "iphone-15-pro", w: 393, h: 852, dpr: 3 },
  { modelId: "iphone-15", w: 393, h: 852, dpr: 3 },
  { modelId: "iphone-14-pro", w: 393, h: 852, dpr: 3 },
  { modelId: "iphone-14", w: 390, h: 844, dpr: 3 },
  { modelId: "iphone-13", w: 390, h: 844, dpr: 3 },
  { modelId: "iphone-12", w: 390, h: 844, dpr: 3 },
  { modelId: "iphone-se-2022", w: 375, h: 667, dpr: 2 },

  // Samsung
  { modelId: "galaxy-s24-ultra", w: 384, h: 832, dpr: 3.75 },
  { modelId: "galaxy-s24", w: 360, h: 780, dpr: 3 },
  { modelId: "galaxy-s23-ultra", w: 384, h: 824, dpr: 3.75 },
  { modelId: "galaxy-s23", w: 360, h: 780, dpr: 3 },
  { modelId: "galaxy-s22", w: 360, h: 780, dpr: 3 },
  { modelId: "galaxy-z-flip-5", w: 373, h: 916, dpr: 3 },
  { modelId: "galaxy-a54", w: 360, h: 800, dpr: 3 },
  { modelId: "galaxy-a34", w: 360, h: 800, dpr: 3 },

  // Google
  { modelId: "pixel-9-pro", w: 412, h: 892, dpr: 2.625 },
  { modelId: "pixel-9", w: 412, h: 883, dpr: 2.625 },
  { modelId: "pixel-8-pro", w: 412, h: 892, dpr: 2.625 },
  { modelId: "pixel-8", w: 412, h: 870, dpr: 2.625 },
  { modelId: "pixel-7a", w: 412, h: 892, dpr: 2.625 },
  { modelId: "pixel-7", w: 412, h: 892, dpr: 2.625 },
  { modelId: "pixel-6a", w: 412, h: 892, dpr: 2.625 },
];

export type Platform = "ios" | "android" | "desktop" | "unbekannt";

export interface DetectResult {
  platform: Platform;
  /** Bildschirmangaben, wie der Browser sie meldet. */
  screen: { w: number; h: number; dpr: number };
  /** Kandidaten, bester Treffer zuerst. Leer, wenn nichts passt. */
  candidates: { brand: Brand; model: DeviceModel }[];
  /** true, wenn mehrere Modelle dieselbe Signatur haben. */
  ambiguous: boolean;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  if (/iPhone|iPod/.test(ua)) return "ios";
  // iPadOS meldet sich als Mac – über Touch unterscheidbar.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (!touch) return "desktop";
  return "unbekannt";
}

const BRAND_BY_PLATFORM: Record<Platform, string[]> = {
  ios: ["apple"],
  android: ["samsung", "google"],
  desktop: [],
  unbekannt: [],
};

export function detectDevice(): DetectResult {
  // Portrait normalisieren, damit die Orientierung das Ergebnis nicht kippt.
  const rawW = window.screen.width;
  const rawH = window.screen.height;
  const w = Math.min(rawW, rawH);
  const h = Math.max(rawW, rawH);
  const dpr = window.devicePixelRatio || 1;
  const platform = detectPlatform();

  if (platform === "desktop") {
    return { platform, screen: { w, h, dpr }, candidates: [], ambiguous: false };
  }

  const allowed = BRAND_BY_PLATFORM[platform];

  const scored = FINGERPRINTS.map((fp) => {
    // Toleranz, weil Browser-Chrome und Systemleisten die Werte leicht
    // verschieben können.
    const dw = Math.abs(fp.w - w);
    const dh = Math.abs(fp.h - h);
    const dd = Math.abs(fp.dpr - dpr);
    const fits = dw <= 6 && dh <= 24 && dd <= 0.35;
    return { fp, score: dw + dh * 0.5 + dd * 20, fits };
  })
    .filter((x) => x.fits)
    .sort((a, b) => a.score - b.score);

  const candidates: { brand: Brand; model: DeviceModel }[] = [];
  for (const { fp } of scored) {
    for (const brand of brands) {
      if (allowed.length > 0 && !allowed.includes(brand.id)) continue;
      const model = brand.models.find((m) => m.id === fp.modelId);
      if (model) candidates.push({ brand, model });
    }
  }

  return {
    platform,
    screen: { w, h, dpr },
    candidates: candidates.slice(0, 4),
    ambiguous: candidates.length > 1,
  };
}
