/**
 * Die Physik eines Sturzes.
 *
 * Hintergrund: Auf die Frage „warum ist das Display gebrochen, ich hab's doch
 * nur fallen lassen" gibt es eine Antwort, die niemand gibt, weil sie nach
 * Schulbuch klingt. Sie ist trotzdem die richtige und sie erklärt auch, warum
 * eine Hülle für 15 € wirkt und ein Panzerglas für 15 € kaum.
 *
 * Alles hier sind drei Formeln aus der Mechanik, ohne Beiwerk:
 *
 *   Fallhöhe aus der Fallzeit      h = ½ · g · t²
 *   Aufprallgeschwindigkeit        v = √(2 · g · h)
 *   Mittlere Verzögerung           a = v² / (2 · s)
 *
 * Die dritte ist die interessante. `s` ist der **Bremsweg** – die Strecke,
 * auf der das Gerät zum Stehen kommt. Auf Fliesen sind das Bruchteile eines
 * Millimeters, auf einem Teppich ein paar Millimeter. Der Unterschied geht
 * linear in die Verzögerung ein: Zehnfacher Bremsweg, ein Zehntel der Kraft.
 * Deshalb entscheidet nicht die Fallhöhe darüber, ob ein Display bricht,
 * sondern **worauf** es fällt – und deshalb wirkt eine weiche Hülle, die den
 * Bremsweg verlängert, besser als eine harte, die ihn nicht anfasst.
 *
 * ## Was hier gemessen und was gerechnet ist
 *
 * Gemessen wird genau eines: die Dauer des freien Falls. Sie ist der einzige
 * Wert, den ein Telefonsensor zuverlässig liefert (siehe unten). Alles andere
 * auf dieser Seite ist daraus **gerechnet** und wird auch so bezeichnet.
 *
 * ## Warum der Sensor den Aufprall nicht sieht
 *
 * `devicemotion` feuert je nach Gerät 30- bis 100-mal je Sekunde. Ein
 * Aufprall auf einer harten Fläche dauert etwa eine Millisekunde. Der Sensor
 * hat in dieser Zeit also mit hoher Wahrscheinlichkeit **gar keinen** Messwert
 * genommen, und wenn doch, dann einen zufälligen Punkt der Flanke.
 *
 * Der angezeigte Spitzenwert ist deshalb eine **Untergrenze** und wird so
 * benannt. Ein Instrument, das seine eigene Grenze verschweigt, ist ein
 * Ratespiel mit Nachkommastellen.
 */

/** Normfallbeschleunigung nach ISO 80000-3 (m/s²). */
export const G = 9.80665;

/** Fallhöhe aus der gemessenen Dauer des freien Falls (Sekunden → Meter). */
export function fallHeight(seconds: number): number {
  return 0.5 * G * seconds * seconds;
}

/** Umkehrung: Wie lange fällt etwas aus dieser Höhe? (Meter → Sekunden) */
export function fallTime(meters: number): number {
  return Math.sqrt((2 * meters) / G);
}

/** Aufprallgeschwindigkeit aus der Fallhöhe (Meter → m/s). */
export function impactVelocity(meters: number): number {
  return Math.sqrt(2 * G * meters);
}

/**
 * Mittlere Verzögerung beim Aufprall, in Vielfachen von g.
 *
 * `stopMeters` ist der Bremsweg. Der Wert ist die **mittlere** Verzögerung
 * über den ganzen Bremsweg; die Spitze liegt darüber. Für den Vergleich
 * zweier Untergründe ist der Mittelwert das ehrlichere Maß, weil die Spitze
 * von der genauen Form der Verzögerungskurve abhängt und die kennt hier
 * niemand.
 */
export function decelerationG(velocity: number, stopMeters: number): number {
  if (stopMeters <= 0) return Infinity;
  return (velocity * velocity) / (2 * stopMeters) / G;
}

/**
 * Untergründe mit ihrem Bremsweg.
 *
 * **Alle Werte sind Größenordnungen, keine Messungen** – deshalb steht auf
 * der Seite „Schätzung" dabei, dieselbe Regel wie beim Update-Horizont. Was
 * belastbar ist, ist nicht der Absolutwert, sondern das Verhältnis: Ein
 * Teppich bremst etwa zehnmal länger als eine Fliese, und genau um diesen
 * Faktor sinkt die Kraft.
 *
 * Wer hier Werte ändert, ändert nichts an der Aussage, solange die
 * Reihenfolge stimmt – `verify:motion` prüft genau das.
 */
export interface Surface {
  id: string;
  label: string;
  /** Bremsweg in Metern. Größenordnung, nicht gemessen. */
  stop: number;
  note: string;
}

export const surfaces: Surface[] = [
  {
    id: "fliese",
    label: "Fliese, Stein",
    stop: 0.0004,
    note: "Gibt praktisch nicht nach. Das Glas allein muss die Energie aufnehmen.",
  },
  {
    id: "holz",
    label: "Holz, Laminat",
    stop: 0.0012,
    note: "Federt minimal. Reicht oft schon, damit das Glas hält.",
  },
  {
    id: "huelle",
    label: "Weiche Hülle auf Stein",
    stop: 0.004,
    note: "Der Kunststoff wird zusammengedrückt und verlängert den Bremsweg.",
  },
  {
    id: "teppich",
    label: "Teppich",
    stop: 0.008,
    note: "Der Flor gibt über mehrere Millimeter nach.",
  },
  {
    id: "kissen",
    label: "Sofa, Bett",
    stop: 0.05,
    note: "Der Grund, warum ein Sturz aus dem Bett nie etwas macht.",
  },
];

/**
 * Ein erkanntes Ereignis aus dem Beschleunigungsschreiber.
 *
 * `peakG` ist ausdrücklich das, was der Sensor **gesehen** hat, nicht der
 * wahre Spitzenwert – siehe Kopfkommentar.
 */
export interface MotionEventSummary {
  /** Dauer des freien Falls in Sekunden, 0 wenn keiner erkannt wurde. */
  freeFallSeconds: number;
  /** Höchster gemessener Betrag in g. */
  peakG: number;
  /** Tatsächlich erreichte Abtastrate in Hertz. */
  sampleRate: number;
}

/**
 * Schwellen der Erkennung.
 *
 * Freier Fall heißt: Der Beschleunigungsmesser misst die *Eigenbeschleunigung*
 * und die ist beim Fallen null – ein ruhendes Gerät zeigt 1 g, ein fallendes
 * 0 g. Die Schwelle liegt bei 0.35 g statt bei 0, weil ein Telefon beim
 * Fallen taumelt und der Sensor nicht exakt im Schwerpunkt sitzt.
 */
export const FREEFALL_G = 0.35;

/** Ab hier gilt es als Aufprall. Ein festes Aufsetzen erreicht 3–8 g. */
export const IMPACT_G = 2.5;

/** Kürzer als das ist kein Fall, sondern ein Ruck. 60 ms ≈ 1.8 cm. */
export const MIN_FREEFALL_MS = 60;
