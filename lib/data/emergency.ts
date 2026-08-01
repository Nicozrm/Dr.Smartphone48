import type { IconName } from "@/components/ui/Icon";

/*
  Notfall-Protokolle.

  Der Inhalt ist der eigentliche Wert dieser Seite, deshalb steht er als
  Daten hier und nicht in einer Komponente: Er ist serverseitig gerendert,
  vollständig ohne JavaScript lesbar und wird vom Service Worker
  vorgehalten – die drei Bedingungen, unter denen ein Notfall stattfindet.

  Zwei Grundsätze für den Text:

  1. Das Verbot steht vor dem Gebot. Bei Wasserschaden ist der teuerste
     Fehler – laden – auch der erste, den fast jeder macht. Wer eine Seite
     nur überfliegt, muss zuerst lesen, was er lassen soll.

  2. Kein erfundener Countdown. Korrosion kennt keine Frist, die man in
     Minuten angeben könnte, und ein tickender roter Balken hilft niemandem,
     der gerade sein Telefon aus der Spüle gefischt hat. Die Uhr hier zählt
     die vergangene Zeit und sagt, welcher Schritt jetzt dran ist – mehr
     behauptet sie nicht.
*/

export interface EmergencyStep {
  title: string;
  detail: string;
}

export interface EmergencyScenario {
  id: string;
  icon: IconName;
  label: string;
  /** Kurzbeschreibung für die Auswahl. */
  teaser: string;
  headline: string;
  lede: string;
  /** Wird zuerst gezeigt – die Fehler, die am meisten kosten. */
  avoid: EmergencyStep[];
  /** Was zu tun ist, in der Reihenfolge, in der es zu tun ist. */
  doThis: EmergencyStep[];
  /** Ein Satz zur Einordnung, ohne Panik und ohne Beschönigung. */
  outlook: string;
  /** Zeigt die Rettungsuhr (nur beim Wasserschaden sinnvoll). */
  clock?: boolean;
}

export const emergencyScenarios: EmergencyScenario[] = [
  {
    id: "wasser",
    icon: "waveform",
    label: "Wasserschaden",
    teaser: "Spüle, Toilette, Regen, Getränk",
    headline: "Nicht einschalten. Nicht laden. Alles andere hat Zeit.",
    lede:
      "Wasser allein überleben die meisten Geräte. Was sie nicht überleben, ist Strom, der durch nasse Leiterbahnen fließt. Deshalb steht hier zuerst, was Sie lassen sollen.",
    clock: true,
    avoid: [
      {
        title: "Nicht laden – auch nicht kurz",
        detail:
          "Der häufigste und der teuerste Fehler. Spannung auf einer feuchten Platine setzt Elektrolyse in Gang und zerstört Bauteile, die reines Wasser oft unbeschadet überstanden hätten. Kein Kabel, keine Ladematte, kein Powerbank-Test.",
      },
      {
        title: "Nicht einschalten, nicht „kurz gucken“",
        detail:
          "Auch der Startvorgang ist Strom. Ist das Gerät noch an, schalten Sie es aus. Ist es von selbst ausgegangen, lassen Sie es aus – das war die richtige Entscheidung des Geräts.",
      },
      {
        title: "Kein Reis",
        detail:
          "Der hartnäckigste Mythos der Branche. Reis zieht kaum Feuchtigkeit aus einem geschlossenen Gehäuse, dafür gelangen Staub und Stärke in Anschlüsse und Buchsen. Auch Apple rät ausdrücklich davon ab. Ein Beutel Trockenmittel ist besser, ein offener Platz an der Luft genauso gut.",
      },
      {
        title: "Kein Föhn, keine Heizung, keine Sonne",
        detail:
          "Hitze treibt die Feuchtigkeit tiefer ins Gerät, löst Klebeverbindungen und belastet den Akku. Warme Luft von außen erreicht das Board ohnehin nicht.",
      },
      {
        title: "Nicht schütteln, keine Druckluft",
        detail:
          "Beides verteilt das Wasser weiter nach innen, statt es herauszuholen. Sanft ausschütten mit den Anschlüssen nach unten reicht.",
      },
    ],
    doThis: [
      {
        title: "Ausschalten",
        detail:
          "Wenn es noch läuft: regulär ausschalten, oder die Tastenkombination für den erzwungenen Neustart gedrückt halten, bis der Bildschirm schwarz wird.",
      },
      {
        title: "Hülle ab, Karten raus",
        detail:
          "Schutzhülle entfernen – darunter steht das Wasser. SIM- und Speicherkarte herausnehmen, das öffnet zugleich einen Belüftungsweg ins Gehäuse.",
      },
      {
        title: "Abtupfen, nicht reiben",
        detail:
          "Ein fusselfreies Tuch, sanft. Dann das Gerät mit den Anschlüssen nach unten halten und ein paar Mal behutsam gegen die Handfläche klopfen.",
      },
      {
        title: "Aufrecht, kühl, trocken lagern",
        detail:
          "Nicht in die Hosentasche, nicht ins Handschuhfach. Ein Tisch bei Zimmertemperatur genügt. Wenn Sie Silicagel-Beutel haben: dazulegen.",
      },
      {
        title: "Zu uns bringen, so schnell es geht",
        detail:
          "Trocknen ist nicht dasselbe wie Reinigen. Zurück bleiben Salze und Mineralien, die weiter korrodieren, auch wenn das Gerät wieder läuft. Wir zerlegen, reinigen im Ultraschallbad und prüfen anschließend jede Funktion.",
      },
    ],
    outlook:
      "War es Salzwasser, Cola, Kaffee oder Meerwasser, sagen Sie es uns unbedingt – das ist deutlich aggressiver als Leitungswasser und ändert, wie schnell wir arbeiten müssen. Die Diagnose ist in jedem Fall kostenlos, und wir sagen Ihnen ehrlich, wenn sich eine Reinigung nicht mehr lohnt.",
  },
  {
    id: "display",
    icon: "sparkle",
    label: "Display gebrochen",
    teaser: "Sturz, Riss, schwarze Flecken",
    headline: "Erst sichern, dann sichern: die Splitter und die Daten.",
    lede:
      "Ein gebrochenes Display ist selten ein Notfall für das Gerät, aber oft einer für die Finger – und manchmal einer für die Daten, wenn der Touch als Nächstes ausfällt.",
    avoid: [
      {
        title: "Nicht mit Klebeband „reparieren“",
        detail:
          "Paketband und Sekundenkleber machen den späteren Tausch aufwendiger und damit teurer. Ein glatter Displayschutz aus Kunststoff erfüllt denselben Zweck, ohne Rückstände zu hinterlassen.",
      },
      {
        title: "Nicht weiter darauf tippen, wenn es splittert",
        detail:
          "Lose Splitter arbeiten sich unter das Glas und in den Rahmen. Was dort landet, muss später einzeln herausgeholt werden.",
      },
      {
        title: "Nicht selbst öffnen",
        detail:
          "Unter dem Display liegen zwei Flachbandkabel und – je nach Modell – der Akku direkt darunter. Ein durchtrenntes Kabel verwandelt eine Displayreparatur in eine Platinenreparatur.",
      },
    ],
    doThis: [
      {
        title: "Splitter abdecken",
        detail:
          "Eine glatte Klarsichtfolie oder ein Panzerglas über den Bruch legen. Das hält die Splitter, bis wir das Display tauschen.",
      },
      {
        title: "Prüfen, was noch geht",
        detail:
          "Reagiert der Touch überall? Bleiben Farbflecken oder Streifen? Wächst der Riss? Notieren Sie es – das entscheidet, ob nur das Glas oder die gesamte Einheit getauscht wird.",
      },
      {
        title: "Jetzt sichern, solange es geht",
        detail:
          "Solange das Display bedienbar ist, legen Sie ein Backup an. Fällt der Touch später vollständig aus, wird das ungleich mühsamer.",
      },
      {
        title: "Gerätesuche deaktivieren",
        detail:
          "„Wo ist?“ bzw. „Mein Gerät finden“ blockiert sonst die Funktionsprüfung nach dem Einbau. Wenn der Touch das noch hergibt: jetzt erledigen.",
      },
    ],
    outlook:
      "Ein Displaytausch dauert bei uns im Schnitt 45 Minuten. Den Festpreis für Ihr Modell sehen Sie vorher im Sofortpreis-Rechner – inklusive Einbau, ohne Aufschlag.",
  },
  {
    id: "tot",
    icon: "cpu",
    label: "Gerät startet nicht",
    teaser: "Schwarzes Bild, keine Reaktion",
    headline: "Meistens ist es das Kabel. Manchmal nur Fusseln.",
    lede:
      "Bevor Sie vom Schlimmsten ausgehen: Die drei häufigsten Ursachen für ein totes Telefon kosten nichts und sind in zehn Minuten geprüft.",
    avoid: [
      {
        title: "Nicht mit Metall in die Ladebuchse",
        detail:
          "Nadeln, Büroklammern und Messerspitzen verbiegen die Kontakte. Was danach kommt, ist eine echte Reparatur – aus einem Problem, das keines war.",
      },
      {
        title: "Nicht stundenlang dasselbe Kabel probieren",
        detail:
          "Ein Kabelbruch sitzt fast immer direkt hinter dem Stecker und ist von außen nicht zu sehen. Ohne ein zweites Kabel ist der Test wertlos.",
      },
    ],
    doThis: [
      {
        title: "Erzwungenen Neustart auslösen",
        detail:
          "iPhone (ab 8): Lauter kurz, Leiser kurz, dann die Seitentaste gedrückt halten, bis das Logo erscheint – das kann 15 Sekunden dauern. Android: Ein/Aus und Leiser gemeinsam 15 bis 20 Sekunden halten.",
      },
      {
        title: "Eine halbe Stunde laden – und dabei lassen",
        detail:
          "Ein tiefentladener Akku zeigt oft minutenlang gar nichts an. Original-Netzteil an die Steckdose, nicht an den Rechner, und dann wirklich warten.",
      },
      {
        title: "Kabel und Netzteil tauschen",
        detail:
          "Beides einzeln gegen bekannt funktionierende Teile austauschen. Am besten an einem anderen Gerät gegenprüfen.",
      },
      {
        title: "In die Ladebuchse leuchten",
        detail:
          "Taschenlampe und Lupe. Verdichtete Fusseln aus der Hosentasche sind die häufigste Ursache dafür, dass ein Stecker nicht mehr einrastet. Vorsichtig mit einem Holzzahnstocher lösen – niemals mit Metall.",
      },
    ],
    outlook:
      "Hilft nichts davon, finden wir die Ursache. Die Diagnose ist kostenlos, und Sie erfahren vorher, was eine Reparatur kosten würde – auch dann, wenn unsere Antwort lautet, dass sie sich nicht lohnt.",
  },
  {
    id: "akku",
    icon: "battery",
    label: "Akku bläht sich",
    teaser: "Gehäuse steht ab, Display wölbt sich",
    headline: "Das ist der eine Fall, bei dem Sie nicht abwarten sollten.",
    lede:
      "Ein aufgeblähter Akku ist kein Schönheitsfehler, sondern eine chemische Reaktion in einem geschlossenen Gehäuse. Gefährlich wird er vor allem dann, wenn man ihn falsch behandelt.",
    avoid: [
      {
        title: "Nicht weiter laden",
        detail:
          "Laden treibt die Reaktion an. Nehmen Sie das Gerät vom Kabel und lassen Sie es dort, wo es niemanden gefährdet.",
      },
      {
        title: "Nicht drücken, nicht zurückbiegen, nichts hineinstechen",
        detail:
          "Ein beschädigter Lithium-Ionen-Akku kann sich entzünden. Das abstehende Display ist ein Warnsignal, kein Defekt, den man zudrücken kann.",
      },
      {
        title: "Nicht im Bett, auf dem Sofa oder im Auto lagern",
        detail:
          "Kein Brennbares in der Nähe, keine direkte Sonne, kein aufgeheiztes Fahrzeug. Ein Küchentisch oder eine Fensterbank aus Stein sind gute Orte.",
      },
      {
        title: "Nicht in den Hausmüll",
        detail:
          "Beschädigte Akkus gehören nie in den Restmüll. Bringen Sie das Gerät zu uns oder zu einer Sammelstelle – wir entsorgen es fachgerecht, auch ohne Reparaturauftrag.",
      },
    ],
    doThis: [
      {
        title: "Vom Strom nehmen und ablegen",
        detail:
          "Gerät ausschalten, Kabel ab, auf eine nicht brennbare Fläche legen. Ab jetzt nur noch transportieren, nicht mehr benutzen.",
      },
      {
        title: "Daten sichern, wenn es gefahrlos geht",
        detail:
          "Lässt sich das Gerät noch kurz bedienen, sichern Sie das Wichtigste – aber nicht am Ladekabel und nicht über Stunden.",
      },
      {
        title: "Anrufen, bevor Sie losfahren",
        detail:
          "Bei stark gewölbtem Gehäuse sagen wir Ihnen am Telefon, wie Sie das Gerät sicher zu uns bringen. Das dauert zwei Minuten und erspart im Zweifel viel.",
      },
    ],
    outlook:
      "Ein Akkutausch dauert bei uns rund 30 Minuten. Wenn Sie unsicher sind, ob die Wölbung schon eine ist: Legen Sie das Gerät mit dem Display nach unten auf einen flachen Tisch und drehen Sie es leicht an. Wackelt es, ist es der Akku.",
  },
];
