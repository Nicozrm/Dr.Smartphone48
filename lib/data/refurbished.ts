export type Grade = "premium" | "sehr-gut" | "gut";

export interface GradeMeta {
  id: Grade;
  label: string;
  description: string;
  /** Mindestkapazität des Akkus für diesen Grad, in Prozent. */
  minBattery: number;
}

export const grades: GradeMeta[] = [
  {
    id: "premium",
    label: "Wie neu",
    description: "Keine sichtbaren Gebrauchsspuren. Akkukapazität mindestens 95 %.",
    minBattery: 95,
  },
  {
    id: "sehr-gut",
    label: "Sehr gut",
    description: "Minimale Spuren, nur bei genauem Hinsehen. Akku mindestens 90 %.",
    minBattery: 90,
  },
  {
    id: "gut",
    label: "Gut",
    description: "Leichte Gebrauchsspuren, technisch einwandfrei. Akku mindestens 85 %.",
    minBattery: 85,
  },
];

export interface RefurbishedDevice {
  id: string;
  /**
   * Modell-Kennung aus `lib/data/devices.ts`. Ausdrücklich hinterlegt und
   * nicht aus `id` abgeleitet: Über diesen Verweis hängen Reparaturpreise
   * und Update-Horizont am Gerät, und eine stillschweigende Namenskonvention
   * bricht irgendwann, ohne dass jemand es merkt. `verify:inspection` prüft,
   * dass jede Kennung in beiden Tabellen auflösbar ist.
   */
  model: string;
  brand: string;
  name: string;
  storage: string;
  color: string;
  grade: Grade;
  battery: number;
  price: number;
  originalPrice: number;

  /*
    Die folgenden vier Felder stehen im Prüfprotokoll (/refurbished/<id>).
    Sie sind der Grund, warum das Protokoll pro Gerät etwas aussagt und nicht
    nur eine Liste von Häkchen ist – und sie werden bei der Aufbereitung
    erfasst, nicht beim Rendern erfunden.
  */

  /** Ausgelesene Ladezyklen. Erklärt die Restkapazität. */
  cycles: number;
  /** Datum der Endprüfung, ISO. */
  checkedOn: string;
  /** Bei der Aufbereitung ersetzte Bauteile. Leer heißt: alles original. */
  replaced: string[];
  /**
   * Der ehrliche Satz zum Zustand. Was bei der Sichtprüfung auffiel – auch
   * dann, wenn es den Preis drückt. Fehlt nur bei Geräten ohne Befund.
   */
  note?: string;
}

export const refurbishedDevices: RefurbishedDevice[] = [
  {
    id: "rf-iphone-15-pro",
    model: "iphone-15-pro",
    brand: "Apple",
    name: "iPhone 15 Pro",
    storage: "256 GB",
    color: "Titan Natur",
    grade: "premium",
    battery: 98,
    price: 829,
    originalPrice: 1199,
    cycles: 12,
    checkedOn: "2026-07-24",
    replaced: ["Akku (Original)"],
  },
  {
    id: "rf-iphone-15",
    model: "iphone-15",
    brand: "Apple",
    name: "iPhone 15",
    storage: "128 GB",
    color: "Schwarz",
    grade: "sehr-gut",
    battery: 93,
    price: 599,
    originalPrice: 949,
    cycles: 214,
    checkedOn: "2026-07-21",
    replaced: [],
    note: "Zwei feine Kratzer an der unteren Rahmenkante, im Betrieb nicht zu sehen.",
  },
  {
    id: "rf-iphone-14-pro",
    model: "iphone-14-pro",
    brand: "Apple",
    name: "iPhone 14 Pro",
    storage: "128 GB",
    color: "Space Schwarz",
    grade: "sehr-gut",
    battery: 91,
    price: 549,
    originalPrice: 1299,
    cycles: 287,
    checkedOn: "2026-07-18",
    replaced: ["Displayeinheit (Original)", "Kleberahmen"],
    note: "Displayeinheit wurde bei der Aufbereitung ersetzt. Rahmen mit minimalen Spuren an zwei Ecken.",
  },
  {
    id: "rf-iphone-13",
    model: "iphone-13",
    brand: "Apple",
    name: "iPhone 13",
    storage: "128 GB",
    color: "Mitternacht",
    grade: "gut",
    battery: 87,
    price: 349,
    originalPrice: 899,
    cycles: 412,
    checkedOn: "2026-07-15",
    replaced: [],
    note: "Sichtbare Gebrauchsspuren am Rahmen, Rückglas mit feinen Kratzern. Display ohne Befund.",
  },
  {
    id: "rf-galaxy-s24",
    model: "galaxy-s24",
    brand: "Samsung",
    name: "Galaxy S24",
    storage: "256 GB",
    color: "Onyx Black",
    grade: "premium",
    battery: 97,
    price: 549,
    originalPrice: 899,
    cycles: 9,
    checkedOn: "2026-07-25",
    replaced: ["Akku (Original)", "Kleberahmen"],
  },
  {
    id: "rf-galaxy-s23-ultra",
    model: "galaxy-s23-ultra",
    brand: "Samsung",
    name: "Galaxy S23 Ultra",
    storage: "256 GB",
    color: "Phantom Black",
    grade: "sehr-gut",
    battery: 92,
    price: 619,
    originalPrice: 1399,
    cycles: 243,
    checkedOn: "2026-07-22",
    replaced: [],
    note: "Feiner Kratzer in der oberen Displayecke, nur bei ausgeschaltetem Bildschirm sichtbar.",
  },
  {
    id: "rf-galaxy-a54",
    model: "galaxy-a54",
    brand: "Samsung",
    name: "Galaxy A54",
    storage: "128 GB",
    color: "Awesome Graphite",
    grade: "gut",
    battery: 88,
    price: 219,
    originalPrice: 489,
    cycles: 366,
    checkedOn: "2026-07-16",
    replaced: ["Ladebuchse"],
    note: "Gebrauchsspuren an allen vier Ecken, Rückseite matt gescheuert. Ladebuchse ersetzt.",
  },
  {
    id: "rf-pixel-8-pro",
    model: "pixel-8-pro",
    brand: "Google",
    name: "Pixel 8 Pro",
    storage: "128 GB",
    color: "Obsidian",
    grade: "premium",
    battery: 96,
    price: 499,
    originalPrice: 1099,
    cycles: 18,
    checkedOn: "2026-07-23",
    replaced: ["Akku (Original)"],
  },
  {
    id: "rf-pixel-8",
    model: "pixel-8",
    brand: "Google",
    name: "Pixel 8",
    storage: "128 GB",
    color: "Hazel",
    grade: "sehr-gut",
    battery: 94,
    price: 379,
    originalPrice: 799,
    cycles: 176,
    checkedOn: "2026-07-20",
    replaced: [],
    note: "Minimale Spuren an der unteren Rahmenkante.",
  },
  {
    id: "rf-pixel-7a",
    model: "pixel-7a",
    brand: "Google",
    name: "Pixel 7a",
    storage: "128 GB",
    color: "Charcoal",
    grade: "gut",
    battery: 86,
    price: 229,
    originalPrice: 509,
    cycles: 438,
    checkedOn: "2026-07-14",
    replaced: [],
    note: "Deutliche Gebrauchsspuren am Rahmen, Display ohne Kratzer.",
  },
];

/** Ein Gerät anhand seiner Kennung. */
export function findRefurbished(id: string): RefurbishedDevice | undefined {
  return refurbishedDevices.find((device) => device.id === id);
}

/**
 * Prüfnummer des Protokolls. Sie wird aus Kennung und Prüfdatum abgeleitet
 * und ist damit stabil: Dieselbe Nummer steht auf dem Bildschirm, auf dem
 * Ausdruck in der Verpackung und in unserem Ordner.
 */
export function protocolNumber(device: RefurbishedDevice): string {
  const [year, month, day] = device.checkedOn.split("-");
  let hash = 0;
  for (const char of device.id) hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  return `PP-${year}${month}${day}-${String(hash).padStart(4, "0")}`;
}
