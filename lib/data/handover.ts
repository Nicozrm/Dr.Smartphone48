/**
 * Inhalte für den Übergabe-Assistenten (/vorbereitung).
 *
 * Redaktionsregel für diese Datei – sie weicht bewusst von Werbetexten ab:
 *
 * 1. **Jeder Schritt nennt die Folge, wenn er ausbleibt.** Nicht „bitte
 *    erledigen", sondern „sonst entfällt die Funktionsprüfung nach dem
 *    Einbau". Wer den Grund kennt, entscheidet selbst – und macht es dann
 *    meistens.
 * 2. **Menüpfade sind Beispiele, keine Zusicherung.** Apple und die
 *    Android-Hersteller benennen Menüs je nach Version um. Wo ein Pfad
 *    veralten kann, steht das dabei, statt eine Genauigkeit zu behaupten,
 *    die niemand pflegen kann.
 * 3. **Der Stolperstein steht dabei.** Ein Backup, das an vollem Speicher
 *    scheitert, ist der häufigste Grund für Datenverlust – und er fällt erst
 *    auf, wenn es zu spät ist.
 *
 * Diese Seite verkauft nichts. Sie ist auch dann nützlich, wenn jemand sein
 * Gerät anschließend woanders abgibt.
 */

export type Platform = "ios" | "android";

export interface HandoverPath {
  /** Woher der Weg gilt, z. B. „iPhone" oder „Samsung Galaxy". */
  label: string;
  /** Der Klickpfad selbst. */
  steps: string;
}

export interface HandoverStep {
  id: string;
  title: string;
  /** Wozu der Schritt dient. */
  why: string;
  /** Was tatsächlich passiert, wenn er ausbleibt. Ohne Drohung, ohne Floskel. */
  ifSkipped: string;
  paths?: HandoverPath[];
  /** Der Fehler, den die meisten machen. */
  pitfall?: string;
  /**
   * `true` = ohne diesen Schritt können wir nicht oder nur eingeschränkt
   * arbeiten. `false` = dringend empfohlen, aber Ihre Entscheidung.
   */
  required: boolean;
}

export interface HandoverGroup {
  id: string;
  label: string;
  lede: string;
  steps: HandoverStep[];
}

/* ------------------------------------------------------------------ */
/* Datensicherung                                                      */
/* ------------------------------------------------------------------ */

const backupIos: HandoverStep = {
  id: "backup",
  title: "Datensicherung anlegen und prüfen",
  why: "Wir reparieren am Gerät, ohne Daten anzufassen. Trotzdem gilt für jede Werkstatt derselbe Satz: Keine Reparatur ist eine Garantie gegen Datenverlust. Ein Gerät, das schon defekt ist, kann während der Arbeit endgültig ausfallen.",
  ifSkipped:
    "Geht der Speicher verloren, ist er verloren. Wir können Fotos und Nachrichten nicht wiederherstellen, die es nirgendwo sonst gibt.",
  paths: [
    {
      label: "iCloud",
      steps: "Einstellungen → [Ihr Name] → iCloud → iCloud-Backup → „Backup jetzt erstellen“",
    },
    {
      label: "Mac oder Windows-PC",
      steps:
        "Gerät anschließen → im Finder (bzw. in iTunes) auswählen → „Lokales Backup verschlüsseln“ aktivieren → „Backup jetzt erstellen“",
    },
  ],
  pitfall:
    "Prüfen Sie danach den Zeitstempel unter „Letztes erfolgreiches Backup“. Ist der iCloud-Speicher voll, bricht die Sicherung still ab – das Gerät meldet es nur einmal und danach nicht mehr. Und nur ein verschlüsseltes Computer-Backup enthält Passwörter, WLAN-Zugänge und Gesundheitsdaten; ohne das Häkchen fehlen sie.",
  required: false,
};

const backupAndroid: HandoverStep = {
  id: "backup",
  title: "Datensicherung anlegen und prüfen",
  why: "Wir reparieren am Gerät, ohne Daten anzufassen. Trotzdem gilt für jede Werkstatt derselbe Satz: Keine Reparatur ist eine Garantie gegen Datenverlust. Ein Gerät, das schon defekt ist, kann während der Arbeit endgültig ausfallen.",
  ifSkipped:
    "Geht der Speicher verloren, ist er verloren. Wir können Fotos und Nachrichten nicht wiederherstellen, die es nirgendwo sonst gibt.",
  paths: [
    {
      label: "Google-Konto",
      steps: "Einstellungen → Google → Sicherung → „Jetzt sichern“",
    },
    {
      label: "Samsung Galaxy",
      steps:
        "Einstellungen → Konten und Sicherung → Daten sichern (Samsung Cloud) – oder Smart Switch auf einen Computer",
    },
  ],
  pitfall:
    "Die Google-Sicherung umfasst App-Daten, Kontakte und SMS. Fotos und Videos nur dann, wenn die Synchronisierung in Google Fotos eingeschaltet ist – prüfen Sie das getrennt. Bilder auf einer Speicherkarte werden gar nicht mitgesichert.",
  required: false,
};

/* ------------------------------------------------------------------ */
/* Sperren, die uns die Arbeit unmöglich machen                        */
/* ------------------------------------------------------------------ */

const lockIos: HandoverStep = {
  id: "lock",
  title: "„Wo ist?“ deaktivieren",
  why: "Die Aktivierungssperre bindet das Gerät an Ihre Apple-ID. Solange sie aktiv ist, startet das Gerät nach dem Einbau nicht in einen prüfbaren Zustand.",
  ifSkipped:
    "Wir können die Reparatur ausführen, aber die Funktionsprüfung danach nur eingeschränkt – bei einem Displaytausch etwa Touch und Helligkeit, nicht aber Face ID, Kameras oder Mobilfunk. Beim Ankauf ist eine aktive Sperre ein hartes Ausschlusskriterium: Ein gesperrtes Gerät lässt sich nicht einrichten und damit nicht weiterverkaufen.",
  paths: [
    {
      label: "iPhone",
      steps: "Einstellungen → [Ihr Name] → „Wo ist?“ → „Mein iPhone suchen“ → aus",
    },
  ],
  pitfall:
    "Dafür wird das Passwort der Apple-ID abgefragt – nicht der Gerätecode. Wer es nicht zur Hand hat, klärt das besser zu Hause als am Tresen.",
  required: true,
};

const lockAndroid: HandoverStep = {
  id: "lock",
  title: "Google-Konto entfernen oder Zugangsdaten bereithalten",
  why: "Der Werksreset-Schutz bindet das Gerät an das zuletzt angemeldete Google-Konto. Nach einem Zurücksetzen verlangt es genau dieses Konto zurück.",
  ifSkipped:
    "Muss das Gerät im Zuge der Reparatur zurückgesetzt werden, bleibt es ohne die Zugangsdaten unbrauchbar – auch für Sie. Beim Ankauf ist ein gebundenes Konto ein hartes Ausschlusskriterium.",
  paths: [
    {
      label: "Android allgemein",
      steps: "Einstellungen → Konten (bzw. Nutzer und Konten) → Google → Konto entfernen",
    },
    {
      label: "Samsung Galaxy",
      steps:
        "Zusätzlich: Einstellungen → Konten und Sicherung → Konten → Samsung Account → entfernen",
    },
  ],
  pitfall:
    "Die Menüs heißen je nach Hersteller und Android-Version anders. Wenn Sie den Punkt nicht finden: Bringen Sie stattdessen die Zugangsdaten mit, das genügt uns auch.",
  required: true,
};

/* ------------------------------------------------------------------ */
/* Körperliches                                                        */
/* ------------------------------------------------------------------ */

const physicalIos: HandoverStep = {
  id: "physical",
  title: "SIM entnehmen, Hülle abnehmen",
  why: "Was Ihnen gehört, soll bei Ihnen bleiben. Und wir arbeiten am nackten Gerät.",
  ifSkipped:
    "Nichts Dramatisches – wir verwahren Hülle und SIM dann bei uns. Erfahrungsgemäß werden sie aber genau dann vergessen, wenn es schnell gehen soll.",
  paths: [
    {
      label: "iPhone",
      steps: "SIM-Schacht mit der beiliegenden Nadel oder einer Büroklammer öffnen",
    },
  ],
  pitfall:
    "Nutzen Sie eine eSIM, gibt es nichts zu entnehmen – sie bleibt im Gerät und übersteht die Reparatur. Löschen Sie sie auf keinen Fall vorsorglich: Das erneute Einrichten geht nur über Ihren Mobilfunkanbieter.",
  required: false,
};

const physicalAndroid: HandoverStep = {
  id: "physical",
  title: "SIM und Speicherkarte entnehmen, Hülle abnehmen",
  why: "Was Ihnen gehört, soll bei Ihnen bleiben. Und wir arbeiten am nackten Gerät.",
  ifSkipped:
    "Nichts Dramatisches – wir verwahren die Karten dann bei uns. Erfahrungsgemäß werden sie aber genau dann vergessen, wenn es schnell gehen soll.",
  paths: [
    {
      label: "Android",
      steps:
        "Kartenschacht mit der Nadel öffnen – bei vielen Modellen liegen SIM und microSD im selben Schlitten",
    },
  ],
  pitfall:
    "Auf der Speicherkarte liegen oft Fotos, die keine Cloud-Sicherung erfasst. Nehmen Sie sie mit – und sichern Sie sie getrennt.",
  required: false,
};

/* ------------------------------------------------------------------ */
/* Gruppen                                                             */
/* ------------------------------------------------------------------ */

export function handoverGroups(platform: Platform): HandoverGroup[] {
  const ios = platform === "ios";
  return [
    {
      id: "daten",
      label: "Ihre Daten",
      lede: "Der eine Schritt, den niemand nachholen kann.",
      steps: [ios ? backupIos : backupAndroid],
    },
    {
      id: "sperren",
      label: "Sperren lösen",
      lede: "Zwei Schutzmechanismen, die uns sonst die Prüfung verwehren – und Sie selbst aussperren können.",
      steps: [ios ? lockIos : lockAndroid],
    },
    {
      id: "geraet",
      label: "Am Gerät",
      lede: "Kleinigkeiten, die am Tresen Zeit kosten.",
      steps: [ios ? physicalIos : physicalAndroid],
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Die Sperrcode-Entscheidung                                          */
/* ------------------------------------------------------------------ */

export type PasscodeChoice = "offen" | "muendlich" | "behalten";

export interface PasscodeOption {
  id: PasscodeChoice;
  label: string;
  summary: string;
  /** Was wir damit prüfen können. */
  covered: string[];
  /** Was damit entfällt – der ehrliche Teil. */
  notCovered: string[];
  /** Wie wir mit dem Code umgehen. */
  handling: string;
}

/**
 * Der Sperrcode ist keine Checkbox, sondern eine Abwägung: Jede Wahl kostet
 * etwas. Genau deshalb steht hier für jede Variante, welche Prüfungen möglich
 * bleiben und welche entfallen – statt zur bequemsten zu drängen.
 *
 * Die Werkstatt hat ein Interesse an Variante 1. Das ist kein Grund, die
 * anderen beiden schlechtzureden.
 */
export const passcodeOptions: PasscodeOption[] = [
  {
    id: "offen",
    label: "Gerät entsperrt übergeben",
    summary:
      "Sie deaktivieren den Code vorübergehend oder übergeben das Gerät entsperrt.",
    covered: [
      "Vollständige Funktionsprüfung nach dem Einbau",
      "Kameras, Mikrofone, Lautsprecher, Sensoren",
      "Face ID bzw. Fingerabdruck",
      "Mobilfunk, WLAN, Bluetooth",
    ],
    notCovered: [],
    handling:
      "Wir sehen dabei zwangsläufig Ihren Startbildschirm. Wir öffnen keine Apps, keine Fotos und keine Nachrichten – geprüft wird ausschließlich, was zur Reparatur gehört.",
  },
  {
    id: "muendlich",
    label: "Code vor Ort mündlich nennen",
    summary:
      "Der Code bleibt aktiv, Sie nennen ihn bei der Abgabe. Wir notieren ihn auf dem Auftrag und vernichten ihn bei der Abholung.",
    covered: [
      "Vollständige Funktionsprüfung nach dem Einbau",
      "Kameras, Mikrofone, Lautsprecher, Sensoren",
      "Mobilfunk, WLAN, Bluetooth",
    ],
    notCovered: [
      "Face ID bzw. Fingerabdruck lässt sich nur mit Ihrem Gesicht bzw. Finger abschließend prüfen – das machen wir gemeinsam bei der Abholung",
    ],
    handling:
      "Der Code steht auf dem Papierauftrag, nicht in einem System. Bei der Abholung wird das Blatt vor Ihren Augen geschwärzt oder vernichtet.",
  },
  {
    id: "behalten",
    label: "Code für sich behalten",
    summary:
      "Das Gerät bleibt gesperrt. Wir arbeiten und prüfen, soweit es ohne Entsperren geht.",
    covered: [
      "Einbau und Sichtprüfung",
      "Touch und Displayhelligkeit im Sperrbildschirm",
      "Laden und Ladeerkennung",
    ],
    notCovered: [
      "Kameras, Mikrofone und Lautsprecher",
      "Face ID bzw. Fingerabdruck",
      "Mobilfunk- und WLAN-Verbindung",
      "Sensoren wie Näherung und Lagesensor",
    ],
    handling:
      "Wir sagen Ihnen vor dem Auftrag, welche Prüfungen entfallen, und halten es auf dem Übergabeprotokoll fest. Fällt ein ungeprüfter Bereich später auf, sehen wir ihn uns kostenfrei noch einmal an.",
  },
];

/** Kurzform für den Ausdruck. */
export const platformLabel: Record<Platform, string> = {
  ios: "iPhone (iOS)",
  android: "Android",
};
