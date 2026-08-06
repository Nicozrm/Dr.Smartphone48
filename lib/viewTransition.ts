/**
 * Ein Element wandert – der Browser rechnet den Weg.
 *
 * Die View-Transitions-API macht vor und nach einer Zustandsänderung je eine
 * Aufnahme der Seite und blendet dazwischen. Elemente, die in beiden
 * Aufnahmen denselben `view-transition-name` tragen, werden dabei nicht
 * überblendet, sondern **ineinander überführt**: Position, Größe und Inhalt.
 *
 * Genutzt wird das an genau einer Stelle – der Gerätesignatur im
 * Sofortpreis-Rechner. Sie liegt vor dem Klick groß auf der Markenkachel und
 * danach klein in der Zusammenfassung. Ohne Überführung erscheint sie dort
 * einfach; mit ihr sieht man, dass es dasselbe Gerät ist.
 *
 * Vier Bedingungen, unter denen hier nichts passiert – und das ist jedes Mal
 * das richtige Verhalten, nicht ein Rückfall:
 *
 * 1. **Kein `startViewTransition`.** Ältere Browser aktualisieren sofort.
 *    Die Überführung ist Erklärung, nicht Inhalt.
 * 2. **`prefers-reduced-motion`.** Ein Element, das quer über den Bildschirm
 *    fliegt, ist genau die Bewegung, die diese Einstellung meint.
 * 3. **Schmale Fenster.** Unterhalb von 1024 px steht die Zusammenfassung
 *    nicht neben den Schritten, sondern weit darunter. Die Signatur flöge
 *    aus dem Bild – eine Bewegung, die niemand sieht und die trotzdem die
 *    Aktualisierung aufhält.
 * 4. **Das Ziel ist noch nicht da.** Ohne Startpunkt gibt es nichts zu
 *    überführen.
 *
 * Der Name wird dem Startelement erst im Klick gesetzt und im selben
 * Rutsch wieder entfernt: Zwei Elemente mit demselben Namen in derselben
 * Aufnahme brechen die Überführung ab.
 */

import { flushSync } from "react-dom";

/** Der einzige Name im Projekt. Steht so auch in globals.css. */
export const MORPH_MARKE = "marke";

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

/** Ab hier steht die Zusammenfassung neben den Schritten (lg:grid-cols). */
const NEBENEINANDER = "(min-width: 1024px)";

/**
 * Führt `update` aus und liefert ein Versprechen, das erst erfüllt ist, wenn
 * die Überführung durch ist. Alles, was danach passieren soll – vor allem das
 * sanfte Scrollen zum nächsten Schritt –, hängt sich daran. Andernfalls
 * scrollte die Seite unter einer stehenden Aufnahme weg und spränge am Ende.
 */
export function morphMarke(
  from: HTMLElement | null,
  update: () => void,
): Promise<void> {
  const doc = document as WithViewTransition;

  if (
    typeof doc.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !window.matchMedia(NEBENEINANDER).matches
  ) {
    update();
    return Promise.resolve();
  }

  if (from) from.style.viewTransitionName = MORPH_MARKE;

  const transition = doc.startViewTransition(() => {
    // Synchron, sonst ist die Aufnahme des neuen Zustands vor dem Rendern da.
    flushSync(update);
    // Und sofort wieder weg: Ab jetzt trägt den Namen die Zusammenfassung.
    if (from) from.style.viewTransitionName = "";
  });

  // Eine abgebrochene Überführung weist `finished` zurück. Der Zustand ist
  // dann trotzdem gesetzt – für den Aufrufer ist das kein Fehlerfall.
  return transition.finished.catch(() => undefined);
}
