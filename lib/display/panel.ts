/**
 * Der Farbraum-Beweis – was das verbaute Panel wirklich kann.
 *
 * Auf /ersatzteile steht, woran man ein billiges Ersatzdisplay erkennt:
 * niederfrequente Dimmung, andere Farbtreue, andere Bildwiederholrate. Zwei
 * davon sind inzwischen messbar (PWM-Diagramm, Bildfrequenz-Schreiber). Der
 * Farbraum war der dritte, und er ist der einzige, den man **sehen** kann
 * statt ihn zu messen.
 *
 * Ein Original-OLED deckt in aller Regel Display P3 ab, ein günstiger
 * Nachbau oft nur sRGB. Der Unterschied ist kein Datenblattwert: Stellt man
 * dieselbe Farbe einmal in sRGB und einmal in P3 nebeneinander, sind auf
 * einem P3-Panel zwei Felder zu sehen und auf einem sRGB-Panel eines. Der
 * Browser rechnet die P3-Farbe dort auf den kleineren Raum herunter, und
 * dabei landet sie genau auf der sRGB-Farbe daneben.
 *
 * ## Warum das Sehen und nicht die Abfrage der Beweis ist
 *
 * `matchMedia("(color-gamut: p3)")` beantwortet die Frage scheinbar direkt.
 * Die Angabe ist aber eine Auskunft des Systems über sich selbst, und sie
 * ist an mehreren Stellen ungenau: Manche Browser melden den Farbraum des
 * Fensters statt den des Panels, manche Systeme melden P3 für ein Panel, das
 * es nur näherungsweise abdeckt, und in einer Fernsitzung beschreibt die
 * Angabe den falschen Bildschirm. Die Felder dagegen zeigen, was ankommt.
 *
 * Deshalb steht beides nebeneinander: die Auskunft des Browsers als Angabe,
 * die Felder als Beweis. Wo sie sich widersprechen, gilt das Auge.
 *
 * ## Was hier bewusst fehlt
 *
 * Eine Pixeldichte. Sie wäre die naheliegendste Zahl eines Display-
 * Steckbriefs und ist im Browser nicht zu haben: Die physische Größe des
 * Bildschirms gibt kein Web-API preis, und `devicePixelRatio` ist ein
 * Skalierungsfaktor, kein Maß. Man müsste die Diagonale aus einer
 * Modelltabelle raten – also eine Zahl erfinden und ihr zwei Nachkommastellen
 * geben.
 */

/** Farbräume, die ein Browser melden kann – in aufsteigender Größe. */
export type Gamut = "srgb" | "p3" | "rec2020" | "unbekannt";

export interface PanelProbe {
  /** Breite in CSS-Pixeln (window.screen.width). */
  cssWidth: number;
  /** Höhe in CSS-Pixeln. */
  cssHeight: number;
  /** devicePixelRatio. */
  dpr: number;
  /** Vom Browser gemeldeter Farbraum. */
  gamut: Gamut;
  /** Meldet der Browser hohen Dynamikumfang? */
  highDynamicRange: boolean;
  /** screen.colorDepth in Bit. */
  colorDepth: number;
}

/**
 * Physische Bildpunkte aus CSS-Punkten und Skalierungsfaktor.
 *
 * Das Ergebnis ist eine Rechnung, keine Auskunft: Der Browser nennt die
 * Zahl der Bildpunkte nicht. Bei einer Systemskalierung, die nicht ganzzahlig
 * ist, geht die Rechnung nicht auf – deshalb wird gerundet, und deshalb
 * steht auf der Seite „gerechnet“ und nicht „gemessen“.
 */
export function physicalPixels(probe: PanelProbe): { width: number; height: number } {
  return {
    width: Math.round(probe.cssWidth * probe.dpr),
    height: Math.round(probe.cssHeight * probe.dpr),
  };
}

/** Bildpunkte in Millionen, auf eine Nachkommastelle. */
export function megapixels(probe: PanelProbe): number {
  const { width, height } = physicalPixels(probe);
  return Math.round((width * height) / 1e5) / 10;
}

/**
 * Beschriftung eines Farbraums.
 *
 * Jeder Fall wird benannt, auch der unbekannte. Ein leerer Wert in einer
 * Tabelle sieht aus wie ein Fehler der Seite, nicht wie eine fehlende
 * Auskunft des Browsers.
 */
export function gamutLabel(gamut: Gamut): string {
  switch (gamut) {
    case "rec2020":
      return "Rec. 2020";
    case "p3":
      return "Display P3";
    case "srgb":
      return "sRGB";
    default:
      return "keine Angabe";
  }
}

/** Deckt der gemeldete Farbraum mindestens P3 ab? */
export function coversP3(gamut: Gamut): boolean {
  return gamut === "p3" || gamut === "rec2020";
}

/**
 * Was aus der Auskunft des Browsers folgt – und was nicht.
 *
 * Die beiden Sätze hängen zusammen und dürfen nicht auseinanderlaufen:
 * Meldet der Browser sRGB, ist damit nicht bewiesen, dass das Panel nicht
 * mehr kann; meldet er P3, ist nicht bewiesen, dass das Panel es voll
 * abdeckt. Beweis ist in beiden Richtungen nur, was in den Feldern zu sehen
 * ist.
 */
export function gamutReading(probe: PanelProbe): string {
  /* Ohne Richtungsangabe („unten“, „oben“): Der Satz steht unter den
     Feldern, nicht über ihnen, und eine Umstellung im Aufbau machte aus
     einer Ortsangabe stillschweigend eine falsche. */
  if (probe.gamut === "unbekannt") {
    return "Ihr Browser macht keine Angabe zum Farbraum. Die Felder sagen trotzdem, was ankommt.";
  }
  if (coversP3(probe.gamut)) {
    return `Ihr Browser meldet ${gamutLabel(probe.gamut)}. Sehen Sie in den Feldern einen Unterschied, deckt das Panel mehr als sRGB ab.`;
  }
  return "Ihr Browser meldet sRGB. Sehen Sie in den Feldern keinen Unterschied, passt das zusammen – ein Nachbaudisplay bleibt oft bei sRGB.";
}
