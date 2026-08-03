import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Sitemap.
 *
 * `lastModified` stand zuvor auf `new Date()` – damit meldete jeder Deploy
 * sämtliche Seiten als frisch geändert, auch wenn nur eine CSS-Zeile anders
 * war. Suchmaschinen entwerten ein Datum, das sich bei jedem Crawl bewegt,
 * ohne dass sich der Inhalt ändert. Deshalb steht hier ein gepflegtes Datum
 * pro Seitengruppe: Es wird bewusst angefasst, wenn sich der Inhalt ändert.
 *
 * Die Reihenfolge bildet ab, wofür Menschen tatsächlich suchen: erst der
 * Notfall und der Preis, dann die übrigen Werkzeuge, zuletzt das Beiwerk.
 */

/** Beim inhaltlichen Bearbeiten einer Seite das jeweilige Datum hochsetzen. */
const CONTENT_UPDATED = "2026-08-01";

interface Entry {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}

const entries: Entry[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/notfall", priority: 0.9, changeFrequency: "monthly" },
  { path: "/reparatur", priority: 0.9, changeFrequency: "monthly" },
  { path: "/check", priority: 0.9, changeFrequency: "monthly" },
  { path: "/vorbereitung", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ankauf", priority: 0.9, changeFrequency: "weekly" },
  { path: "/zwilling", priority: 0.9, changeFrequency: "monthly" },
  { path: "/refurbished", priority: 0.8, changeFrequency: "weekly" },
  { path: "/kontakt", priority: 0.8, changeFrequency: "monthly" },
  { path: "/werkstatt", priority: 0.7, changeFrequency: "yearly" },
  { path: "/ersatzteile", priority: 0.7, changeFrequency: "monthly" },
];

// Impressum, Datenschutz und AGB stehen bewusst nicht in der Sitemap: Sie sind
// per robots-Meta von der Indexierung ausgenommen. Beides zugleich zu melden
// ("indexiere das nicht" / "hier ist es") ist ein widersprüchliches Signal.
// Aus demselben Grund fehlt /ticket – ohne Parameter ist es eine leere Hülle
// und trägt deshalb noindex.

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(CONTENT_UPDATED);

  return entries.map(({ path, priority, changeFrequency }) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
