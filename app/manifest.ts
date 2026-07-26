import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

// public/-Assets werden nicht automatisch mit dem basePath präfixt.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: `${base}/`,
    scope: `${base}/`,
    id: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    categories: ["business", "utilities"],
    // OLED-Schwarz beim Start – der Übergang in den Bootloader ist nahtlos.
    background_color: "#000000",
    theme_color: "#000000",
    lang: "de",
    dir: "ltr",
    shortcuts: [
      { name: "Sofortpreis berechnen", url: `${base}/reparatur` },
      { name: "Geräte-Check starten", url: `${base}/check` },
      { name: "Digitaler Zwilling", url: `${base}/zwilling` },
    ],
    icons: [
      {
        src: `${base}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${base}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: `${base}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
