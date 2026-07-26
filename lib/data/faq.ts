export interface FaqEntry {
  question: string;
  answer: string;
}

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
    question: "Was bedeutet die 24-Monats-Garantie?",
    answer:
      "Auf jede Reparatur und jedes verbaute Teil geben wir 24 Monate Garantie. Tritt derselbe Fehler erneut auf, beheben wir ihn kostenfrei.",
  },
  {
    question: "Was, wenn die Reparatur nicht möglich ist?",
    answer:
      "Dann zahlen Sie nichts. Die Diagnose ist kostenlos und unverbindlich – Sie entscheiden erst nach unserem Festpreis-Angebot.",
  },
  {
    question: "Kann ich ohne Termin vorbeikommen?",
    answer:
      "Ja, jederzeit während der Öffnungszeiten. Mit Termin garantieren wir allerdings, dass Ihr Gerät sofort auf den Werktisch kommt.",
  },
];
