/**
 * Warum ein kleiner Riss kein kleiner Riss ist.
 *
 * Der häufigste Satz am Tresen nach „ist doch nur runtergefallen" lautet
 * „ist doch nur ein Kratzer". Beides klingt harmlos, und beim zweiten ist
 * das Gegenteil der Fall: Ein Kratzer im Deckglas ist keine Schönheitssache,
 * er ist eine Spannungsfalle.
 *
 * Glas bricht nicht, weil es überall zu schwach wäre. Es bricht an einem
 * Fehler, weil sich an dessen Spitze die Spannung bündelt – wie Licht in
 * einer Linse. Charles Inglis hat das 1913 für ein elliptisches Loch in
 * einer gezogenen Platte hingeschrieben:
 *
 *     σ_Spitze = σ · (1 + 2 · √(a / ρ))
 *
 * `a` ist die Tiefe des Fehlers, `ρ` der Krümmungsradius an seiner Spitze.
 * Die Formel sagt etwas Unangenehmes: Nicht die Tiefe allein entscheidet,
 * sondern ihr Verhältnis zur Schärfe. Ein 50 µm tiefer Kratzer mit einer
 * Spitze von einem halben Mikrometer vervielfacht die Spannung um das
 * Einundzwanzigfache. Das Glas hält dann bei einem Zwanzigstel der Last, die
 * es ungeschädigt getragen hätte.
 *
 * Das erklärt drei Dinge, die Kunden regelmäßig erstaunen:
 *
 * - Warum ein Display beim zweiten, harmloseren Sturz bricht und beim ersten
 *   nicht: Der erste hat den Kratzer gemacht.
 * - Warum ein Riss ohne neuen Sturz weiterwandert. An der Spitze reicht
 *   schon die Spannung aus Temperaturwechsel und Verwindung in der Tasche.
 * - Warum eine Schutzfolie mehr bringt, als sie aussieht: Sie nimmt die
 *   Kratzer, nicht die Stöße.
 *
 * ## Was diese Rechnung ist und was nicht
 *
 * Inglis beschreibt ein **elliptisches Loch in einer unendlich ausgedehnten
 * Platte unter gleichmäßigem Zug** – eine Idealisierung. Die moderne
 * Bruchmechanik rechnet mit Spannungsintensitätsfaktoren, weil die Spannung
 * an einer wirklich scharfen Spitze mathematisch über alle Grenzen wächst,
 * ein Werkstoff aber nicht.
 *
 * Für die Frage, um die es hier geht, ist die alte Formel trotzdem die
 * bessere: Sie liefert eine Zahl, die man versteht („einundzwanzigmal"), und
 * ihre Aussage – Schärfe zählt mehr als Tiefe – stimmt auch in der modernen
 * Rechnung. Auf der Seite steht die Einschränkung dabei.
 */

/**
 * Spannungsüberhöhung an der Spitze eines Fehlers.
 *
 * Beide Längen in Metern, das Ergebnis ist ein Faktor: 21 heißt
 * einundzwanzigfache Spannung gegenüber der ungestörten Fläche.
 */
export function stressConcentration(depth: number, tipRadius: number): number {
  if (tipRadius <= 0) return Infinity;
  if (depth <= 0) return 1;
  return 1 + 2 * Math.sqrt(depth / tipRadius);
}

/**
 * Welcher Anteil der ursprünglichen Belastbarkeit bleibt?
 *
 * Der Kehrwert der Überhöhung. Bei Faktor 21 sind das knapp 5 Prozent – das
 * Glas trägt noch ein Zwanzigstel dessen, was es ohne den Fehler getragen
 * hätte.
 */
export function remainingStrength(concentration: number): number {
  return concentration > 0 ? 1 / concentration : 0;
}

/**
 * Fehlerarten mit ihren typischen Maßen.
 *
 * Die Werte sind Größenordnungen aus der Glastechnik, keine Messungen an
 * einem bestimmten Gerät – deshalb steht auf der Seite „Größenordnung"
 * dabei. Belastbar ist auch hier das Verhältnis: Ein frischer Sprung ist an
 * der Spitze um Größenordnungen schärfer als ein abgenutzter Kratzer, und
 * genau daran hängt das Ergebnis.
 */
export interface Flaw {
  id: string;
  label: string;
  /** Tiefe in Metern. */
  depth: number;
  /** Krümmungsradius der Spitze in Metern. */
  tip: number;
  note: string;
}

export const flaws: Flaw[] = [
  {
    id: "neu",
    label: "Unbeschädigtes Deckglas",
    depth: 0.0000001,
    tip: 0.0000005,
    note: "Auch neues Glas hat mikroskopische Fehler. Sie sind nur so flach und so stumpf, dass sie nichts bündeln.",
  },
  {
    id: "sand",
    label: "Sandkratzer aus der Hosentasche",
    depth: 0.000002,
    tip: 0.0000005,
    note: "Quarzsand ist härter als das Deckglas. Ein Korn in der Tasche zieht eine Rille, die man kaum sieht.",
  },
  {
    id: "schluessel",
    label: "Schlüsselkratzer",
    depth: 0.00002,
    tip: 0.000001,
    note: "Sichtbar, aber vergleichsweise stumpf – Metall verdrängt das Glas eher, als es zu spalten.",
  },
  {
    id: "kante",
    label: "Kantenabplatzer nach einem Sturz",
    depth: 0.0002,
    tip: 0.0000002,
    note: "Der gefährlichste Fall: tief und an der Spitze extrem scharf. Von hier läuft der nächste Riss los.",
  },
  {
    id: "riss",
    label: "Bestehender Riss",
    depth: 0.001,
    tip: 0.0000001,
    note: "Eine Rissspitze ist atomar scharf. Deshalb wächst ein Riss weiter, ohne dass etwas Neues passiert.",
  },
];

/*
  Grenzen der Schieber auf der Seite, in Metern.

  `DEPTH_MIN` stand zuerst auf 500 nm und war damit gröber als das flachste
  Beispiel der Liste (die Mikrofehler in unbeschädigtem Glas, 100 nm): Ein
  Klick darauf hätte den Schieber an den Anschlag geschoben und einen anderen
  Wert angezeigt als den, den der Knopf verspricht. `verify:instruments`
  vergleicht beides seitdem.
*/
export const DEPTH_MIN = 0.0000001;
export const DEPTH_MAX = 0.002;
export const TIP_MIN = 0.00000005;
export const TIP_MAX = 0.00001;

/** Meter in eine lesbare Länge – Mikrometer bis Millimeter. */
export function formatLength(meters: number): string {
  if (meters < 0.000001) return `${Math.round(meters * 1e9)} nm`;
  if (meters < 0.001) {
    const um = meters * 1e6;
    return `${um < 10 ? um.toFixed(1).replace(".", ",") : Math.round(um)} µm`;
  }
  return `${(meters * 1000).toFixed(2).replace(".", ",")} mm`;
}
