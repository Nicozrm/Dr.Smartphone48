/**
 * Der Bildfrequenz-Schreiber – wie flüssig dieser Bildschirm wirklich ist.
 *
 * Auf /ersatzteile steht, dass ein Ersatzdisplay nicht gleich einem
 * Ersatzdisplay ist: Es gibt sie mit und ohne hochfrequente Dimmung, mit
 * unterschiedlicher Farbtreue – und mit unterschiedlicher Bildwiederholrate.
 * Ein Gerät, das ab Werk 120 Bilder je Sekunde zeigt, kann nach einer
 * billigen Reparatur mit 60 laufen. Man sieht es nicht auf dem Kassenbon,
 * man spürt es nur, und „fühlt sich träger an“ ist als Reklamation wertlos.
 *
 * Messbar ist es ohne jede Berechtigung: `requestAnimationFrame` ruft je Bild
 * einmal auf. Der Abstand zwischen den Aufrufen ist die Bilddauer, ihr
 * Kehrwert die Rate.
 *
 * ## Was gemessen wird – und was nicht
 *
 * Gemessen wird, **was der Browser liefert**. Das ist die Obergrenze dessen,
 * was ein Mensch an diesem Gerät zu sehen bekommt, aber nicht zwingend die
 * Grenze des Panels: Stromsparmodus, ein niedriger Ladestand, ein warmes
 * Gerät oder eine Einstellung des Systems können die Rate senken, ohne dass
 * das Panel etwas dafür kann. Ein gemessenes 60 beweist also nicht, dass ein
 * 60-Hz-Panel verbaut ist – ein gemessenes 120 beweist aber, dass eines mit
 * 120 verbaut ist. Die Aussage ist einseitig, und die Seite sagt das dazu.
 *
 * ## Warum auch die Streuung gezeigt wird
 *
 * Die mittlere Rate allein verschweigt das, was man tatsächlich bemerkt. Ein
 * Gerät, das 119 saubere Bilder und ein sehr spätes liefert, misst sich als
 * „120 Hz“ und ruckelt trotzdem sichtbar. Deshalb steht neben dem Mittelwert
 * die Streuung (mittlere absolute Abweichung vom Median) und die Zahl der
 * Bilder, die deutlich zu spät kamen.
 *
 * ## Warum der Median und nicht der Mittelwert
 *
 * Der erste und der letzte Abstand einer Messung sind fast immer Ausreißer –
 * die Seite räumt gerade auf, der Übersetzer wärmt sich auf. Ein Mittelwert
 * nähme sie voll mit, der Median nicht. Dieselbe Überlegung wie beim
 * Drosselschreiber.
 */

/**
 * Zahl der Bilder, die gesammelt werden.
 *
 * 240 Bilder sind bei 120 Hz zwei Sekunden und bei 60 Hz vier – lang genug
 * für eine belastbare Verteilung, kurz genug, dass niemand wartet.
 */
export const SAMPLE_FRAMES = 240;

/**
 * Die Raten, auf die gerundet wird.
 *
 * Bildschirme laufen nicht mit krummen Werten; gemessen wird trotzdem krumm,
 * weil die Uhr des Browsers absichtlich ungenau ist. Die Liste enthält
 * ausschließlich Raten, mit denen Panels tatsächlich laufen.
 *
 * Hier standen zunächst auch 24, 45, 48, 50 und 75. Das waren zwei Fehler in
 * einem: Es sind Bildraten von Film und Fernsehen, keine Panelraten – und 45
 * und 48 liegen nur 6,7 % auseinander, also enger als die doppelte Toleranz.
 * Ihre Bänder überlappten sich, und in der Überlappung entschied nicht die
 * Physik, sondern die Reihenfolge in dieser Liste. Das Prüfskript rechnet
 * jetzt nach, dass sich keine zwei Bänder berühren – wer eine Rate ergänzt,
 * bekommt es dort gesagt.
 */
export const KNOWN_RATES = [30, 60, 90, 100, 120, 144, 165, 240];

/**
 * Wie weit ein Messwert von einer bekannten Rate abweichen darf, um ihr
 * zugeordnet zu werden – als Anteil der Rate.
 *
 * 4 % sind bei 120 Hz knapp 5 Hz. Wer weiter danebenliegt, bekommt keine
 * Zuordnung, sondern seinen Messwert: Eine erfundene Zuordnung wäre genau
 * die Sorte Genauigkeit, die dieses Projekt sonst vermeidet.
 */
export const SNAP_TOLERANCE = 0.04;

/**
 * Ab welchem Vielfachen der üblichen Bilddauer ein Bild als „zu spät“ zählt.
 *
 * 1,5 ist die Schwelle, ab der ein Bild sicher ausgelassen wurde: Bei
 * gleichmäßigem Takt liegt jeder Abstand nahe bei 1, ein ausgelassenes Bild
 * bei 2. Alles darunter ist Messrauschen, alles darüber ist ein Ruckler.
 */
export const LATE_FACTOR = 1.5;

export interface Summary {
  /** Gemessene Rate in Hertz, aus dem Median der Bilddauern. */
  hz: number;
  /** Zugeordnete übliche Rate – oder null, wenn keine nahe genug liegt. */
  nearest: number | null;
  /** Median der Bilddauer in Millisekunden. */
  medianMs: number;
  /** Mittlere absolute Abweichung vom Median, in Millisekunden. */
  jitterMs: number;
  /** Bilder, die länger als LATE_FACTOR × Median gebraucht haben. */
  late: number;
  /** Längste gemessene Bilddauer in Millisekunden. */
  worstMs: number;
  /** Zahl der ausgewerteten Abstände. */
  count: number;
}

/** Abstände zwischen aufeinanderfolgenden Zeitstempeln, in Millisekunden. */
export function intervalsFrom(times: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i++) out.push(times[i] - times[i - 1]);
  return out;
}

/** Median. Robust gegen den einen Ausreißer, den jede Messung hat. */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Nächste übliche Rate – oder null, wenn keine innerhalb der Toleranz liegt.
 *
 * Der Rückgabewert null ist der eigentliche Zweck dieser Funktion. Ohne ihn
 * bekäme eine gemessene Rate von 75 Hz das Etikett „80 Hz“ verpasst, nur
 * weil das der nächste Eintrag in einer Liste ist.
 */
export function nearestRate(hz: number): number | null {
  let best: number | null = null;
  let bestDelta = Infinity;
  for (const rate of KNOWN_RATES) {
    const delta = Math.abs(hz - rate);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = rate;
    }
  }
  if (best === null) return null;
  return bestDelta <= best * SNAP_TOLERANCE ? best : null;
}

/** Auswertung einer Reihe von Bilddauern. */
export function summarise(intervals: number[]): Summary {
  const clean = intervals.filter((d) => d > 0 && Number.isFinite(d));
  if (!clean.length) {
    return {
      hz: 0,
      nearest: null,
      medianMs: 0,
      jitterMs: 0,
      late: 0,
      worstMs: 0,
      count: 0,
    };
  }

  const med = median(clean);
  const hz = 1000 / med;
  /* Mittlere absolute Abweichung **vom Median**, nicht Standardabweichung:
     Ein einzelner Ruckler zieht die Standardabweichung so stark hoch, dass
     sie danach nur noch den Ruckler beschreibt und nicht mehr die Ruhe
     dazwischen. Der Ruckler steht ohnehin einzeln daneben (`late`). */
  const jitter = median(clean.map((d) => Math.abs(d - med)));

  return {
    hz,
    nearest: nearestRate(hz),
    medianMs: med,
    jitterMs: jitter,
    late: clean.filter((d) => d > med * LATE_FACTOR).length,
    worstMs: Math.max(...clean),
    count: clean.length,
  };
}

/**
 * Verteilung der Bilddauern auf `bins` Fächer zwischen 0 und `maxMs`.
 *
 * Werte oberhalb von `maxMs` landen im letzten Fach, statt zu verschwinden.
 * Das ist Absicht und muss auf der Seite dabeistehen: Ein Diagramm, das
 * seine Ausreißer stillschweigend wegschneidet, zeigt ein ruhigeres Gerät,
 * als vor einem liegt – und der Ausreißer ist hier gerade der Befund.
 */
export function histogram(intervals: number[], bins: number, maxMs: number): number[] {
  const out = new Array<number>(bins).fill(0);
  if (bins <= 0 || maxMs <= 0) return out;
  for (const d of intervals) {
    if (!(d > 0) || !Number.isFinite(d)) continue;
    const idx = Math.min(bins - 1, Math.floor((d / maxMs) * bins));
    out[idx]++;
  }
  return out;
}

/**
 * Wie sich die Messung in Worten liest.
 *
 * Kein Urteil, keine Note: Die Sätze beschreiben, was gemessen wurde, und
 * überlassen den Schluss dem Menschen davor. Dieselbe Regel wie beim
 * Stethoskop und beim Klirrfaktor.
 */
export function reading(s: Summary): string {
  if (!s.count) return "Keine verwertbaren Bilder.";
  const rate = s.nearest ? `${s.nearest} Hz` : `${s.hz.toFixed(1)} Hz`;
  if (s.late === 0) return `${rate}, gleichmäßig – kein ausgelassenes Bild.`;
  if (s.late === 1) return `${rate}, ein Bild kam deutlich zu spät.`;
  return `${rate}, ${s.late} Bilder kamen deutlich zu spät.`;
}
