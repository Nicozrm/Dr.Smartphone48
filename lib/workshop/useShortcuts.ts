"use client";

/*
  Tastaturkürzel – nützlich, solange sie niemandem im Weg stehen.

  Eine Werkstatt bedient dieses Dashboard mit fettigen Fingern zwischen zwei
  Geräten. Die Hand liegt auf der Tastatur, nicht auf der Maus. Deshalb gibt
  es Kürzel; deshalb gibt es aber auch drei Regeln, die verhindern, dass sie
  zur Falle werden:

  1. **Nie in einem Eingabefeld.** Wer einen Namen ins Suchfeld tippt, meint
     Buchstaben, keine Befehle. Das gilt auch für `contenteditable`.
  2. **Nie mit Zusatztaste.** ⌘K gehört der Befehlspalette der Website,
     ⌘F dem Browser. Ein Kürzel, das eine gewohnte Funktion überschreibt,
     ist ein Fehler, kein Merkmal.
  3. **Nur, was sichtbar erklärt ist.** Jedes Kürzel steht in der Hilfe hinter
     `?`. Unsichtbare Kürzel kennt nur, wer sie eingebaut hat.
*/

import { useEffect, useRef } from "react";

export interface Shortcut {
  /** `event.key`, kleingeschrieben verglichen. */
  key: string;
  /** Was passieren soll. */
  run: () => void;
  /** Für die Hilfe. */
  label: string;
  /** Anzeige der Taste, falls sie anders heißt als `key`. */
  display?: string;
}

function inEditableField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useShortcuts(shortcuts: Shortcut[], enabled = true) {
  // Die Liste entsteht bei jedem Rendern neu. Über ein Ref bleibt der
  // Ereignishorcher trotzdem derselbe – sonst hinge und löste er sich
  // sekündlich, und ein Tastendruck während des Wechsels ginge verloren.
  // Gesetzt wird das Ref in einem Effekt, nicht beim Rendern: Ein verworfenes
  // Rendern soll keine Tastenbelegung hinterlassen.
  const current = useRef(shortcuts);
  useEffect(() => {
    current.current = shortcuts;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (inEditableField(event.target)) return;

      const match = current.current.find(
        (shortcut) => shortcut.key.toLowerCase() === event.key.toLowerCase(),
      );
      if (!match) return;

      event.preventDefault();
      match.run();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
