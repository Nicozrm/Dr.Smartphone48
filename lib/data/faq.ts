import { site } from "@/lib/site";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Häufige Fragen.
 *
 * Garantieangaben werden **ausschließlich** aus `site.warrantyMonths`
 * gezogen. Zuvor standen hier 24 Monate, während der Konfigurator, die
 * Startseite und die Ersatzteil-Seite 12 Monate auswiesen – ein Widerspruch
 * auf derselben Seite. Steht die Zusage an einer Stelle als feste Zahl, läuft
 * sie beim nächsten Textwechsel wieder auseinander.
 */
export const faq: FaqEntry[] = [
  {
    question: "Wie lange dauert eine Reparatur?",
    answer:
      "Die meisten Reparaturen erledigen wir in unter einer Stunde – ein Displaytausch dauert im Schnitt 45 Minuten. Sie sehen die voraussichtliche Dauer vorab im Sofortpreis-Rechner.",
  },
  {
    question: "Bleiben meine Daten erhalten?",
    answer:
      "Ja. Wir reparieren am Gerät, ohne Daten anzufassen. Ein Backup empfehlen wir trotzdem – wie vor jedem Werkstattbesuch.",
  },
  {
    question: "Welche Ersatzteile verwenden Sie?",
    answer:
      "Ausschließlich Originalteile oder geprüfte Teile in Originalqualität. Jedes Teil durchläuft vor dem Einbau unsere Eingangskontrolle.",
  },
  {
    question: `Was bedeutet die ${site.warrantyMonths}-Monats-Garantie?`,
    answer: `Auf jede Reparatur und jedes verbaute Teil geben wir ${site.warrantyMonths} Monate Garantie. Tritt derselbe Fehler erneut auf, beheben wir ihn kostenfrei. Ihre gesetzlichen Gewährleistungsrechte bleiben davon unberührt.`,
  },
  {
    question: "Was, wenn die Reparatur nicht möglich ist?",
    answer:
      "Dann zahlen Sie nichts. Die Diagnose ist kostenlos und unverbindlich – Sie entscheiden erst nach unserem Festpreis-Angebot.",
  },
  {
    question: "Kann ich ohne Termin vorbeikommen?",
    answer: `Ja, jederzeit während der Öffnungszeiten (${site.openingHoursShort}). Mit Termin garantieren wir allerdings, dass Ihr Gerät sofort auf den Werktisch kommt.`,
  },
];

/**
 * Dieselben Fragen maschinenlesbar. Google spielt daraus ein Rich Result aus –
 * die Antworten stehen dann direkt im Suchergebnis. Voraussetzung ist, dass
 * jede Frage auch sichtbar auf der Seite steht; deshalb wird dieses Schema nur
 * dort eingebunden, wo die FAQ-Sektion tatsächlich gerendert wird.
 */
export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
};
