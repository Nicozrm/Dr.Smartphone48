/**
 * Vom Vorgang zur Rechnung und zum Zertifikat.
 *
 * Die Leiste verbindet die internen Seiten, aber sie trägt nichts
 * hinüber. Wer eine Reparatur abgeschlossen hat und abrechnen will, sieht
 * Kunde und Gerät in der Akte – und tippt beides in der Rechnung noch
 * einmal ab. Abgetippte Daten sind falsch getippte Daten; eine IMEI hat
 * fünfzehn Stellen.
 *
 * Diese Kanten sind der Unterschied zwischen einer Navigation und einem
 * Arbeitsfluss.
 *
 * ## Alles im Fragment
 *
 * Hier stehen Kundenname, Gerät und IMEI – also genau die Angaben, die
 * diese Website sonst nirgends in eine Adresse schreibt. Ein Fragment
 * schickt der Browser **niemals** an einen Server; ein Parameter stünde in
 * jedem Zugriffsprotokoll auf dem Weg. Dieselbe Regel wie beim
 * Reparaturzertifikat und beim Sprung in die Akte.
 *
 * ## Vorbelegen heißt nicht überschreiben
 *
 * Der Rechnungs-Editor führt einen Entwurf im Browser. Käme eine
 * Vorbelegung darüber, wäre eine halbfertige Rechnung weg – und zwar ohne
 * Rückfrage, weil niemand mit einem Datenverlust rechnet, wenn er nur auf
 * einen Verweis klickt. Die Vorbelegung füllt deshalb ausschließlich
 * **leere** Felder. Was schon dasteht, bleibt stehen.
 */

export interface CertPrefill {
  /** Modellbezeichnung, wie sie in den Beleg soll. */
  model?: string;
  /** Charge oder Bezug – hier der Vorgangscode. */
  batch?: string;
}

export interface InvoicePrefill {
  customer?: string;
  model?: string;
  imei?: string;
}

/*
  Die Längen sind dieselben wie im Zertifikatsformat (`encodeSignable`):
  Modell 32, Charge 24 Byte. Längeres würde dort ohnehin abgeschnitten –
  es hier schon zu begrenzen hält die Adresse kurz und die Erwartung
  ehrlich.
*/
const MAX = { model: 32, batch: 24, customer: 80, imei: 20 };

function clean(value: string | null, max: number): string | undefined {
  if (!value) return undefined;
  // Zeilenumbrüche und Steuerzeichen haben in einem Feld nichts verloren.
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!text) return undefined;
  return text.slice(0, max);
}

/** Baut das Fragment aus benannten Werten. Leere Angaben entfallen. */
function fragment(pairs: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(pairs)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `#${query}` : "";
}

export function certHref(prefill: CertPrefill): string {
  return `/intern/zertifikat${fragment({
    modell: clean(prefill.model ?? null, MAX.model),
    charge: clean(prefill.batch ?? null, MAX.batch),
  })}`;
}

export function parseCertPrefill(hash: string): CertPrefill {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    model: clean(params.get("modell"), MAX.model),
    batch: clean(params.get("charge"), MAX.batch),
  };
}

export function invoiceHref(prefill: InvoicePrefill): string {
  return `/intern/rechnung${fragment({
    kunde: clean(prefill.customer ?? null, MAX.customer),
    geraet: clean(prefill.model ?? null, MAX.model),
    imei: clean(prefill.imei ?? null, MAX.imei),
  })}`;
}

export function parseInvoicePrefill(hash: string): InvoicePrefill {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    customer: clean(params.get("kunde"), MAX.customer),
    model: clean(params.get("geraet"), MAX.model),
    imei: clean(params.get("imei"), MAX.imei),
  };
}

/**
 * Übernimmt einen Wert nur, wenn dort noch nichts steht.
 *
 * Die eine Regel, an der ein Datenverlust hängt – deshalb steht sie als
 * eigene Funktion da und nicht dreimal als `||` in der Oberfläche.
 */
export function fillIfEmpty(current: string, incoming: string | undefined): string {
  return current.trim() === "" && incoming ? incoming : current;
}
