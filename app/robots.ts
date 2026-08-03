import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Interne Werkzeuge gehören nicht in den Index. Die Rechnungsdaten liegen
      // zwar ohnehin nur im Browser, aber die Adresse muss nicht in jedem
      // Suchergebnis stehen.
      disallow: "/intern/",
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
