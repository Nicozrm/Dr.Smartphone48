import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/*
  Die Priorität bildet ab, wofür Menschen tatsächlich suchen: erst der
  Notfall und der Preis, dann die Werkzeuge, zuletzt das Rechtliche.
  /ticket fehlt bewusst – ohne Parameter ist es eine leere Hülle und trägt
  deshalb noindex.
*/
const priorities: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/notfall", priority: 0.9, changeFrequency: "monthly" },
  { path: "/reparatur", priority: 0.9, changeFrequency: "weekly" },
  { path: "/check", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ankauf", priority: 0.8, changeFrequency: "weekly" },
  { path: "/zwilling", priority: 0.8, changeFrequency: "monthly" },
  { path: "/refurbished", priority: 0.7, changeFrequency: "weekly" },
  { path: "/ersatzteile", priority: 0.6, changeFrequency: "monthly" },
  { path: "/werkstatt", priority: 0.6, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.7, changeFrequency: "monthly" },
  { path: "/impressum", priority: 0.3, changeFrequency: "yearly" },
  { path: "/datenschutz", priority: 0.3, changeFrequency: "yearly" },
  { path: "/agb", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return priorities.map(({ path, priority, changeFrequency }) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
