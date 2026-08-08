/**
 * Auswertung des Mikrofon-Pegels – ohne Browser, damit prüfbar.
 *
 * ## Warum dieser Test die Aufbereitung abschalten muss
 *
 * `getUserMedia` liefert voreingestellt einen für Sprache aufbereiteten
 * Kanal. Für einen Pegeltest ist davon vor allem eines fatal: die
 * **automatische Verstärkungsregelung**. Ihre ganze Aufgabe ist es, leise
 * Aufnahmen laut zu machen – also genau den Befund zu beseitigen, den
 * dieser Test sucht. Ein Mikrofon mit Staub im Schacht, ein angelaufener
 * Kontakt, ein Wasserschaden: Die Regelung dreht auf, der Pegel sieht
 * normal aus, und die Prüfung meldet „in Ordnung“.
 *
 * Die Rauschunterdrückung kommt dazu; sie entfernt gleichförmige Anteile
 * und damit den Untergrund, gegen den hier gemessen wird.
 *
 * Dieselbe Regel gilt schon beim Frequenzgang-Test und beim Stethoskop.
 * Der Pegeltest war die Ausnahme – ausgerechnet der, dessen Ergebnis in
 * den zusammengefassten Befund einfließt.
 *
 * ## Warum es keinen festen Grenzwert gibt
 *
 * Ohne Verstärkungsregelung hängt der gemessene Pegel an Dingen, die diese
 * Seite nicht kennt: Empfindlichkeit des Mikrofons, Abstand zum Mund,
 * Lautstärke der Stimme, Umgebung. Eine feste Schwelle („über 12 % ist in
 * Ordnung“) wäre für ein Telefon am Küchentisch geraten – dieselbe Sorte
 * erfundene Genauigkeit, die beim Klirrfaktor bewusst fehlt.
 *
 * Gemessen wird deshalb **gegen das Gerät selbst**: der lauteste Moment
 * gegen den leisesten derselben Aufnahme. Ein arbeitendes Mikrofon zeigt
 * einen deutlichen Ausschlag über seinen eigenen Untergrund, ein totes
 * oder verschlossenes zeigt keinen. Dasselbe Verfahren wie beim
 * Drosselschreiber, der sich ebenfalls erst auf das Gerät einmisst und
 * danach nur mit seinem eigenen Anfangswert vergleicht.
 *
 * ## Was der Test damit sagen kann – und was nicht
 *
 * Er unterscheidet ein Mikrofon, das aufnimmt, von einem, das schweigt.
 * Er sagt **nicht**, ob es empfindlich genug ist: Dafür bräuchte es eine
 * bekannte Schallquelle in bekanntem Abstand, also einen Messplatz. Die
 * Oberfläche sagt das dazu, statt eine Aussage zu behaupten, die aus
 * diesen Daten nicht folgt.
 */

/** Effektivwert eines Zeitfensters. Erwartet Werte um die Null (−1 … 1). */
export function windowRms(samples: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/**
 * Die Grenze, unterhalb derer nichts mehr von Stille zu unterscheiden ist.
 *
 * Der Wert ist nicht gegriffen, sondern gerechnet. Die Weboberfläche liefert
 * Zeitwerte wahlweise als Byte (8 Bit) oder als Gleitkomma; das Byte-Format
 * quantisiert in Schritten von 1/128. Das Rauschen einer gleichförmigen
 * Quantisierung hat den Effektivwert Schritt/√12, hier also
 *
 *     (1/128) / √12 ≈ 0,00226
 *
 * Alles darunter ist die Wandlung selbst und kein Schall. Die Grenze liegt
 * mit Absicht darüber, aber in derselben Größenordnung: Eine echte Aufnahme
 * – auch eine sehr leise – liegt um Zehnerpotenzen höher.
 *
 * Gemessen wird trotzdem in Gleitkomma (siehe `MicCard`), weil die
 * Quantisierung sonst genau den Untergrund verdeckt, gegen den verglichen
 * wird.
 */
export const SILENCE_RMS = (1 / 128) / Math.sqrt(12) * 2;

/**
 * Wie deutlich der lauteste Moment den leisesten übertreffen muss, damit
 * von einem Ausschlag die Rede sein kann.
 *
 * Vier ist reichlich konservativ: Sprechen liegt typischerweise zwei bis
 * drei Größenordnungen über dem Untergrund eines Telefonmikrofons. Der
 * Wert soll nicht knapp entscheiden, sondern nur den Fall abfangen, in dem
 * sich überhaupt nichts rührt.
 */
export const SIGNAL_RATIO = 4;

export interface LevelReading {
  /** Leisester Effektivwert der Aufnahme. */
  floor: number;
  /** Lautester Effektivwert der Aufnahme. */
  peak: number;
}

export type LevelVerdict =
  /** Das Mikrofon nimmt auf. */
  | { kind: "signal"; peak: number; floor: number; ratio: number }
  /** Es kam nichts an, was sich von der Wandlung unterscheiden ließe. */
  | { kind: "silent"; peak: number }
  /**
   * Es kam etwas an, aber ohne Ausschlag. Ein verschlossenes Mikrofon in
   * lauter Umgebung sieht so aus – und ebenso jemand, der nichts gesagt hat.
   * Deshalb ist das kein Mangelbefund, sondern eine Bitte um Wiederholung.
   */
  | { kind: "flat"; peak: number; floor: number; ratio: number };

/**
 * Beurteilt eine Aufnahme.
 *
 * Die Reihenfolge der Fälle ist wesentlich: Zuerst die Frage, ob überhaupt
 * etwas ankam. Ein Untergrund von null ergäbe sonst ein Verhältnis von
 * unendlich – und ein totes Mikrofon bestünde die Prüfung mit Auszeichnung.
 */
export function judgeLevel({ floor, peak }: LevelReading): LevelVerdict {
  if (!(peak > SILENCE_RMS)) return { kind: "silent", peak };

  // Der Untergrund kann selbst unter der Wandlungsgrenze liegen. Dann zählt
  // die Grenze, nicht die Null: Sonst teilte man durch beinahe nichts.
  const bezug = Math.max(floor, SILENCE_RMS);
  const ratio = peak / bezug;

  if (ratio < SIGNAL_RATIO) return { kind: "flat", peak, floor, ratio };
  return { kind: "signal", peak, floor, ratio };
}
