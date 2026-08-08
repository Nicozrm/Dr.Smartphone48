/**
 * Was der Hersteller liefern muss – und ab wann.
 *
 * Seit dem 20. Juni 2025 gilt die Ökodesign-Verordnung (EU) 2023/1670 für
 * Smartphones und Tablets. Sie ist der Grund, warum ein Kunde heute Anspruch
 * auf ein Ersatzteil hat, wo er früher auf Kulanz angewiesen war – und
 * praktisch keine Werkstatt in Deutschland sagt ihm das.
 *
 * Für diese Werkstatt ist die Verordnung doppelt interessant: Sie verpflichtet
 * Hersteller ausdrücklich, bestimmte Ersatzteile auch an **unabhängige**
 * Betriebe abzugeben. Das ist die rechtliche Grundlage dafür, dass es uns
 * überhaupt geben darf.
 *
 * ## Die eine Einschränkung, die alles entscheidet
 *
 * Die Verordnung gilt für Geräte, die **ab dem 20. Juni 2025 in Verkehr
 * gebracht** wurden. Für alles davor gilt sie nicht. Das betrifft den größten
 * Teil dessen, was heute in einer Werkstatt liegt – und wer das verschweigt,
 * verkauft einem Kunden einen Anspruch, den er nicht hat.
 *
 * Deshalb ist der Ausgangspunkt dieser Seite nicht die Verordnung, sondern
 * die Frage: Gilt sie für dieses Gerät? Bei den meisten lautet die Antwort
 * nein, und dann stehen dort stattdessen die Rechte, die ohnehin gelten
 * (Gewährleistung nach BGB).
 *
 * ## Warum hier kein festes Enddatum steht
 *
 * Die sieben Jahre laufen ab dem Ende des Inverkehrbringens, also ab dem
 * Zeitpunkt, zu dem der Hersteller das Modell nicht mehr verkauft – nicht ab
 * der Markteinführung. Wann das sein wird, weiß heute niemand. Aus dem
 * Erscheinungsjahr lässt sich deshalb nur eine **Untergrenze** ableiten, und
 * genau so wird sie auch bezeichnet. Ein ausgerechnetes Datum wäre eine
 * Genauigkeit, die es nicht gibt.
 */

/** Geltungsbeginn der Verordnung (EU) 2023/1670. */
export const ECODESIGN_START = "2025-06-20";

/** Mindestzeitraum für Ersatzteile, ab Ende des Inverkehrbringens. */
export const PARTS_YEARS = 7;

/** Mindestzeitraum für Sicherheitsupdates, ab Ende des Inverkehrbringens. */
export const SECURITY_YEARS = 5;

/** Der Akku muss so viele volle Zyklen mit mindestens 80 % Kapazität halten. */
export const BATTERY_CYCLES = 800;
export const BATTERY_CAPACITY = 0.8;

export type Audience = "werkstatt" | "jeder";

export interface Obligation {
  id: string;
  title: string;
  /** Was daraus für einen Kunden folgt. Keine Paragrafenprosa. */
  detail: string;
  /** An wen das Teil bzw. die Leistung abgegeben werden muss. */
  audience?: Audience;
}

/**
 * Die Pflichten der Verordnung, soweit sie einen Kunden betreffen.
 *
 * Bewusst keine vollständige Wiedergabe: Was ein Betrieb nicht in einem Satz
 * erklären kann, gehört nicht auf eine Kundenseite, sondern in den
 * Gesetzestext – der ist verlinkt.
 */
export const ecodesignDuties: Obligation[] = [
  {
    id: "teile-werkstatt",
    title: "Ersatzteile für unabhängige Werkstätten",
    detail:
      "Display, Akku, Kamera, Ladebuchse, Mikrofon, Lautsprecher, Knöpfe, Scharniere und die mechanischen Teile müssen mindestens sieben Jahre lang lieferbar sein – auch an Betriebe, die nicht zum Hersteller gehören.",
    audience: "werkstatt",
  },
  {
    id: "teile-jeder",
    title: "Akku und einige Teile für jeden",
    detail:
      "Ein Teil dieser Liste, darunter der Akku, muss an jeden abgegeben werden, der ihn kaufen will. Wer selbst schrauben möchte, darf das.",
    audience: "jeder",
  },
  {
    id: "lieferzeit",
    title: "Lieferung binnen weniger Werktage",
    detail:
      "Bestellte Ersatzteile müssen innerhalb weniger Werktage geliefert werden. Ein Teil, das erst in zwei Monaten kommt, erfüllt die Pflicht nicht.",
  },
  {
    id: "updates",
    title: "Fünf Jahre Sicherheitsupdates",
    detail:
      "Nach dem Ende des Verkaufs muss das Betriebssystem mindestens fünf weitere Jahre Sicherheitskorrekturen bekommen. Das ist eine Untergrenze; einige Hersteller sagen deutlich mehr zu.",
  },
  {
    id: "akku",
    title: "Der Akku muss 800 Zyklen aushalten",
    detail:
      "Nach 800 vollständigen Ladezyklen muss noch mindestens 80 % der ursprünglichen Kapazität übrig sein. Wer täglich einmal voll lädt, erreicht das nach gut zwei Jahren.",
  },
  {
    id: "label",
    title: "Energielabel mit Reparaturklasse",
    detail:
      "Neue Geräte tragen ein Label wie Kühlschränke: Akkulaufzeit, Sturzfestigkeit, Schutz gegen Wasser und Staub, dazu eine Reparierbarkeitsklasse von A bis E. Zum ersten Mal steht die Reparierbarkeit auf der Verpackung.",
  },
];

/**
 * Rechte, die unabhängig von der Verordnung gelten.
 *
 * Sie sind für die meisten Kunden die praktisch wichtigeren, weil sie
 * jedes gekaufte Gerät betreffen und nicht erst die ab Juni 2025.
 */
export const generalRights: Obligation[] = [
  {
    id: "gewaehrleistung",
    title: "Zwei Jahre Gewährleistung gegenüber dem Verkäufer",
    detail:
      "Bei einem Mangel, der schon beim Kauf angelegt war, haftet der Verkäufer zwei Jahre lang – nicht der Hersteller, und unabhängig von jeder Garantie. Das ist Gesetz (§ 438 BGB) und lässt sich beim Neukauf nicht abbedingen.",
  },
  {
    id: "beweislast",
    title: "Im ersten Jahr muss der Verkäufer beweisen",
    detail:
      "Zeigt sich ein Mangel innerhalb der ersten zwölf Monate, wird vermutet, dass er von Anfang an bestand. Der Verkäufer muss das Gegenteil beweisen, nicht der Kunde (§ 477 BGB).",
  },
  {
    id: "updatepflicht",
    title: "Updatepflicht für Geräte mit digitalen Elementen",
    detail:
      "Seit 2022 schuldet der Verkäufer über den üblichen Nutzungszeitraum hinweg auch Aktualisierungen (§ 475b, § 475c BGB). Bleiben sie aus, ist das ein Mangel wie ein defektes Bauteil.",
  },
];

export interface Applicability {
  covered: boolean;
  /** Untergrenze für die Ersatzteilversorgung, nur wenn `covered`. */
  partsFloor?: number;
  /** Untergrenze für Sicherheitsupdates, nur wenn `covered`. */
  securityFloor?: number;
}

/**
 * Gilt die Verordnung für ein Gerät dieses Erscheinungsjahrgangs?
 *
 * `released` ist ein ISO-Datum (YYYY-MM oder YYYY-MM-TT). Das Erscheinen ist
 * ein **Näherungswert** für das Inverkehrbringen – die Verordnung stellt
 * darauf ab, wann ein Gerät erstmals auf dem Unionsmarkt bereitgestellt wird.
 * Für die Frage „vor oder nach Juni 2025" reicht das; auf der Seite steht,
 * dass es eine Näherung ist.
 *
 * Die zurückgegebenen Jahreszahlen sind **Untergrenzen**: Die Fristen laufen
 * ab dem Verkaufsende, das später liegt als das Erscheinen. Wer sie als
 * Enddatum liest, unterschätzt seinen Anspruch – nie umgekehrt.
 */
export function applies(released: string): Applicability {
  const start = Date.parse(`${ECODESIGN_START}T00:00:00Z`);
  const at = Date.parse(
    released.length === 7 ? `${released}-01T00:00:00Z` : `${released}T00:00:00Z`,
  );
  if (Number.isNaN(at) || at < start) return { covered: false };

  const year = new Date(at).getUTCFullYear();
  return {
    covered: true,
    partsFloor: year + PARTS_YEARS,
    securityFloor: year + SECURITY_YEARS,
  };
}

/** Wie lange dauert es bei diesem Ladeverhalten bis zu 800 Zyklen? */
export function monthsToCycles(cyclesPerDay: number): number {
  if (cyclesPerDay <= 0) return Infinity;
  return (BATTERY_CYCLES / cyclesPerDay / 365) * 12;
}

/** Fundstelle für alle, die nachlesen wollen. */
export const ECODESIGN_SOURCE = {
  label: "Verordnung (EU) 2023/1670",
  url: "https://eur-lex.europa.eu/eli/reg/2023/1670/oj",
};
