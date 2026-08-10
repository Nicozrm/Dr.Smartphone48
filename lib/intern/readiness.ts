/**
 * Was vor dem Livegang noch fehlt – gerechnet, nicht aufgeschrieben.
 *
 * Die Liste stand als Prosa am Ende von CLAUDE.md. Dort ist sie richtig
 * aufgehoben für den, der am Code arbeitet, und wertlos für den, der den
 * Betrieb führt: Sie veraltet still, und niemand liest eine
 * Entwicklerdatei, bevor er eine Rechnung schreibt.
 *
 * Deshalb steht sie jetzt auf `/intern` – der Seite, die der Betrieb
 * ohnehin morgens öffnet – und zusätzlich als `npm run livegang` im
 * Terminal. Beide fragen dieselbe Funktion; zwei Listen wären dieselbe
 * Falle wie überall sonst in diesem Projekt.
 *
 * ## Zwei Schweregrade, und der Unterschied ist wichtig
 *
 * – **Blocker**: Etwas ist zugesagt und wird nicht gehalten. Ein Kunde
 *   merkt es, nicht der Betrieb.
 * – **Hinweis**: Etwas fehlt oder veraltet, aber die Seite lügt deswegen
 *   nicht.
 *
 * Was hier **nicht** stehen kann, steht als `MANUELL` am Ende der Datei:
 * Zusagen, die nur ein Mensch bestätigen kann. Sie zu erfinden wäre
 * schlimmer als sie wegzulassen – eine grüne Liste, die etwas übersieht,
 * ist gefährlicher als gar keine.
 */

export type Schwere = "blocker" | "hinweis";

export interface ReadinessItem {
  id: string;
  titel: string;
  hinweis: string;
  /** Wohin man geht, um es zu erledigen. */
  href?: string;
  schwere: Schwere;
}

export interface Stammdaten {
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  vatId: string;
}

export interface ReadinessInput {
  /** Wie viele Schlüssel im veröffentlichten Ring stehen. */
  certKeyCount: number;
  /**
   * Rechnungsprofil aus dem Browserspeicher. `null`, wenn nicht lesbar
   * (Server, oder noch nicht geladen) – dann entfällt die Prüfung, statt
   * einen Mangel zu behaupten, der vielleicht keiner ist.
   */
  profile: { iban: string; bic: string; taxNumber: string } | null;
  /** Datum der letzten Prüfung des Update-Horizonts (ISO). */
  supportChecked: string;
  site: Stammdaten;
  now: number;
}

/*
  Werte, die nach Vorlage aussehen. Die Stammdaten dieses Projekts sind
  inzwischen echt – die Prüfung bleibt trotzdem, weil eine Kopie dieses
  Repositorys wieder mit Vorlagen anfängt und weil ein halb ausgefülltes
  Impressum eine Abmahnung ist, kein Schönheitsfehler.
*/
const VORLAGE = /muster|beispiel|example|platzhalter|xxx|straße 1\b|000000|12345/i;

const MONAT = 30 * 24 * 60 * 60 * 1000;

export function readiness(input: ReadinessInput): ReadinessItem[] {
  const out: ReadinessItem[] = [];

  /*
    Der Schlüsselring. Solange er leer ist, kann niemand außerhalb des
    ausstellenden Browsers ein Zertifikat prüfen – die Seite /pruefen
    meldet jeden Beleg als „Schlüssel nicht hinterlegt“. Ausgestellt wird
    trotzdem, und das ist der Grund, warum es auffallen muss: Der Betrieb
    gibt Belege aus, die sein Versprechen nicht einlösen.
  */
  if (input.certKeyCount === 0) {
    out.push({
      id: "schluessel",
      titel: "Signaturschlüssel nicht veröffentlicht",
      hinweis:
        "Ausgestellte Zertifikate lassen sich außerhalb dieses Browsers nicht prüfen. Schlüssel erzeugen und die angezeigte Zeile in lib/cert/keys.ts übernehmen.",
      href: "/intern/zertifikat",
      schwere: "blocker",
    });
  }

  // Pflichtangaben der Rechnung. Ohne sie bleibt der GiroCode aus, und
  // § 14 UStG ist nicht erfüllt.
  if (input.profile) {
    const fehlend = [
      !input.profile.iban.trim() && "IBAN",
      !input.profile.bic.trim() && "BIC",
      !input.profile.taxNumber.trim() && "Steuernummer",
    ].filter(Boolean) as string[];

    if (fehlend.length > 0) {
      out.push({
        id: "bankverbindung",
        titel: `${fehlend.join(", ")} ${fehlend.length === 1 ? "fehlt" : "fehlen"}`,
        hinweis:
          "Ohne diese Angaben bleibt der GiroCode aus und die Rechnung ist nach § 14 UStG unvollständig. Unter „Stammdaten“ im Rechnungswerkzeug eintragen.",
        href: "/intern/rechnung",
        schwere: "blocker",
      });
    }
  }

  // Stammdaten, die nach Vorlage aussehen.
  const verdaechtig = (
    [
      ["Straße", input.site.street],
      ["PLZ", input.site.zip],
      ["Ort", input.site.city],
      ["Telefon", input.site.phone],
      ["E-Mail", input.site.email],
      ["USt-IdNr.", input.site.vatId],
    ] as const
  )
    .filter(([, wert]) => !wert.trim() || VORLAGE.test(wert))
    .map(([name]) => name);

  if (verdaechtig.length > 0) {
    out.push({
      id: "stammdaten",
      titel: `Stammdaten sehen nach Vorlage aus: ${verdaechtig.join(", ")}`,
      hinweis:
        "Diese Angaben stehen im Impressum, in den Rechnungen und in den strukturierten Daten für Google. lib/site.ts.",
      schwere: "blocker",
    });
  }

  /*
    Der Update-Horizont veraltet von selbst, weil Hersteller ihre Zusagen
    ändern. `verify:support` bricht nach zwölf Monaten ab; hier steht der
    Hinweis früher, damit es nicht erst der Prüflauf sagt.
  */
  const geprueft = Date.parse(input.supportChecked);
  if (!Number.isNaN(geprueft)) {
    const monate = Math.floor((input.now - geprueft) / MONAT);
    if (monate >= 6) {
      out.push({
        id: "support",
        titel: `Update-Horizont seit ${monate} Monaten nicht geprüft`,
        hinweis:
          "Kunden entscheiden danach, ob sich eine Reparatur lohnt. Tabelle durchsehen und SUPPORT_CHECKED hochsetzen – auch wenn sich nichts geändert hat.",
        schwere: monate >= 12 ? "blocker" : "hinweis",
      });
    }
  }

  return out;
}

/**
 * Was keine Maschine bestätigen kann.
 *
 * Diese Punkte stehen auf der Seite als Liste zum Abhaken, ohne Häkchen –
 * ein Häkchen, das sich selbst setzt, wäre gelogen. Sie verschwinden
 * nicht, weil niemand ihnen ansieht, ob sie erledigt sind.
 */
export const MANUELL: { titel: string; hinweis: string }[] = [
  {
    titel: "Interner Bereich abgesichert",
    hinweis:
      "Die Anmeldung schützt die Vorgänge, nicht die Seite: Rechnung und Zertifikat laufen im Browser und stehen jedem offen, der die Adresse kennt. Cloudflare Access auf /intern/* davorsetzen.",
  },
  {
    titel: "Garantiedauer bestätigt",
    hinweis:
      "site.warrantyMonths steht auf einem Wert, den niemand außer dem Betrieb kennt. Er erscheint in FAQ, auf /ersatzteile und in jedem Zertifikat.",
  },
  {
    titel: "Preise gegengelesen",
    hinweis:
      "Die Preise in lib/data/devices.ts sind zugleich Sofortpreis-Rechner, Rechnung und Festpreiszusage im Ticket.",
  },
];
