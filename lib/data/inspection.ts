/**
 * Das Prüfprotokoll für aufbereitete Geräte.
 *
 * Auf /refurbished steht seit jeher der Satz vom „40-Punkte-Protokoll“. Das
 * ist in dieser Branche ein Standardversprechen – und praktisch nirgends
 * kann man nachlesen, welche vierzig Punkte gemeint sind. Ein Versprechen,
 * das niemand prüfen kann, ist Werbung.
 *
 * Deshalb steht der Prüfplan hier vollständig: jede Position mit dem
 * Kriterium, ab dem sie als bestanden gilt. Wer will, druckt ihn aus und
 * geht ihn am Ladentisch selbst durch.
 *
 * Die Summe der Positionen muss `site.checkpoints` ergeben – das prüft
 * `npm run verify:inspection` bei jedem Lauf. Wer eine Position ergänzt,
 * zieht die Zahl in `lib/site.ts` mit, sonst wird aus der Zusage wieder
 * eine Behauptung.
 */

export interface Checkpoint {
  /** Kurzname der Position, wie im Protokoll gedruckt. */
  title: string;
  /** Was geprüft wird und wann der Punkt als bestanden gilt. */
  criterion: string;
}

export interface CheckGroup {
  id: string;
  title: string;
  /** Warum diese Gruppe im Protokoll steht – ein Satz. */
  intro: string;
  points: Checkpoint[];
}

export const inspectionGroups: CheckGroup[] = [
  {
    id: "display",
    title: "Display",
    intro:
      "Das teuerste Bauteil und das einzige, das man den ganzen Tag ansieht. Sieben Positionen, davon drei, die sich nur im abgedunkelten Raum zeigen.",
    points: [
      {
        title: "Pixelfehler",
        criterion:
          "Vollflächig Rot, Grün, Blau, Weiß und Schwarz. Kein dauerhaft leuchtender oder toter Bildpunkt.",
      },
      {
        title: "Helligkeitsverlauf",
        criterion:
          "Graubild bei 30 % Helligkeit. Keine Wolkenbildung, keine hellen Ränder, keine Schatten in den Ecken.",
      },
      {
        title: "Einbrennen",
        criterion:
          "Graubild auf einem OLED zeigt keine Rückstände von Statusleiste, Tastatur oder Navigationsleiste.",
      },
      {
        title: "Farbe und Weißpunkt",
        criterion:
          "Weißfläche neben einem Referenzgerät. Kein sichtbarer Farbstich ins Grüne oder Rosa.",
      },
      {
        title: "Touch über die volle Fläche",
        criterion:
          "Raster über den gesamten Bildschirm, jede Zelle einzeln ausgelöst – auch die Randbereiche unter der Rundung.",
      },
      {
        title: "Multitouch",
        criterion: "Fünf gleichzeitige Berührungen werden getrennt erkannt und verfolgt.",
      },
      {
        title: "Umgebungslicht und True Tone",
        criterion:
          "Die Helligkeit folgt der Abdeckung des Sensors, die automatische Regelung ist aktiv.",
      },
    ],
  },
  {
    id: "akku",
    title: "Akku und Laden",
    intro:
      "Die Kapazität allein sagt wenig. Wie ein Akku sich unter Last verhält, sagt mehr – und ist der Grund, warum wir im Zweifel tauschen.",
    points: [
      {
        title: "Kapazität",
        criterion:
          "Ausgelesene Restkapazität gegenüber dem Neuwert. Unter dem Grenzwert des Zustandsgrades wird der Akku ersetzt, nicht der Grad gesenkt.",
      },
      {
        title: "Ladezyklen",
        criterion:
          "Zyklenzahl wird ausgelesen und im Protokoll vermerkt. Sie erklärt die Kapazität – und wird sonst gerne verschwiegen.",
      },
      {
        title: "Spannungslage unter Last",
        criterion:
          "Zehn Minuten Volllast. Kein Einbruch, der zum Neustart führt, kein Sprung in der Anzeige.",
      },
      {
        title: "Laden per Kabel",
        criterion:
          "Volle Ladeleistung am Originalnetzteil, stabil über eine Stunde. Kein Abbruch beim Wackeln am Stecker.",
      },
      {
        title: "Kabelloses Laden",
        criterion:
          "Sofern das Gerät es beherrscht: Ladebeginn auf der Ladefläche, kein Abbruch bei leichtem Versatz.",
      },
      {
        title: "Wärmeentwicklung",
        criterion:
          "Gehäusetemperatur unter Last innerhalb des üblichen Bereichs. Ein heißer Punkt an einer Stelle ist ein Befund, keine Toleranz.",
      },
    ],
  },
  {
    id: "kameras",
    title: "Kameras",
    intro:
      "Jedes Objektiv einzeln, jede Brennweite einzeln. Ein Staubkorn hinter der Linse sieht man erst gegen eine helle Fläche.",
    points: [
      {
        title: "Hauptkamera",
        criterion:
          "Testbild gegen eine gleichmäßig helle Fläche: keine Flecken, keine Schlieren, keine Partikel hinter dem Glas.",
      },
      {
        title: "Ultraweitwinkel",
        criterion: "Eigene Aufnahme, eigene Beurteilung – nicht mitgeprüft, sondern geprüft.",
      },
      {
        title: "Teleobjektiv",
        criterion:
          "Sofern vorhanden: Umschalten auf die längste Brennweite, Schärfe über den gesamten Zoombereich.",
      },
      {
        title: "Frontkamera",
        criterion: "Auflösung, Schärfe und Farbe wie ab Werk; kein Versatz im Bildausschnitt.",
      },
      {
        title: "Autofokus und Stabilisierung",
        criterion:
          "Fokus fährt von Nah auf Fern und zurück, ohne zu pumpen. Die Stabilisierung ist hörbar und im Video sichtbar.",
      },
      {
        title: "Blitz und Belichtung",
        criterion: "Blitz zündet in beiden Stufen, die Belichtung regelt nach.",
      },
    ],
  },
  {
    id: "ton",
    title: "Ton",
    intro:
      "Vier Wandler, vier getrennte Prüfungen. Ein Mikrofon, das nur beim Telefonieren aussetzt, fällt sonst erst dem Käufer auf.",
    points: [
      {
        title: "Hörmuschel",
        criterion: "Sprachaufnahme über den oberen Lautsprecher, klar und ohne Kratzen.",
      },
      {
        title: "Lautsprecher",
        criterion:
          "Frequenzdurchlauf über den gesamten hörbaren Bereich. Kein Scheppern, kein Aussetzer, keine Verzerrung bei voller Lautstärke.",
      },
      {
        title: "Mikrofon unten",
        criterion: "Aufnahme und Wiedergabe, Pegel im erwarteten Bereich.",
      },
      {
        title: "Mikrofon oben",
        criterion:
          "Getrennt geprüft, weil die Geräuschunterdrückung ein defektes zweites Mikrofon lange kaschiert.",
      },
      {
        title: "Vibration",
        criterion: "Der Motor läuft rund, ohne Rasseln – bei Apple-Geräten auch die feinen Stufen.",
      },
    ],
  },
  {
    id: "funk",
    title: "Funk und Verbindungen",
    intro:
      "Alles, was ohne Kabel funktioniert, prüfen wir mit einer echten Gegenstelle statt mit einem Häkchen in den Einstellungen.",
    points: [
      {
        title: "Mobilfunk",
        criterion: "Einbuchen mit einer Prüf-SIM, Gespräch in beide Richtungen, Datenverbindung.",
      },
      {
        title: "eSIM",
        criterion: "Profil lässt sich anlegen und wieder entfernen; kein gesperrter eSIM-Speicher.",
      },
      {
        title: "WLAN",
        criterion:
          "Verbindung auf 2,4 und 5 GHz, Durchsatz und Empfangsstärke im Vergleich zum Referenzgerät.",
      },
      {
        title: "Bluetooth",
        criterion: "Kopplung mit Kopfhörer und Uhr, stabile Verbindung über zehn Meter.",
      },
      {
        title: "Ortung",
        criterion: "Satellitenfix im Freien innerhalb der üblichen Zeit, Position plausibel.",
      },
      {
        title: "NFC und SIM-Schacht",
        criterion:
          "Bezahlfunktion erkennt das Lesegerät; der Schacht rastet ein und hält die Karte fest.",
      },
    ],
  },
  {
    id: "sensoren",
    title: "Sensoren und Biometrie",
    intro:
      "Sensoren fallen im Alltag nicht auf, bis sie fehlen. Der Näherungssensor zum Beispiel – bis der Bildschirm beim Telefonieren angeht.",
    points: [
      {
        title: "Gesichtserkennung oder Fingerabdruck",
        criterion:
          "Neu eingerichtet und mehrfach entsperrt, auch im Dunkeln. Wird anschließend wieder gelöscht.",
      },
      {
        title: "Näherungssensor",
        criterion: "Der Bildschirm schaltet beim Telefonieren ab und wieder ein.",
      },
      {
        title: "Umgebungslichtsensor",
        criterion: "Der Messwert folgt der Abdeckung stufenlos, ohne Sprünge.",
      },
      {
        title: "Beschleunigung und Lage",
        criterion: "Drehen des Bildschirms in alle vier Lagen, ohne Verzögerung und ohne Hängen.",
      },
      {
        title: "Gyroskop",
        criterion: "Drehraten in allen drei Achsen plausibel; die Nulllage driftet nicht.",
      },
      {
        title: "Kompass und Barometer",
        criterion:
          "Nordausrichtung gegen einen Referenzkompass, Luftdruck gegen die Wetterstation im Ort.",
      },
    ],
  },
  {
    id: "gehaeuse",
    title: "Gehäuse und Auslieferung",
    intro:
      "Die letzten vier Positionen entscheiden darüber, ob das Gerät den Laden verlässt oder zurück auf die Werkbank geht.",
    points: [
      {
        title: "Tasten und Schalter",
        criterion:
          "Lauter, leiser, Ein/Aus und der Stummschalter: jeder mit sauberem Druckpunkt, keiner locker.",
      },
      {
        title: "Sichtprüfung Gehäuse und Glas",
        criterion:
          "Unter Werkstattlicht aus 30 cm. Was hier auffällt, steht im Protokoll und bestimmt den Zustandsgrad.",
      },
      {
        title: "Dichtung nach dem Öffnen",
        criterion:
          "War das Gerät geöffnet, wird der Kleberahmen erneuert. Wir sagen nicht mehr „wasserdicht“ – wir sagen, was ersetzt wurde.",
      },
      {
        title: "Werkszustand und Aktivierungssperre",
        criterion:
          "Vollständig zurückgesetzt, kein fremdes Konto verknüpft, keine iCloud- oder Google-Sperre. Ohne diesen Punkt gibt es keinen Verkauf.",
      },
    ],
  },
];

/** Anzahl aller Positionen – muss `site.checkpoints` entsprechen. */
export const checkpointCount = inspectionGroups.reduce(
  (sum, group) => sum + group.points.length,
  0,
);

/**
 * Fortlaufende Nummer der ersten Position einer Gruppe. Damit trägt jede
 * Position im gedruckten Protokoll dieselbe Nummer wie auf dem Bildschirm.
 */
export function groupOffset(id: string): number {
  let offset = 0;
  for (const group of inspectionGroups) {
    if (group.id === id) return offset;
    offset += group.points.length;
  }
  return offset;
}
