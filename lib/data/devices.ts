export type RepairKind =
  | "display"
  | "battery"
  | "backglass"
  | "camera"
  | "chargeport"
  | "speaker"
  | "water"
  | "diagnose";

export type DiagramPart =
  | "screen"
  | "battery"
  | "back"
  | "camera"
  | "port"
  | "speaker"
  | "board"
  | "full";

export interface RepairMeta {
  kind: RepairKind;
  label: string;
  description: string;
  part: DiagramPart;
  minutes: number;
}

export const repairMeta: Record<RepairKind, RepairMeta> = {
  display: {
    kind: "display",
    label: "Display",
    description: "Bruch, Pixelfehler oder Touch reagiert nicht",
    part: "screen",
    minutes: 45,
  },
  battery: {
    kind: "battery",
    label: "Akku",
    description: "Schwache Laufzeit oder plötzliches Abschalten",
    part: "battery",
    minutes: 30,
  },
  backglass: {
    kind: "backglass",
    label: "Rückglas",
    description: "Gesprungene oder zerkratzte Rückseite",
    part: "back",
    minutes: 60,
  },
  camera: {
    kind: "camera",
    label: "Kamera",
    description: "Unscharfe Bilder, Flecken oder Ausfall",
    part: "camera",
    minutes: 40,
  },
  chargeport: {
    kind: "chargeport",
    label: "Ladebuchse",
    description: "Lädt nur in bestimmter Position oder gar nicht",
    part: "port",
    minutes: 45,
  },
  speaker: {
    kind: "speaker",
    label: "Lautsprecher",
    description: "Leiser, verzerrter oder kein Ton",
    part: "speaker",
    minutes: 35,
  },
  water: {
    kind: "water",
    label: "Wasserschaden",
    description: "Kontakt mit Flüssigkeit – je früher, desto besser",
    part: "board",
    minutes: 1440,
  },
  diagnose: {
    kind: "diagnose",
    label: "Diagnose",
    description: "Ursache unklar – wir finden sie. Kostenlos.",
    part: "full",
    minutes: 20,
  },
};

export interface DeviceModel {
  id: string;
  name: string;
  year: number;
  /** Preise in Euro je Reparaturart; fehlende Arten werden nicht angeboten */
  prices: Partial<Record<RepairKind, number>>;
}

export interface Brand {
  id: string;
  name: string;
  models: DeviceModel[];
}

function model(
  id: string,
  name: string,
  year: number,
  display: number,
  battery: number,
  camera: number,
  chargeport: number,
  speaker: number,
  backglass?: number,
): DeviceModel {
  return {
    id,
    name,
    year,
    prices: {
      display,
      battery,
      camera,
      chargeport,
      speaker,
      ...(backglass !== undefined ? { backglass } : {}),
      water: 49,
      diagnose: 0,
    },
  };
}

export const brands: Brand[] = [
  {
    id: "apple",
    name: "Apple",
    models: [
      model("iphone-16-pro-max", "iPhone 16 Pro Max", 2024, 429, 119, 189, 129, 99, 199),
      model("iphone-16-pro", "iPhone 16 Pro", 2024, 389, 115, 179, 125, 95, 189),
      model("iphone-16", "iPhone 16", 2024, 329, 109, 149, 119, 89, 169),
      model("iphone-15-pro", "iPhone 15 Pro", 2023, 349, 105, 169, 119, 89, 179),
      model("iphone-15", "iPhone 15", 2023, 289, 99, 139, 109, 85, 149),
      model("iphone-14-pro", "iPhone 14 Pro", 2022, 299, 95, 149, 109, 79, 159),
      model("iphone-14", "iPhone 14", 2022, 249, 89, 129, 99, 75, 139),
      model("iphone-13", "iPhone 13", 2021, 199, 79, 109, 89, 69, 119),
      model("iphone-12", "iPhone 12", 2020, 169, 69, 99, 85, 65, 109),
      model("iphone-se-2022", "iPhone SE (2022)", 2022, 129, 59, 79, 75, 59),
    ],
  },
  {
    id: "samsung",
    name: "Samsung",
    models: [
      model("galaxy-s24-ultra", "Galaxy S24 Ultra", 2024, 379, 109, 169, 119, 89, 169),
      model("galaxy-s24", "Galaxy S24", 2024, 299, 99, 139, 109, 79, 139),
      model("galaxy-s23-ultra", "Galaxy S23 Ultra", 2023, 329, 99, 149, 109, 85, 149),
      model("galaxy-s23", "Galaxy S23", 2023, 259, 89, 129, 99, 75, 129),
      model("galaxy-s22", "Galaxy S22", 2022, 219, 79, 109, 95, 69, 109),
      model("galaxy-z-flip-5", "Galaxy Z Flip5", 2023, 399, 105, 149, 115, 85, 159),
      model("galaxy-a54", "Galaxy A54", 2023, 169, 69, 89, 79, 59, 89),
      model("galaxy-a34", "Galaxy A34", 2023, 139, 65, 79, 75, 55, 79),
    ],
  },
  {
    id: "google",
    name: "Google",
    models: [
      model("pixel-9-pro", "Pixel 9 Pro", 2024, 329, 105, 159, 115, 85, 149),
      model("pixel-9", "Pixel 9", 2024, 279, 99, 139, 105, 79, 129),
      model("pixel-8-pro", "Pixel 8 Pro", 2023, 289, 95, 139, 105, 79, 129),
      model("pixel-8", "Pixel 8", 2023, 239, 89, 119, 95, 75, 109),
      model("pixel-7a", "Pixel 7a", 2023, 169, 75, 95, 85, 65, 89),
      model("pixel-7", "Pixel 7", 2022, 189, 79, 99, 89, 69, 99),
      model("pixel-6a", "Pixel 6a", 2022, 139, 69, 85, 79, 59, 79),
    ],
  },
];

export function findBrand(brandId: string): Brand | undefined {
  return brands.find((b) => b.id === brandId);
}

export function findModel(
  brandId: string,
  modelId: string,
): { brand: Brand; model: DeviceModel } | undefined {
  const brand = findBrand(brandId);
  const found = brand?.models.find((m) => m.id === modelId);
  return brand && found ? { brand, model: found } : undefined;
}

export function repairsForModel(m: DeviceModel): (RepairMeta & { price: number })[] {
  return (Object.keys(m.prices) as RepairKind[]).map((kind) => ({
    ...repairMeta[kind],
    price: m.prices[kind]!,
  }));
}
