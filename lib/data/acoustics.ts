/**
 * Orientierungsmarken im Spektrum.
 *
 * Das Stethoskop auf /check zeigt, was das Mikrofon hört – als Spektrum und
 * als Wasserfall. Ein Spektrum ist aber nur dann etwas wert, wenn man weiß,
 * wo man hinsieht. Deshalb diese Liste.
 *
 * Sie ist ausdrücklich keine Diagnosetabelle. Jeder Eintrag nennt einen
 * Frequenzbereich, in dem ein bekanntes physikalisches Phänomen liegt – nicht
 * mehr. Aus „da ist ein Ausschlag bei 180 Hz" folgt nicht „Ihr Vibrationsmotor
 * ist defekt"; es folgt „in diesem Bereich arbeitet ein Vibrationsmotor".
 * Den Unterschied macht die Seite ausdrücklich.
 *
 * Regel für neue Einträge: Es muss ein Bereich sein, der sich physikalisch
 * begründen lässt (Netzfrequenz, Resonanz einer Bauart, Schaltfrequenz eines
 * Wandlers) – kein Erfahrungswert vom Hörensagen. Wer keinen Grund nennen
 * kann, lässt den Eintrag weg. Lieber eine Lücke als eine Behauptung.
 */

export interface AcousticLandmark {
  id: string;
  /** Untere Grenze in Hertz. */
  from: number;
  /** Obere Grenze in Hertz. */
  to: number;
  label: string;
  /**
   * Zeile der Beschriftung im Bild, von oben gezählt.
   *
   * Die Bereiche überlappen sich – Sprache liegt über Netzbrummen und
   * Vibrationsmotor –, und übereinandergeschriebene Beschriftungen sind
   * unlesbar. Die Zeile wird deshalb von Hand vergeben und nicht gerechnet:
   * Wer eine Marke ergänzt, entscheidet selbst, wo ihr Name Platz hat.
   */
  row: number;
  /** Warum genau dieser Bereich. Steht auf der Seite unter der Marke. */
  reason: string;
}

export const landmarks: AcousticLandmark[] = [
  {
    id: "netz",
    from: 48,
    to: 52,
    label: "Netzbrummen",
    row: 0,
    reason:
      "Das europäische Stromnetz läuft auf 50 Hz. Ein Netzteil oder eine schlecht abgeschirmte Zuleitung in der Nähe zeichnet sich hier ab – meist zusammen mit dem Doppelten bei 100 Hz.",
  },
  {
    id: "vibration",
    from: 120,
    to: 260,
    label: "Vibrationsmotor",
    row: 1,
    reason:
      "Beide gängigen Bauarten arbeiten in diesem Bereich: der klassische Unwuchtmotor je nach Drehzahl, der lineare Schwinger auf seiner Resonanzfrequenz. Außerhalb seiner Resonanz bewegt ein linearer Schwinger kaum etwas.",
  },
  {
    id: "stimme",
    from: 85,
    to: 3400,
    label: "Sprache",
    row: 2,
    reason:
      "Der Bereich, den die Telefonie seit jeher überträgt. Wer in dieser Darstellung spricht, füllt ihn ganz aus – deshalb ist er beim Messen von Gerätegeräuschen der störendste Gast im Raum.",
  },
  {
    id: "spulen",
    from: 2000,
    to: 20000,
    label: "Spulenfiepen",
    row: 0,
    reason:
      "Spannungswandler schalten im Kilohertzbereich. Die Spule dehnt sich dabei im Takt und gibt den Ton als Schall ab. Beim Laden und unter Last ist er am deutlichsten, weil dann die Schaltfrequenz mit der Last wandert.",
  },
];

/**
 * Der dargestellte Bereich.
 *
 * Nach unten bei 30 Hz: darunter liegt nichts, was ein Telefonmikrofon
 * verlässlich aufnimmt. Nach oben bei 20 kHz: die Obergrenze des Hörbaren,
 * und bei den üblichen 48 kHz Abtastrate liegt die Nyquist-Grenze bei 24 kHz –
 * darüber ist ohnehin nichts mehr echt.
 */
export const SPECTRUM_MIN_HZ = 30;
export const SPECTRUM_MAX_HZ = 20000;
