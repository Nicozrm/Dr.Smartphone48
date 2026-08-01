import { brands, repairsForModel } from "@/lib/data/devices";
import { grades, refurbishedDevices } from "@/lib/data/refurbished";
import type { TaxRate } from "./types";

/**
 * Leistungskatalog für die Schnellerfassung.
 *
 * Die Preise stammen aus derselben Quelle wie der öffentliche
 * Sofortpreis-Rechner (`lib/data/devices.ts`). Damit kann die Rechnung
 * gar nicht erst von der Website abweichen – eine der zuverlässigsten
 * Beschwerdequellen im Ladengeschäft ist ein Preis, der online anders stand.
 */

export type CatalogGroup = "Reparatur" | "Gerät" | "Zubehör" | "Service";

export interface CatalogItem {
  id: string;
  title: string;
  note: string;
  priceCents: number;
  unit: string;
  taxRate: TaxRate;
  group: CatalogGroup;
  /** Normalisierter Suchtext – klein geschrieben, ohne Sonderzeichen. */
  haystack: string;
}

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function item(
  id: string,
  title: string,
  note: string,
  priceCents: number,
  group: CatalogGroup,
  unit = "Stk.",
  taxRate: TaxRate = 19,
): CatalogItem {
  return {
    id,
    title,
    note,
    priceCents,
    unit,
    taxRate,
    group,
    haystack: norm(`${title} ${note} ${group}`),
  };
}

/** Reparaturen: jedes Modell × jede angebotene Reparaturart. */
const repairs: CatalogItem[] = brands.flatMap((brand) =>
  brand.models.flatMap((model) =>
    repairsForModel(model)
      // Die kostenlose Diagnose gehört auf die Rechnung nur als Nachweis,
      // nicht als Position mit Betrag.
      .filter((r) => r.kind !== "diagnose")
      .map((r) =>
        item(
          `rep-${model.id}-${r.kind}`,
          `${r.label} tauschen`,
          `${brand.name} ${model.name}`,
          r.price * 100,
          "Reparatur",
        ),
      ),
  ),
);

/** Refurbished-Geräte – regelmäßig Differenzbesteuerung nach § 25a UStG. */
const devices: CatalogItem[] = refurbishedDevices.map((d) => {
  const grade = grades.find((g) => g.id === d.grade)?.label ?? d.grade;
  return item(
    `dev-${d.id}`,
    `${d.brand} ${d.name}`,
    `${d.storage} · ${d.color} · Zustand ${grade} · Akku ${d.battery} %`,
    d.price * 100,
    "Gerät",
  );
});

/** Pauschalen und Zusatzleistungen, die kein Gerätemodell brauchen. */
const services: CatalogItem[] = [
  item("srv-diagnose", "Diagnose", "Fehlersuche und Befund", 0, "Service"),
  item("srv-arbeit", "Arbeitszeit Werkstatt", "Facharbeit nach Aufwand", 8900, "Service", "Std."),
  item("srv-express", "Express-Zuschlag", "Vorrangige Bearbeitung", 2900, "Service", "Pausch."),
  item("srv-datenrettung", "Datenrettung", "Sicherung und Wiederherstellung", 9900, "Service", "Pausch."),
  item("srv-datenuebertragung", "Datenübertragung", "Übertragung auf ein neues Gerät", 3900, "Service", "Pausch."),
  item("srv-software", "Software-Wiederherstellung", "Neuinstallation und Einrichtung", 5900, "Service", "Pausch."),
  item("srv-reinigung", "Innenreinigung", "Ultraschallbad und Kontaktpflege", 3900, "Service", "Pausch."),
  item("srv-wasser", "Wasserschaden-Behandlung", "Zerlegung, Bad, Trocknung, Befund", 4900, "Service", "Pausch."),
  item("srv-versand", "Versand", "Versicherter Versand innerhalb Deutschlands", 990, "Service", "Pausch."),
  item("acc-panzerglas", "Panzerglas", "Inklusive blasenfreier Montage", 1990, "Zubehör"),
  item("acc-huelle", "Schutzhülle", "", 1990, "Zubehör"),
  item("acc-netzteil", "Netzteil", "USB-C, 20 W", 2490, "Zubehör"),
  item("acc-kabel", "Ladekabel", "1 m", 1490, "Zubehör"),
];

export const catalog: CatalogItem[] = [...repairs, ...devices, ...services];

/**
 * Sucht im Katalog. Jedes Suchwort muss vorkommen, die Reihenfolge nicht –
 * „13 display“ und „display 13“ finden dasselbe. Treffer am Wortanfang und
 * kürzere Bezeichnungen stehen weiter oben.
 */
export function searchCatalog(query: string, limit = 8): CatalogItem[] {
  const terms = norm(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { item: CatalogItem; score: number }[] = [];
  for (const entry of catalog) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const at = entry.haystack.indexOf(term);
      if (at === -1) {
        ok = false;
        break;
      }
      score += at === 0 || entry.haystack[at - 1] === " " ? 3 : 1;
    }
    if (ok) scored.push({ item: entry, score: score * 100 - entry.haystack.length });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
