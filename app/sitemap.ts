import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/reparatur",
    "/check",
    "/zwilling",
    "/refurbished",
    "/ersatzteile",
    "/werkstatt",
    "/kontakt",
    "/impressum",
    "/datenschutz",
    "/agb",
  ];

  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === ""
      ? 1
      : ["/reparatur", "/check", "/zwilling"].includes(route)
        ? 0.9
        : ["/impressum", "/datenschutz", "/agb"].includes(route)
          ? 0.3
          : 0.7,
  }));
}
