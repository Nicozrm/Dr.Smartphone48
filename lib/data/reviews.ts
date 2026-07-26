import { site } from "@/lib/site";

/**
 * Google-Rezensionen.
 *
 * WICHTIG – Redaktionsregel für diese Datei:
 * Hier stehen ausschließlich **wörtlich übernommene, echte** Rezensionen aus
 * dem Google-Unternehmensprofil. Keine erfundenen Namen, keine
 * nachgeschriebenen Texte, keine Stockfotos, keine „Beispiel"-Einträge.
 *
 * So wird ein Eintrag ergänzt:
 * 1. Rezension im Google-Profil öffnen (`site.google.placeUrl`).
 * 2. Text unverändert übernehmen – inklusive Tippfehler und Zeichensetzung.
 * 3. `author` = angezeigter Vorname (bzw. Vorname + Initial), wie bei Google.
 * 4. `date` = ISO-Datum der Rezension, `rating` = vergebene Sterne.
 *
 * Ist die Liste leer, zeigt die Website ehrlich das Google-Aggregat und
 * verlinkt auf die Originale – sie erfindet nichts, um die Lücke zu füllen.
 */
export interface Review {
  id: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** ISO-Datum, z. B. "2025-11-04". */
  date: string;
  text: string;
  /** Optional: konkretes Gerät/Anliegen, falls in der Rezension genannt. */
  device?: string;
}

export const reviews: Review[] = [];

/** Aggregat aus dem Google-Unternehmensprofil. */
export const reviewSummary = {
  rating: site.google.rating,
  count: site.google.reviewCount,
  source: "Google" as const,
  url: site.google.placeUrl,
};

export function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}
