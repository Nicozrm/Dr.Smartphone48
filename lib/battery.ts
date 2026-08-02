/*
  Akku-Modell.

  Lithium-Ionen-Zellen altern auf zwei Wegen gleichzeitig, und fast jede
  Ratgeberseite verwechselt sie:

  – Kalendarisch. Die Zelle altert, auch wenn das Gerät in der Schublade
    liegt. Treiber sind Temperatur und der mittlere Ladestand. Der Verlauf
    ist wurzelförmig: Am Anfang geht es schnell, dann flacht es ab.
  – Zyklisch. Jede geladene Ladungsmenge kostet Kapazität. Entscheidend
    ist nicht, wie oft der Stecker im Gerät steckt, sondern wie viel
    Ladung insgesamt durch die Zelle geht – gemessen in Vollzyklen.

  Genau daraus folgt die Erkenntnis, die den meisten fehlt: Ein Ladefenster
  von 40 bis 80 Prozent hilft nicht deshalb, weil 60 Prozent ein besserer
  Mittelwert wäre – 0 bis 100 hat denselben Mittelwert. Es hilft, weil jede
  Ladung nur noch 0,4 Vollzyklen statt einem kostet.

  Was dieses Modell ist: eine grobe, aber in sich schlüssige Rechnung mit
  offengelegten Konstanten. Was es nicht ist: eine Messung. Der tatsächliche
  Zustand einer Zelle lässt sich nur am Gerät auslesen, und genau das steht
  auch in der Oberfläche.
*/

export type ChargeWindow = "voll" | "mittel" | "schonend";
export type Climate = "kuehl" | "normal" | "heiss";
export type FastCharging = "selten" | "taeglich" | "oft";

export interface BatteryHabits {
  window: ChargeWindow;
  /** Über Nacht am Kabel liegen lassen – hebt den mittleren Ladestand. */
  overnight: boolean;
  climate: Climate;
  fast: FastCharging;
  /** Ladevorgänge pro Tag. */
  chargesPerDay: number;
}

export const chargeWindows: {
  id: ChargeWindow;
  label: string;
  detail: string;
  low: number;
  high: number;
}[] = [
  { id: "voll", label: "0 – 100 %", detail: "Leer fahren, voll laden", low: 5, high: 100 },
  { id: "mittel", label: "20 – 90 %", detail: "Der übliche Kompromiss", low: 20, high: 90 },
  { id: "schonend", label: "40 – 80 %", detail: "Kurze Ladungen, nie ganz voll", low: 40, high: 80 },
];

export const climates: { id: Climate; label: string; detail: string; factor: number }[] = [
  { id: "kuehl", label: "Meist kühl", detail: "Unter 25 °C, selten in der Sonne", factor: 0.8 },
  { id: "normal", label: "Normal", detail: "Zimmertemperatur, gelegentlich warm", factor: 1 },
  {
    id: "heiss",
    label: "Oft heiß",
    detail: "Auto, Sonne, langes Spielen, Laden unter dem Kopfkissen",
    factor: 1.45,
  },
];

export const fastChargingLevels: {
  id: FastCharging;
  label: string;
  detail: string;
  factor: number;
}[] = [
  { id: "selten", label: "Selten", detail: "Meist am normalen Netzteil", factor: 1 },
  { id: "taeglich", label: "Täglich", detail: "Einmal am Tag schnellladen", factor: 1.15 },
  { id: "oft", label: "Mehrmals täglich", detail: "Immer das stärkste Netzteil", factor: 1.3 },
];

/* ---- Konstanten des Modells -------------------------------------------
   Kalibriert auf den Erfahrungswert, dass ein normal genutztes Gerät nach
   zwei Jahren bei etwa 82 bis 85 Prozent liegt – dort, wo Hersteller den
   Tausch empfehlen und wo unsere Werkstatt die meisten Geräte auch
   tatsächlich misst. */

/**
 * Vorfaktor der zyklischen Alterung. Der Verlust wächst nicht linear mit
 * den Zyklen, sondern abgeflacht (Exponent 0,85): Die ersten hundert
 * Zyklen kosten mehr als die zweiten hundert. Ohne diese Abflachung
 * rechnet das Modell Vielladern absurde Werte aus.
 */
const CYCLE_COEFFICIENT = 0.0376;
const CYCLE_EXPONENT = 0.85;
/** Kalendarischer Verlust in Prozentpunkten je Wurzel-Tag. */
const LOSS_PER_SQRT_DAY = 0.2;
/** Ab hier gilt ein Akku gemeinhin als tauschreif. */
export const REPLACE_THRESHOLD = 80;

/** Mittlerer Ladestand als Anteil – Treiber der kalendarischen Alterung. */
function averageStateOfCharge(habits: BatteryHabits): number {
  const window = chargeWindows.find((w) => w.id === habits.window)!;
  const middle = (window.low + window.high) / 200;
  // Über Nacht am Kabel steht das Gerät stundenlang am oberen Ende.
  const raised = habits.overnight ? middle + 0.1 : middle;
  return Math.min(window.high / 100, raised);
}

/** Vollzyklen pro Tag: Ladevorgänge mal genutzte Ladungstiefe. */
export function cyclesPerDay(habits: BatteryHabits): number {
  const window = chargeWindows.find((w) => w.id === habits.window)!;
  const depth = (window.high - window.low) / 100;
  return habits.chargesPerDay * depth;
}

/** Geschätzte Akkugesundheit in Prozent nach `days` Tagen. */
export function healthAfter(habits: BatteryHabits, days: number): number {
  const climate = climates.find((c) => c.id === habits.climate)!;
  const fast = fastChargingLevels.find((f) => f.id === habits.fast)!;

  const socFactor = 0.55 + 0.75 * averageStateOfCharge(habits);
  const calendar = LOSS_PER_SQRT_DAY * climate.factor * socFactor * Math.sqrt(days);

  // Hitze wirkt auf beide Wege, auf den zyklischen aber schwächer – dort ist
  // der Ladestrom der Haupttreiber, die Umgebungstemperatur kommt hinzu.
  const cycles = cyclesPerDay(habits) * days;
  const cyclic =
    CYCLE_COEFFICIENT *
    fast.factor *
    Math.sqrt(climate.factor) *
    Math.pow(cycles, CYCLE_EXPONENT);

  return Math.max(0, 100 - calendar - cyclic);
}

export interface BatteryProjection {
  /** Ein Punkt je Monat, 0 bis 36. */
  curve: { month: number; health: number }[];
  /** Monat, in dem die Tauschschwelle unterschritten wird – null, wenn nicht. */
  replaceMonth: number | null;
  healthAt12: number;
  healthAt24: number;
  healthAt36: number;
  cyclesPerYear: number;
}

export function project(habits: BatteryHabits, months = 36): BatteryProjection {
  const curve: { month: number; health: number }[] = [];
  let replaceMonth: number | null = null;

  for (let month = 0; month <= months; month++) {
    const health = healthAfter(habits, (month * 365) / 12);
    curve.push({ month, health });
    if (replaceMonth === null && health < REPLACE_THRESHOLD) replaceMonth = month;
  }

  return {
    curve,
    replaceMonth,
    healthAt12: healthAfter(habits, 365),
    healthAt24: healthAfter(habits, 730),
    healthAt36: healthAfter(habits, 1095),
    cyclesPerYear: Math.round(cyclesPerDay(habits) * 365),
  };
}

/** Das Gewohnheitsprofil, an dem sich der Vergleich orientiert. */
export const typicalHabits: BatteryHabits = {
  window: "voll",
  overnight: true,
  climate: "normal",
  fast: "taeglich",
  chargesPerDay: 1,
};

export interface Advice {
  /** Was zu ändern wäre. */
  label: string;
  /** Warum das wirkt. */
  reason: string;
  /** Gewonnene Prozentpunkte nach drei Jahren. */
  gain: number;
}

/**
 * Sucht die eine Änderung, die am meisten bringt.
 *
 * Statt fünf Ratschläge aufzulisten, die niemand alle befolgt, wird jede
 * Einzeländerung durchgerechnet und die wirksamste genannt. Bringt keine
 * mehr als einen halben Prozentpunkt, gibt es nichts zu raten – dann sagt
 * die Oberfläche das auch.
 */
export function bestSingleChange(habits: BatteryHabits): Advice | null {
  const baseline = healthAfter(habits, 1095);

  const candidates: { habits: BatteryHabits; label: string; reason: string }[] = [];

  if (habits.window !== "schonend") {
    candidates.push({
      habits: { ...habits, window: "schonend" },
      label: "Zwischen 40 und 80 Prozent laden",
      reason:
        "Nicht wegen des Mittelwerts – 0 bis 100 hat denselben. Sondern weil jede Ladung dann nur noch 0,4 Vollzyklen kostet statt einem.",
    });
  }
  if (habits.overnight) {
    candidates.push({
      habits: { ...habits, overnight: false },
      label: "Nicht über Nacht am Kabel lassen",
      reason:
        "Stunden bei 100 Prozent sind der Treiber der kalendarischen Alterung. Wenn Ihr Gerät eine Option für optimiertes Laden hat: einschalten.",
    });
  }
  if (habits.climate === "heiss") {
    candidates.push({
      habits: { ...habits, climate: "normal" },
      label: "Hitze vermeiden",
      reason:
        "Wärme beschleunigt beide Alterungswege zugleich. Nicht im Auto liegen lassen, beim Laden die Hülle abnehmen, nicht unter dem Kopfkissen laden.",
    });
  }
  if (habits.fast !== "selten") {
    candidates.push({
      habits: { ...habits, fast: "selten" },
      label: "Seltener schnellladen",
      reason:
        "Schnellladen erzeugt Wärme in der Zelle. Wenn ohnehin Zeit ist – nachts, am Schreibtisch – tut es das kleinere Netzteil genauso.",
    });
  }

  const scored = candidates
    .map((c) => ({
      label: c.label,
      reason: c.reason,
      gain: healthAfter(c.habits, 1095) - baseline,
    }))
    .sort((a, b) => b.gain - a.gain);

  const best = scored[0];
  return best && best.gain >= 0.5 ? best : null;
}
