/*
  Herstellungs-Fußabdruck je Modell – der reale Teil der CO₂-Rechnung.

  `components/twin/RepairOrReplace.tsx` rechnete bisher mit zwei runden
  Kennzahlen (Herstellung ≈ 60 kg, Reparatur ≈ 2 kg), ausdrücklich als
  Größenordnung gekennzeichnet. Diese Datei liefert das Gegenstück für die
  Modelle, zu denen es eine echte Zahl gibt: den Herstellungs-Fußabdruck aus
  dem eigenen Umweltbericht des Herstellers, in kg CO₂e, mit Beleg.

  Jede Zahl hier stammt aus einem „Product Environmental Report" (Apple),
  einem „Product Environmental Report" (Google) oder einem „Life Cycle
  Assessment" (Samsung, Carbon-Trust-zertifiziert) – der Basiskonfiguration
  des jeweiligen Modells, so wie der Hersteller sie ausweist. Nichts davon ist
  geschätzt, gerundet auf eine Größenordnung oder von einem anderen Modell
  übertragen. Wo Samsung eine Nachkommastelle veröffentlicht, steht sie auch
  hier – Präzision zu erfinden wäre falsch, Präzision zu unterschlagen auch.

  Redaktionsregel dieser Website: lieber eine Lücke als eine Behauptung. Für
  Galaxy S22, A54 und A34 fand sich kein eigenständiger Umweltbericht mit
  Herstellungs-Fußabdruck – für diese drei Modelle gibt es hier bewusst
  keinen Eintrag, und `co2For()` gibt `undefined` zurück statt einer Zahl,
  die sich jemand ausgedacht hat. Dasselbe Muster wie `supportFor()` in
  `support.ts`.
*/

export type Co2Source = "hersteller";

export interface Co2Entry {
  /** Modell-Kennung aus `lib/data/devices.ts`. */
  model: string;
  /** Herstellungs- und Lebenszyklus-Fußabdruck der Basiskonfiguration, kg CO₂e. */
  kgCO2e: number;
  source: Co2Source;
  /** Bericht, Konfiguration und Datum – erscheint als Beleg auf der Seite. */
  basis: string;
}

/**
 * Zuletzt gegen die Originalberichte geprüft. Hersteller überarbeiten ihre
 * Fußabdruck-Modelle gelegentlich rückwirkend (Apple hat das beim iPhone 15
 * Pro und beim iPhone 12 ausdrücklich getan) – ein Datum, das niemand
 * hochsetzt, wird irgendwann falsch, ohne dass sich der Code ändert.
 */
export const CO2_CHECKED = "2026-08";

export const co2Entries: Co2Entry[] = [
  // --- Apple -----------------------------------------------------------
  // Product Environmental Report, jeweilige Basiskonfiguration.
  {
    model: "iphone-16-pro-max",
    kgCO2e: 74,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 16 Pro Max 256 GB, September 2024",
  },
  {
    model: "iphone-16-pro",
    kgCO2e: 66,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 16 Pro 128 GB, September 2024",
  },
  {
    model: "iphone-16",
    kgCO2e: 56,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 16 128 GB, September 2024",
  },
  {
    model: "iphone-15-pro",
    kgCO2e: 66,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 15 Pro 128 GB, September 2023",
  },
  {
    model: "iphone-15",
    kgCO2e: 56,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 15 128 GB, September 2023",
  },
  {
    model: "iphone-14-pro",
    kgCO2e: 65,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 14 Pro 128 GB, September 2022",
  },
  {
    model: "iphone-14",
    kgCO2e: 61,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 14 128 GB, September 2022",
  },
  {
    model: "iphone-13",
    kgCO2e: 64,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 13 128 GB, September 2021",
  },
  {
    // Apple hat diesen Wert 2021 rückwirkend von 70 auf 68 kg korrigiert
    // (neue Daten zum Lieferkettenstrom) – hier steht der aktuelle Stand.
    model: "iphone-12",
    kgCO2e: 68,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone 13 (Vergleichstabelle iPhone 12 64 GB), September 2021",
  },
  {
    model: "iphone-se-2022",
    kgCO2e: 46,
    source: "hersteller",
    basis: "Apple Product Environmental Report, iPhone SE (3. Generation) 64 GB, März 2022",
  },

  // --- Google ------------------------------------------------------------
  // Product Environmental Report, jeweils mit dreijähriger Nutzungsdauer
  // gerechnet – dieselbe Annahme wie bei Apples iOS-Geräten.
  {
    model: "pixel-9-pro",
    kgCO2e: 72,
    source: "hersteller",
    basis: "Google Pixel 9 Pro Product Environmental Report, 2024",
  },
  {
    model: "pixel-9",
    kgCO2e: 64,
    source: "hersteller",
    basis: "Google Pixel 9 Product Environmental Report, 2024",
  },
  {
    model: "pixel-8-pro",
    kgCO2e: 79,
    source: "hersteller",
    basis: "Google Pixel 8 Pro Product Environmental Report, 2023",
  },
  {
    model: "pixel-8",
    kgCO2e: 68,
    source: "hersteller",
    basis: "Google Pixel 8 Product Environmental Report, 2023",
  },
  {
    model: "pixel-7a",
    kgCO2e: 59,
    source: "hersteller",
    basis: "Google Pixel 7a Product Environmental Report, 2023",
  },
  {
    model: "pixel-7",
    kgCO2e: 70,
    source: "hersteller",
    basis: "Google Pixel 7 Product Environmental Report, 2022",
  },
  {
    model: "pixel-6a",
    kgCO2e: 65,
    source: "hersteller",
    basis: "Google Pixel 6a Product Environmental Report, 2022",
  },

  // --- Samsung -------------------------------------------------------------
  // Life Cycle Assessment, Carbon-Trust-zertifiziert („CO2 Measured"),
  // UK-Konfiguration – so wie Samsung die Zahl selbst ausweist, inklusive
  // der Nachkommastelle.
  {
    model: "galaxy-s24-ultra",
    kgCO2e: 66.4,
    source: "hersteller",
    basis: "Samsung Galaxy S24 Ultra Product Environmental Report, 2024",
  },
  {
    model: "galaxy-s24",
    kgCO2e: 50.3,
    source: "hersteller",
    basis: "Samsung Galaxy S24 Product Environmental Report, 2024",
  },
  {
    model: "galaxy-s23-ultra",
    kgCO2e: 70.6,
    source: "hersteller",
    basis: "Samsung Galaxy S23 Ultra Product Environmental Report, 2023",
  },
  {
    model: "galaxy-s23",
    kgCO2e: 54.0,
    source: "hersteller",
    basis: "Samsung Galaxy S23 Product Environmental Report, 2023",
  },
  {
    model: "galaxy-z-flip-5",
    kgCO2e: 54.6,
    source: "hersteller",
    basis: "Samsung Galaxy Z Flip5 Product Environmental Report, 2023",
  },

  // Kein Eintrag für galaxy-s22, galaxy-a54, galaxy-a34: kein eigenständiger
  // Umweltbericht mit Herstellungs-Fußabdruck auffindbar.
];

const byModel = new Map(co2Entries.map((entry) => [entry.model, entry]));

export function co2For(modelId: string): Co2Entry | undefined {
  return byModel.get(modelId);
}
