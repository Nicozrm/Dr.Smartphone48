import type { RepairKind } from "@/lib/data/devices";

/**
 * Sinnvolle Kombinationen – und warum sie sinnvoll sind.
 *
 * Redaktionsregel für diese Datei, und sie ist der ganze Unterschied:
 *
 * Ein Hinweis wie „Andere Kunden kauften auch" ist eine Behauptung über
 * fremdes Verhalten, die diese Website nicht belegen kann – und die nach
 * Verkaufsdruck riecht. Hier steht deshalb nie, was andere getan haben,
 * sondern **welcher technische Umstand** die Kombination sinnvoll macht:
 * Das Gerät ist ohnehin geöffnet, das Bauteil liegt ohnehin frei, die
 * Dichtung muss ohnehin erneuert werden.
 *
 * Wer den Grund liest, kann selbst entscheiden. Das ist der Unterschied
 * zwischen einem Hinweis und einem Nudge.
 *
 * Ein Vorschlag erscheint nur, wenn der Auslöser gewählt ist, das Ziel noch
 * nicht gewählt ist und es für das Modell überhaupt einen Preis dafür gibt.
 */

export interface RepairCombo {
  /** Ist diese Reparatur gewählt … */
  when: RepairKind;
  /** … dann lohnt sich ein Blick auf diese. */
  suggest: RepairKind;
  /** Der technische Grund. Kein Verkaufsargument, ein Sachverhalt. */
  reason: string;
}

export const repairCombos: RepairCombo[] = [
  {
    when: "display",
    suggest: "battery",
    reason:
      "Für den Displaytausch wird das Gerät ohnehin geöffnet – der Akku liegt dann frei. Zusammen in einem Termin entfällt das zweite Öffnen samt neuer Dichtung.",
  },
  {
    when: "backglass",
    suggest: "battery",
    reason:
      "Bei geöffneter Rückseite ist der Akku ohne zusätzliche Zerlegung erreichbar. Später einzeln kostet dieselbe Öffnungsarbeit ein zweites Mal.",
  },
  {
    when: "battery",
    suggest: "chargeport",
    reason:
      "Ladebuchse und Akku sitzen auf derselben Seite des Geräts. Wenn der Akku ohnehin heraus muss, ist die Buchse ohne Mehraufwand mitprüfbar.",
  },
  {
    when: "water",
    suggest: "diagnose",
    reason:
      "Nach Wasserkontakt sagt erst die Messung, welche Bauteile betroffen sind. Ohne Befund wäre jeder Kostenvoranschlag geraten – die Diagnose ist deshalb kostenlos.",
  },
  {
    when: "display",
    suggest: "camera",
    reason:
      "Die Frontkamera sitzt hinter dem Display. Ist ihr Bild fleckig oder unscharf, ist der Displaytausch der Moment, in dem sie ohne Zusatzarbeit erreichbar ist.",
  },
  {
    when: "chargeport",
    suggest: "speaker",
    reason:
      "Bei vielen Modellen sitzen Ladebuchse und unterer Lautsprecher auf derselben Einheit. Ist eines defekt, lohnt der Blick auf das andere im selben Arbeitsgang.",
  },
];

/**
 * Der passende Vorschlag zur aktuellen Auswahl – oder nichts.
 *
 * Bewusst **höchstens einer**: Zwei gleichzeitige Empfehlungen sind keine
 * Empfehlung mehr, sondern eine Liste. Gewinnt der Vorschlag zur zuletzt
 * gewählten Reparatur, denn der ist der aktuellste Gedanke des Besuchers.
 */
export function comboFor(
  selected: RepairKind[],
  available: RepairKind[],
): RepairCombo | null {
  for (const kind of [...selected].reverse()) {
    const hit = repairCombos.find(
      (c) =>
        c.when === kind &&
        !selected.includes(c.suggest) &&
        available.includes(c.suggest),
    );
    if (hit) return hit;
  }
  return null;
}
