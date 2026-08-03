import type { DiagramPart, RepairKind } from "@/lib/data/devices";

/*
  Der Werkstattablauf, Schritt für Schritt.

  Auf jedem Preisschild dieser Seite steht eine Dauer – „45 Minuten" beim
  Displaytausch. Das ist überall in der Branche eine Zahl, die man glauben
  muss. Hier kann man sie nachlesen: Die Schritte unten sind die Arbeit, die
  tatsächlich stattfindet, und ihre Einzelzeiten ergeben in der Summe exakt
  die zugesagte Dauer. `verifyProcedures()` prüft das bei jedem Build.

  Zwei Dinge stehen bewusst drin, die ein Verkaufstext weglassen würde:
  dass wir bei der Ladebuchse und beim Lautsprecher zuerst reinigen (weil es
  oft nur Verdichtung ist und die Reparatur dann entfällt), und dass die
  Funktionsprüfung **vor** dem Verkleben passiert – wer erst danach prüft,
  macht ein zweites Mal auf.

  Die Zeiten sind betriebliche Zusagen, keine Messwerte. Wer sie ändert,
  ändert auch `repairMeta.minutes` in devices.ts – sonst schlägt die Prüfung
  fehl, und das ist der Sinn der Sache.
*/

export interface ProcedureStep {
  /** Was passiert. */
  title: string;
  /** Warum es passiert – der Teil, den sonst niemand erklärt. */
  detail: string;
  /** Dauer in Minuten. */
  minutes: number;
  /** Bauteil, das dabei im Mittelpunkt steht (hebt das Diagramm hervor). */
  part: DiagramPart;
}

export const procedures: Partial<Record<RepairKind, ProcedureStep[]>> = {
  display: [
    {
      title: "Annahme und Sichtprüfung",
      detail:
        "IMEI notieren, Vorschäden gemeinsam festhalten, Funktionstest vor dem Eingriff. Was jetzt dokumentiert ist, muss später niemand behaupten.",
      minutes: 3,
      part: "full",
    },
    {
      title: "Sicherung und Sperre klären",
      detail:
        "Backup bestätigt? Gerätesuche aus? Ohne das lässt sich nach dem Einbau nicht vollständig prüfen – und genau daran scheitern die meisten Nachbesserungen.",
      minutes: 2,
      part: "full",
    },
    {
      title: "Erwärmen und Kleber lösen",
      detail:
        "Der Dichtkleber hält das Wasser draußen und das Display fest. Er wird gleichmäßig erwärmt, nicht aufgerissen – sonst reißt die Displayfolie mit.",
      minutes: 6,
      part: "screen",
    },
    {
      title: "Display anheben, Kabel trennen",
      detail:
        "Aufklappen wie ein Buch, nie ganz abheben: Darunter liegen zwei Flachbandkabel, die kürzer sind, als man denkt.",
      minutes: 5,
      part: "screen",
    },
    {
      title: "Akku abklemmen, Einheit entnehmen",
      detail:
        "Strom weg, bevor irgendetwas anderes passiert. Ein Kurzschluss an dieser Stelle kostet das Board, nicht das Display.",
      minutes: 4,
      part: "battery",
    },
    {
      title: "Originalchip übernehmen",
      detail:
        "True Tone, Helligkeitssensor und der Face-ID-Verbund hängen an einem Chip auf dem alten Display. Wer ihn nicht überträgt, liefert ein Display, das funktioniert und trotzdem falsch ist.",
      minutes: 6,
      part: "board",
    },
    {
      title: "Neues Display einsetzen",
      detail:
        "Kabel zuerst, Rahmen danach. Beim Einrasten darf nichts klemmen – ein eingeklemmtes Flachband fällt erst nach Wochen aus.",
      minutes: 5,
      part: "screen",
    },
    {
      title: "Funktionstest vor dem Verkleben",
      detail:
        "Touch über die ganze Fläche, Helligkeit, True Tone, Face ID, Hörmuschel. Erst danach wird verklebt – wer umgekehrt vorgeht, macht ein zweites Mal auf.",
      minutes: 4,
      part: "screen",
    },
    {
      title: "Dichtung erneuern, verschließen",
      detail:
        "Neuer Dichtkleber, nicht der alte. Die Spritzwasserfestigkeit ist danach nicht mehr die des Werks, aber sie ist wieder vorhanden.",
      minutes: 6,
      part: "back",
    },
    {
      title: "Endprüfung nach 40 Punkten",
      detail:
        "Dasselbe Protokoll wie bei jedem Refurbished-Gerät. Erst wenn alle Punkte stehen, geht das Gerät über den Tresen.",
      minutes: 4,
      part: "full",
    },
  ],

  battery: [
    {
      title: "Annahme und Sichtprüfung",
      detail:
        "Zustand messen, bevor getauscht wird. Manchmal ist der Akku in Ordnung und eine App zieht ihn leer – dann sagen wir das.",
      minutes: 3,
      part: "full",
    },
    {
      title: "Öffnen und Display anheben",
      detail: "Erwärmen, Kleber lösen, aufklappen. Derselbe Weg wie beim Displaytausch.",
      minutes: 6,
      part: "screen",
    },
    {
      title: "Akku trennen und lösen",
      detail:
        "Stecker zuerst. Die Klebestreifen werden flach herausgezogen, nie gehebelt – ein angestochener Akku ist ein Brand, kein Ersatzteil.",
      minutes: 7,
      part: "battery",
    },
    {
      title: "Neuen Akku einsetzen",
      detail:
        "Zellspannung und Kennung vor dem Einbau prüfen. Ein Akku, der sich nicht sauber anmeldet, kommt gar nicht erst ins Gerät.",
      minutes: 4,
      part: "battery",
    },
    {
      title: "Verschließen, Dichtung erneuern",
      detail: "Neuer Dichtkleber, gleichmäßig angepresst, definierte Ruhezeit.",
      minutes: 5,
      part: "back",
    },
    {
      title: "Kalibrierung und Endprüfung",
      detail:
        "Ein voller Ladezyklus wird angestoßen, damit die Anzeige den neuen Zustand lernt. Dazu die 40 Punkte.",
      minutes: 5,
      part: "full",
    },
  ],

  chargeport: [
    {
      title: "Annahme und Sichtprüfung",
      detail: "Welches Kabel, welches Netzteil, seit wann. Die Antwort entscheidet oft schon alles.",
      minutes: 3,
      part: "full",
    },
    {
      title: "Erst reinigen, dann reparieren",
      detail:
        "In den meisten Fällen sitzt verdichteter Hosentaschen-Flusen im Anschluss. Löst sich das Problem hier, ist der Termin an dieser Stelle zu Ende – und kostet nichts.",
      minutes: 4,
      part: "port",
    },
    {
      title: "Öffnen und Display anheben",
      detail: "Erwärmen, Kleber lösen, aufklappen, Akku abklemmen.",
      minutes: 6,
      part: "screen",
    },
    {
      title: "Taptic Engine ausbauen",
      detail:
        "Sie liegt über der Ladeeinheit und muss zuerst heraus. Ihre Schrauben sind unterschiedlich lang – sie kommen auf eine Schraubenkarte, nicht auf den Tisch.",
      minutes: 6,
      part: "board",
    },
    {
      title: "Ladeflex lösen",
      detail:
        "Das Flexkabel führt Antenne, Mikrofon und Ladung zugleich und ist über die halbe Gehäuselänge verklebt. Die Antennenführung wird fotografiert, bevor sie gelöst wird.",
      minutes: 8,
      part: "port",
    },
    {
      title: "Neue Buchse einsetzen",
      detail: "Einpassen, Antennenführung exakt wiederherstellen, Kontakte prüfen.",
      minutes: 7,
      part: "port",
    },
    {
      title: "Ladetest unter Last",
      detail:
        "Mit Messgerät: Stromaufnahme, Ladeleistung und Datenrate. Ein Anschluss, der lädt, aber keine Daten überträgt, ist nicht repariert.",
      minutes: 6,
      part: "port",
    },
    {
      title: "Verschließen und Endprüfung",
      detail: "Dichtung erneuern, 40 Punkte, Mobilfunk gegenprüfen.",
      minutes: 5,
      part: "full",
    },
  ],

  camera: [
    {
      title: "Annahme und Sichtprüfung",
      detail:
        "Testaufnahmen in allen Brennweiten. Manchmal ist es nicht die Kamera, sondern das Deckglas darüber.",
      minutes: 3,
      part: "camera",
    },
    {
      title: "Öffnen, Akku trennen",
      detail: "Erwärmen, Display anheben, Strom weg.",
      minutes: 7,
      part: "screen",
    },
    {
      title: "Abschirmblech lösen",
      detail:
        "Darunter sitzt das Kameramodul. Das Blech schirmt die Funkeinheit ab und gehört exakt zurück, wo es war.",
      minutes: 5,
      part: "board",
    },
    {
      title: "Kameramodul tauschen",
      detail: "Steckverbindung lösen, neues Modul setzen, Sitz und Dichtung prüfen.",
      minutes: 8,
      part: "camera",
    },
    {
      title: "Bildprüfung",
      detail:
        "Schärfe über alle Brennweiten, Stabilisierung, Autofokus im Nahbereich, Blitz und Videoaufnahme. Eine Kamera, die nur bei Tageslicht taugt, fällt hier auf.",
      minutes: 9,
      part: "camera",
    },
    {
      title: "Verschließen und Endprüfung",
      detail: "Dichtung erneuern, 40 Punkte.",
      minutes: 8,
      part: "full",
    },
  ],

  speaker: [
    {
      title: "Annahme und Sichtprüfung",
      detail: "Hörmuschel und Lautsprecher getrennt hören, Frequenzgang vorher messen.",
      minutes: 3,
      part: "speaker",
    },
    {
      title: "Öffnen und Display anheben",
      detail: "Erwärmen, Kleber lösen, Akku abklemmen.",
      minutes: 6,
      part: "screen",
    },
    {
      title: "Modul freilegen",
      detail: "Abschirmung lösen, Schrauben getrennt ablegen.",
      minutes: 6,
      part: "speaker",
    },
    {
      title: "Erst reinigen, dann tauschen",
      detail:
        "Gitter und Membran sind bei den meisten „defekten“ Lautsprechern nur zugesetzt. Wird der Ton danach wieder sauber, endet die Reparatur hier.",
      minutes: 5,
      part: "speaker",
    },
    {
      title: "Modul tauschen",
      detail: "Neues Modul einsetzen, Dichtung prüfen – sie führt den Schall, nicht nur das Wasser.",
      minutes: 6,
      part: "speaker",
    },
    {
      title: "Frequenzgang messen",
      detail:
        "Ein Sweep von 100 Hz bis 10 kHz, aufgenommen und mit der Kurve vor dem Eingriff verglichen. Lauter allein ist kein Befund.",
      minutes: 4,
      part: "speaker",
    },
    {
      title: "Verschließen und Endprüfung",
      detail: "Dichtung erneuern, 40 Punkte.",
      minutes: 5,
      part: "full",
    },
  ],

  backglass: [
    {
      title: "Annahme, Vorschäden festhalten",
      detail:
        "Ein gebrochenes Rückglas splittert weiter. Wir halten fest, was schon fehlt, bevor wir anfangen.",
      minutes: 4,
      part: "back",
    },
    {
      title: "Kleber lösen",
      detail:
        "Gleichmäßige Wärme über die gesamte Fläche. Das Rückglas ist vollflächig verklebt, nicht am Rand.",
      minutes: 10,
      part: "back",
    },
    {
      title: "Glas kontrolliert entfernen",
      detail:
        "Der aufwendigste Teil: Splitter werden abschnittweise gelöst, damit nichts in Kamera, Antenne oder Ladespule gerät. Deshalb dauert Rückglas länger als Display.",
      minutes: 14,
      part: "back",
    },
    {
      title: "Rahmen reinigen",
      detail: "Klebereste vollständig entfernen. Auf Resten hält das neue Glas nicht plan.",
      minutes: 10,
      part: "back",
    },
    {
      title: "Kameraring und Linsen übernehmen",
      detail: "Die Linsenabdeckung ist Teil des Glases und wird ausgerichtet übertragen.",
      minutes: 8,
      part: "camera",
    },
    {
      title: "Neues Glas ausrichten und pressen",
      detail: "Trockenprobe, dann kleben. Anpressen mit definiertem Druck, nicht mit der Hand.",
      minutes: 9,
      part: "back",
    },
    {
      title: "Aushärten und Endprüfung",
      detail: "Ruhezeit, danach Ladespule und Antennen gegenprüfen, 40 Punkte.",
      minutes: 5,
      part: "full",
    },
  ],

  diagnose: [
    {
      title: "Gespräch",
      detail:
        "Was ist passiert, seit wann, was wurde schon versucht. Die Hälfte aller Diagnosen entscheidet sich hier.",
      minutes: 4,
      part: "full",
    },
    {
      title: "Sichtprüfung innen und außen",
      detail:
        "Feuchtigkeitsindikatoren, Korrosionsspuren, Spuren einer Voröffnung. Letzteres sagen wir Ihnen, auch wenn es unangenehm ist.",
      minutes: 4,
      part: "full",
    },
    {
      title: "Messung",
      detail:
        "Stromaufnahme am Netzteil, Suche nach Kurzschlüssen, Spannungen an den Hauptschienen. Hier zeigt sich, ob es ein Bauteil oder das Board ist.",
      minutes: 6,
      part: "board",
    },
    {
      title: "Funktionstest nach 40 Punkten",
      detail: "Dasselbe Protokoll wie nach jeder Reparatur – als Ausgangspunkt, nicht als Abschluss.",
      minutes: 4,
      part: "full",
    },
    {
      title: "Befund und Festpreis",
      detail:
        "Sie bekommen die Ursache und den Preis. Beides unverbindlich, beides kostenlos – auch wenn Sie danach gehen.",
      minutes: 2,
      part: "full",
    },
  ],
};

/** Summe der Schrittdauern – muss `repairMeta[kind].minutes` entsprechen. */
export function procedureMinutes(steps: ProcedureStep[]): number {
  return steps.reduce((sum, step) => sum + step.minutes, 0);
}
