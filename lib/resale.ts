/*
  Ankauf-Bewertung.

  Jeder Ankaufsrechner dieser Branche funktioniert gleich: Man klickt sich
  durch vier Fragen und bekommt eine Zahl. Wie sie zustande kam, erfährt man
  nicht – und genau deshalb glaubt sie einem niemand.

  Hier ist es umgekehrt. Die Bewertung ist eine Liste von Posten, jeder mit
  Betrag und Begründung, und die Seite zeigt sie vollständig. Wer will, kann
  nachrechnen. Ein Ankaufspreis, den man nachrechnen kann, ist der einzige,
  über den sich vernünftig verhandeln lässt.

  Zwei Ehrlichkeiten sind fest eingebaut:

  – Das Ergebnis ist eine Spanne, kein Preis. Den endgültigen Betrag kann
    nur die Prüfung vor Ort nennen, und das steht auch so da.
  – Ist ein Konto noch mit dem Gerät verknüpft, gibt es keinen Preis,
    sondern eine Erklärung. Ein gesperrtes Gerät ist unverkäuflich, egal
    wie gut es aussieht.
*/

import type { DeviceModel } from "@/lib/data/devices";

export type Condition = "wie-neu" | "gut" | "gebraucht" | "defekt";
export type Storage = "128" | "256" | "512" | "1024";
export type BatteryHealth = "gut" | "mittel" | "schwach" | "unbekannt";

export interface ResaleInput {
  model: DeviceModel;
  condition: Condition;
  storage: Storage;
  battery: BatteryHealth;
  /** Displaybruch, Rückglas, Kamera – gemeldete Defekte. */
  faults: string[];
  /** Originalkarton und Zubehör vorhanden. */
  boxed: boolean;
  /** Konto (iCloud / Google) ist noch mit dem Gerät verknüpft. */
  locked: boolean;
}

export interface ResaleLine {
  label: string;
  detail: string;
  /** Betrag in Euro; negativ ist ein Abzug. */
  amount: number;
  /** Der Ausgangswert, gegen den gerechnet wird. */
  base?: boolean;
}

export interface ResaleResult {
  lines: ResaleLine[];
  /** Untere Grenze der Spanne. */
  low: number;
  /** Obere Grenze der Spanne. */
  high: number;
  /** Gesperrte Geräte kaufen wir nicht an. */
  blocked: boolean;
}

export const conditions: { id: Condition; label: string; detail: string; factor: number }[] = [
  {
    id: "wie-neu",
    label: "Wie neu",
    detail: "Keine sichtbaren Spuren, auch nicht im Gegenlicht",
    factor: 0.1,
  },
  {
    id: "gut",
    label: "Gut",
    detail: "Leichte Gebrauchsspuren am Rahmen, Glas ohne Kratzer",
    factor: 0,
  },
  {
    id: "gebraucht",
    label: "Deutliche Spuren",
    detail: "Kratzer im Glas, Absplitterungen am Rahmen – alles funktioniert",
    factor: -0.22,
  },
  {
    id: "defekt",
    label: "Defekt",
    detail: "Startet nicht, Wasserschaden oder mehrere Fehler zugleich",
    factor: -0.72,
  },
];

export const storages: { id: Storage; label: string; bonus: number }[] = [
  { id: "128", label: "128 GB", bonus: 0 },
  { id: "256", label: "256 GB", bonus: 35 },
  { id: "512", label: "512 GB", bonus: 80 },
  { id: "1024", label: "1 TB", bonus: 135 },
];

export const batteryStates: { id: BatteryHealth; label: string; detail: string }[] = [
  { id: "gut", label: "Über 85 %", detail: "Hält einen Tag ohne Nachladen" },
  { id: "mittel", label: "80 – 85 %", detail: "Merklich kürzer als früher" },
  { id: "schwach", label: "Unter 80 %", detail: "Muss zwischendurch geladen werden" },
  { id: "unbekannt", label: "Weiß ich nicht", detail: "Wir messen es kostenlos vor Ort" },
];

/** Defekte, die den Wert direkt um die Reparaturkosten mindern. */
export const faultOptions: { id: string; label: string; kind: keyof DeviceModel["prices"] }[] = [
  { id: "display", label: "Display gebrochen", kind: "display" },
  { id: "backglass", label: "Rückglas gebrochen", kind: "backglass" },
  { id: "camera", label: "Kamera defekt", kind: "camera" },
  { id: "chargeport", label: "Lädt nicht zuverlässig", kind: "chargeport" },
];

/** Aktuelles Jahr als Konstante – der Alterszuschlag soll nachvollziehbar sein. */
const CURRENT_YEAR = 2026;

export function evaluateResale(input: ResaleInput): ResaleResult {
  const { model, condition, storage, battery, faults, boxed, locked } = input;

  if (locked) {
    return { lines: [], low: 0, high: 0, blocked: true };
  }

  const base = model.resale;
  const lines: ResaleLine[] = [
    {
      label: "Basiswert",
      detail: `${model.name}, voll funktionsfähig, guter Zustand, 128 GB`,
      amount: base,
      base: true,
    },
  ];

  // Alter: pro Jahr über zwei Jahren hinaus ein weiterer Abschlag. Die ersten
  // beiden Jahre stecken bereits im Basiswert.
  const age = Math.max(0, CURRENT_YEAR - model.year);
  const extraYears = Math.max(0, age - 2);
  if (extraYears > 0) {
    const amount = -Math.round(base * Math.min(0.4, extraYears * 0.08));
    lines.push({
      label: "Alter",
      detail: `Baujahr ${model.year}. Die ersten zwei Jahre stecken im Basiswert, für die ${extraYears} weiteren rechnen wir 8 % pro Jahr`,
      amount,
    });
  }

  const cond = conditions.find((c) => c.id === condition)!;
  if (cond.factor !== 0) {
    lines.push({
      label: `Zustand: ${cond.label}`,
      detail: cond.detail,
      amount: Math.round(base * cond.factor),
    });
  }

  const store = storages.find((s) => s.id === storage)!;
  if (store.bonus !== 0) {
    lines.push({
      label: `Speicher: ${store.label}`,
      detail: "Größerer Speicher lässt sich besser weiterverkaufen",
      amount: store.bonus,
    });
  }

  // Akku: unter 80 % tauschen wir ihn vor dem Weiterverkauf, also fließt der
  // Preis des Tauschs direkt ein. Das ist kein Verhandlungsspielraum, das
  // ist die Rechnung.
  if (battery === "schwach") {
    lines.push({
      label: "Akku unter 80 %",
      detail: `Wir tauschen ihn vor dem Weiterverkauf – zum selben Preis wie im Reparaturangebot (${model.prices.battery ?? 0} €)`,
      amount: -(model.prices.battery ?? 0),
    });
  } else if (battery === "mittel") {
    lines.push({
      label: "Akku 80 – 85 %",
      detail: "Noch im Rahmen, aber näher am Tausch als am Neuzustand",
      amount: -Math.round((model.prices.battery ?? 0) * 0.4),
    });
  }

  // Gemeldete Defekte kosten genau das, was ihre Reparatur kostet.
  for (const faultId of faults) {
    const fault = faultOptions.find((f) => f.id === faultId);
    if (!fault) continue;
    const price = model.prices[fault.kind];
    if (price === undefined) continue;
    lines.push({
      label: fault.label,
      detail: `Instandsetzung vor dem Weiterverkauf, zum Festpreis aus unserer Preisliste`,
      amount: -price,
    });
  }

  if (boxed) {
    lines.push({
      label: "Karton und Zubehör",
      detail: "Vollständige Originalverpackung erhöht den Wiederverkaufswert",
      amount: 15,
    });
  }

  const sum = lines.reduce((total, line) => total + line.amount, 0);
  // Nie unter null: Ein Gerät, dessen Instandsetzung mehr kostet als es wert
  // ist, nehmen wir trotzdem an – dann eben zur fachgerechten Verwertung.
  const value = Math.max(0, sum);

  // Spanne statt Punkt: Was am Ende zählt, ist die Prüfung vor Ort.
  return {
    lines,
    low: Math.max(0, Math.round((value * 0.9) / 5) * 5),
    high: Math.round((value * 1.05) / 5) * 5,
    blocked: false,
  };
}
