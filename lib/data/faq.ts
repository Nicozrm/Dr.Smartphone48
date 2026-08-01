import { site } from "@/lib/site";

export interface FaqEntry {
  question: string;
  answer: string;
}

/*
  Häufige Fragen.

  Die Garantiedauer kommt aus den Stammdaten, nicht aus dem Fließtext –
  sonst steht hier irgendwann eine andere Zahl als im Rest der Seite, und
  ausgerechnet die landet über die FAQPage-Daten im Suchergebnis.

  Beantwortet wird auch, was unangenehm ist: dass wir bei aktiver
  Kontosperre nicht ankaufen dürfen, dass Reis nicht hilft, warum es
  anderswo billiger ist. Eine FAQ, die nur die Werbung wiederholt, liest
  niemand zweimal.
*/
export const faq: FaqEntry[] = [
  {
    question: "Wie lange dauert eine Reparatur?",
    answer:
      "Die meisten Reparaturen erledigen wir in unter einer Stunde – ein Displaytausch dauert im Schnitt 45 Minuten. Die voraussichtliche Dauer sehen Sie vorab im Sofortpreis-Rechner.",
  },
  {
    question: "Bleiben meine Daten erhalten?",
    answer:
      "Ja. Wir reparieren am Gerät, ohne Daten anzufassen. Ein Backup empfehlen wir trotzdem – wie vor jedem Werkstattbesuch. Keine Reparatur ist eine Garantie gegen Datenverlust.",
  },
  {
    question: "Welche Ersatzteile verwenden Sie?",
    answer:
      "Ausschließlich Originalteile oder geprüfte Teile in Originalqualität. Jedes Teil durchläuft vor dem Einbau unsere Eingangskontrolle. Günstige Nachbauten verbauen wir nicht.",
  },
  {
    question: `Was bedeutet die Garantie von ${site.warrantyMonths} Monaten?`,
    answer: `Auf jede Reparatur und jedes verbaute Teil geben wir ${site.warrantyMonths} Monate Garantie. Tritt derselbe Fehler erneut auf, beheben wir ihn kostenfrei.`,
  },
  {
    question: "Was, wenn die Reparatur nicht möglich ist?",
    answer:
      "Dann zahlen Sie nichts. Die Diagnose ist kostenlos und unverbindlich – Sie entscheiden erst nach unserem Festpreis-Angebot. Lohnt sich die Reparatur wirtschaftlich nicht, sagen wir Ihnen auch das.",
  },
  {
    question: "Kann ich ohne Termin vorbeikommen?",
    answer: `Ja, jederzeit während der Öffnungszeiten (${site.openingHoursShort}). Mit Termin kommt Ihr Gerät allerdings sofort auf den Werktisch.`,
  },
  {
    question: "Mein Handy ist ins Wasser gefallen – was jetzt?",
    answer:
      "Nicht laden und nicht einschalten. Strom auf einer feuchten Platine richtet mehr Schaden an als das Wasser selbst. Kein Reis, kein Föhn. Die vollständige Anleitung steht unter „Notfall“ und ist auch ohne Internetverbindung abrufbar.",
  },
  {
    question: "Kaufen Sie auch gebrauchte oder defekte Geräte an?",
    answer:
      "Ja. Was wir zahlen, rechnet der Ankauf-Rechner Posten für Posten vor. Nicht ankaufen dürfen wir Geräte mit aktiver Aktivierungssperre – die lassen sich nicht einrichten und damit nicht weiterverkaufen. Zum Termin bitte den Ausweis mitbringen.",
  },
  {
    question: "Muss ich IMEI und Sperrcode herausgeben?",
    answer:
      "Die IMEI hilft bei der Zuordnung, ist aber freiwillig. Beim Sperrcode haben Sie die Wahl: Gerät entsperrt übergeben, den Code vor Ort mündlich nennen – wir vernichten ihn bei der Abholung – oder gesperrt lassen. Im letzten Fall sagen wir vorher, welche Prüfungen dann entfallen.",
  },
  {
    question: "Warum ist eine Reparatur woanders günstiger?",
    answer:
      "Fast immer wegen des Ersatzteils. Ein günstiger Nachbau spart im Einkauf spürbar und kostet Helligkeit, Farbtreue und Reaktionszeit; oft fällt zusätzlich True Tone aus. Unter „Ersatzteile“ können Sie den Unterschied selbst ausprobieren.",
  },
];
