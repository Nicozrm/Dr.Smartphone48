/*
  Reparatur-Ticket – der Kostenvoranschlag als eigenständiges Dokument.

  Der gesamte Zustand steckt in der Adresse, nicht in einer Datenbank. Das hat
  drei Folgen, die alle gewollt sind:

  – Der Link ist teilbar. Wer den Preis für das Gerät seiner Mutter berechnet,
    schickt ihn weiter, und sie sieht dasselbe.
  – Es gibt nichts zu speichern und nichts zu verlieren. Kein Konto, kein
    Cookie, kein Datensatz über einen Menschen, der vielleicht nie kommt.
  – Dasselbe Ticket ergibt immer dieselbe Vorgangsnummer. Werkstatt und Kunde
    sprechen über denselben Vorgang, ohne dass ihn jemand vergeben musste.

  Die Parameter sind absichtlich lesbar (`g=apple.iphone-15-pro`) statt
  base64-kodiert: Ein Link, den man versteht, wirkt weniger wie ein Tracker.
*/

import {
  findModel,
  repairMeta,
  type Brand,
  type DeviceModel,
  type RepairKind,
  type RepairMeta,
} from "@/lib/data/devices";

export interface TicketPosition extends RepairMeta {
  price: number;
}

export interface Ticket {
  brand: Brand;
  model: DeviceModel;
  positions: TicketPosition[];
  /** Summe der Festpreise in Euro. */
  total: number;
  /** Summe der veranschlagten Arbeitszeit in Minuten. */
  minutes: number;
  /** Aus der Auswahl abgeleitet – gleiche Auswahl, gleiche Nummer. */
  reference: string;
  /** Kanonische Parameter, für Link und QR-Code. */
  query: string;
}

/** Baut die Adressparameter aus einer Auswahl. */
export function ticketQuery(
  brandId: string,
  modelId: string,
  repairs: RepairKind[],
): string {
  const sorted = [...new Set(repairs)].sort();
  const params = new URLSearchParams();
  params.set("g", `${brandId}.${modelId}`);
  if (sorted.length > 0) params.set("r", sorted.join("."));
  return params.toString();
}

/**
 * Vorgangsnummer aus der Auswahl: FNV-1a über die kanonischen Parameter,
 * dargestellt in einem Alphabet ohne verwechselbare Zeichen (kein I, O, 0, 1).
 * Deterministisch – derselbe Voranschlag trägt immer dieselbe Nummer.
 */
export function ticketReference(query: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < query.length; i++) {
    hash ^= query.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length);
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

/**
 * Liest ein Ticket aus den Adressparametern. Gibt null zurück, wenn Gerät
 * oder Modell unbekannt sind – dann zeigt die Seite ihren leeren Zustand
 * statt eines halbgaren Voranschlags.
 */
export function parseTicket(params: URLSearchParams): Ticket | null {
  const device = params.get("g");
  if (!device) return null;

  const [brandId, ...rest] = device.split(".");
  const modelId = rest.join(".");
  if (!brandId || !modelId) return null;

  const entry = findModel(brandId, modelId);
  if (!entry) return null;

  const requested = (params.get("r") ?? "")
    .split(".")
    .filter(Boolean) as RepairKind[];

  const positions: TicketPosition[] = [];
  for (const kind of [...new Set(requested)].sort()) {
    const meta = repairMeta[kind];
    const price = entry.model.prices[kind];
    // Nicht angebotene Reparaturen werden stillschweigend übergangen –
    // ein Ticket zeigt nur, was für dieses Modell tatsächlich existiert.
    if (!meta || price === undefined) continue;
    positions.push({ ...meta, price });
  }

  const query = ticketQuery(
    brandId,
    modelId,
    positions.map((p) => p.kind),
  );

  return {
    brand: entry.brand,
    model: entry.model,
    positions,
    total: positions.reduce((sum, p) => sum + p.price, 0),
    minutes: positions.reduce((sum, p) => sum + p.minutes, 0),
    reference: ticketReference(query),
    query,
  };
}

/**
 * Termin als iCalendar-Datei. Bewusst als Erinnerung formuliert und ohne
 * feste Uhrzeit: Wir bestätigen keinen Termin, den niemand bestätigt hat.
 * Der Eintrag ist ganztägig und trägt alles bei sich, was in der Werkstatt
 * gebraucht wird.
 */
export function ticketIcs(options: {
  ticket: Ticket;
  /** Tag des geplanten Besuchs. */
  date: Date;
  url: string;
  location: string;
  organizer: string;
}): string {
  const { ticket, date, url, location, organizer } = options;

  const day = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const next = new Date(date);
  next.setDate(next.getDate() + 1);

  // DTSTAMP ist der Zeitpunkt der Erzeugung in UTC. Zuvor stand hier das
  // **lokale** Datum mit angehängtem „Z“ – auf einem Rechner östlich von
  // Greenwich war der Stempel damit kurz nach Mitternacht einen Tag voraus.
  const stamp = `${new Date().toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;

  /*
    Escaping nach RFC 5545 § 3.3.11.

    Komma und Semikolon trennen in iCalendar Werte voneinander. Ein Text, der
    sie unmaskiert enthält, ist deshalb kein Text mehr, sondern eine Liste –
    strenge Programme zerlegen ihn, andere zeigen den Rest gar nicht.
    Der Backslash muss zuerst ersetzt werden, sonst verdoppelt der nächste
    Durchgang die gerade erzeugten Maskierungen.
  */
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  // Jede Zeile einzeln maskieren, dann mit der Zeilenumbruch-Folge verbinden.
  // Vorher lief der Text ungeprüft durch – schon „Datensicherung anlegen,
  // Gerätesuche deaktivieren“ enthält zwei trennende Kommas.
  const description = [
    `Vorgang ${ticket.reference}`,
    `Gerät: ${ticket.brand.name} ${ticket.model.name}`,
    ...ticket.positions.map((p) => `- ${p.label}: ${p.price} EUR`),
    `Kostenvoranschlag: ${ticket.total} EUR`,
    "",
    "Vor dem Besuch: Datensicherung anlegen, Gerätesuche deaktivieren,",
    "SIM- und Speicherkarte entnehmen.",
    "",
    url,
  ]
    .map(escape)
    .join("\\n");

  /*
    Faltung nach RFC 5545 § 3.1: Eine Zeile darf 75 **Oktetts** tragen, nicht
    75 Zeichen. Der Unterschied ist in einem deutschen Text keine Feinheit –
    „Gerät“ belegt sechs Oktetts bei fünf Zeichen, und schon eine Handvoll
    Umlaute schob die Zeile über die Grenze.

    Gezählt wird deshalb in UTF-8-Oktetts, und zerlegt wird nach Codepoints,
    damit kein Zeichen mitten in seiner Bytefolge zerschnitten wird. Die
    Fortsetzungszeile beginnt mit einem Leerzeichen, das mitzählt.
  */
  const fold = (line: string) => {
    const encoder = new TextEncoder();
    const parts: string[] = [];
    let current = "";
    let bytes = 0;
    let limit = 75;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (bytes + size > limit) {
        parts.push(current);
        current = "";
        bytes = 0;
        limit = 74; // das führende Leerzeichen der Fortsetzung
      }
      current += char;
      bytes += size;
    }
    parts.push(current);
    return parts.join("\r\n ");
  };

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${organizer}//Reparatur-Ticket//DE`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ticket.reference}-${day(date)}@drsmartphone48`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(date)}`,
    `DTEND;VALUE=DATE:${day(next)}`,
    fold(`SUMMARY:${escape(`Reparatur ${ticket.brand.name} ${ticket.model.name} – ${organizer}`)}`),
    fold(`DESCRIPTION:${description}`),
    fold(`LOCATION:${escape(location)}`),
    fold(`URL:${url}`),
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    fold(`DESCRIPTION:${escape("Gerät und Zubehör bereitlegen")}`),
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    // Auch die letzte Zeile endet mit CRLF – RFC 5545 kennt keine Datei ohne
    // abschließenden Zeilenumbruch, und manche Programme verschlucken sonst
    // das letzte END.
    "",
  ].join("\r\n");
}
