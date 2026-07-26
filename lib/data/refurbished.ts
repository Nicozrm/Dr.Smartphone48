export type Grade = "premium" | "sehr-gut" | "gut";

export interface GradeMeta {
  id: Grade;
  label: string;
  description: string;
}

export const grades: GradeMeta[] = [
  {
    id: "premium",
    label: "Wie neu",
    description: "Keine sichtbaren Gebrauchsspuren. Akkukapazität mindestens 95 %.",
  },
  {
    id: "sehr-gut",
    label: "Sehr gut",
    description: "Minimale Spuren, nur bei genauem Hinsehen. Akku mindestens 90 %.",
  },
  {
    id: "gut",
    label: "Gut",
    description: "Leichte Gebrauchsspuren, technisch einwandfrei. Akku mindestens 85 %.",
  },
];

export interface RefurbishedDevice {
  id: string;
  brand: string;
  name: string;
  storage: string;
  color: string;
  grade: Grade;
  battery: number;
  price: number;
  originalPrice: number;
}

export const refurbishedDevices: RefurbishedDevice[] = [
  {
    id: "rf-iphone-15-pro",
    brand: "Apple",
    name: "iPhone 15 Pro",
    storage: "256 GB",
    color: "Titan Natur",
    grade: "premium",
    battery: 98,
    price: 829,
    originalPrice: 1199,
  },
  {
    id: "rf-iphone-15",
    brand: "Apple",
    name: "iPhone 15",
    storage: "128 GB",
    color: "Schwarz",
    grade: "sehr-gut",
    battery: 93,
    price: 599,
    originalPrice: 949,
  },
  {
    id: "rf-iphone-14-pro",
    brand: "Apple",
    name: "iPhone 14 Pro",
    storage: "128 GB",
    color: "Space Schwarz",
    grade: "sehr-gut",
    battery: 91,
    price: 549,
    originalPrice: 1299,
  },
  {
    id: "rf-iphone-13",
    brand: "Apple",
    name: "iPhone 13",
    storage: "128 GB",
    color: "Mitternacht",
    grade: "gut",
    battery: 87,
    price: 349,
    originalPrice: 899,
  },
  {
    id: "rf-galaxy-s24",
    brand: "Samsung",
    name: "Galaxy S24",
    storage: "256 GB",
    color: "Onyx Black",
    grade: "premium",
    battery: 97,
    price: 549,
    originalPrice: 899,
  },
  {
    id: "rf-galaxy-s23-ultra",
    brand: "Samsung",
    name: "Galaxy S23 Ultra",
    storage: "256 GB",
    color: "Phantom Black",
    grade: "sehr-gut",
    battery: 92,
    price: 619,
    originalPrice: 1399,
  },
  {
    id: "rf-galaxy-a54",
    brand: "Samsung",
    name: "Galaxy A54",
    storage: "128 GB",
    color: "Awesome Graphite",
    grade: "gut",
    battery: 88,
    price: 219,
    originalPrice: 489,
  },
  {
    id: "rf-pixel-8-pro",
    brand: "Google",
    name: "Pixel 8 Pro",
    storage: "128 GB",
    color: "Obsidian",
    grade: "premium",
    battery: 96,
    price: 499,
    originalPrice: 1099,
  },
  {
    id: "rf-pixel-8",
    brand: "Google",
    name: "Pixel 8",
    storage: "128 GB",
    color: "Hazel",
    grade: "sehr-gut",
    battery: 94,
    price: 379,
    originalPrice: 799,
  },
  {
    id: "rf-pixel-7a",
    brand: "Google",
    name: "Pixel 7a",
    storage: "128 GB",
    color: "Charcoal",
    grade: "gut",
    battery: 86,
    price: 229,
    originalPrice: 509,
  },
];
