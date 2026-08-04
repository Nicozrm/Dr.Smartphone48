import { site } from "@/lib/site";
import { docTypeMeta, type DocType } from "./doctype";
import { today } from "./calc";
import type { CompanyProfile, Invoice, Party } from "./types";

/**
 * Ablage im Browser des Geschäftsführers – kein Server, kein Konto.
 *
 * Das ist eine bewusste Entscheidung, keine Sparmaßnahme: Rechnungsdaten
 * enthalten Namen, Anschriften und Gerätekennungen von Kunden. Was nie
 * übertragen wird, kann nicht abfließen. Die Aufbewahrungspflicht erfüllt
 * ohnehin das gedruckte bzw. als PDF archivierte Dokument, nicht der Entwurf.
 *
 * Preis dieser Entscheidung: Der Datenbestand hängt am Gerät. Deshalb gibt es
 * Export und Import als JSON – und die Erinnerung daran im Kopf des Werkzeugs.
 */

const KEY_PROFILE = "ds48-invoice-profile";
const KEY_ARCHIVE = "ds48-invoice-customers";
const KEY_DRAFT = "ds48-invoice-draft";
const KEY_HISTORY = "ds48-invoice-history";

export const defaultProfile: CompanyProfile = {
  name: site.legalName,
  owner: site.owner,
  street: site.street,
  zip: site.zip,
  city: site.city,
  phone: site.phone,
  email: site.email,
  web: site.url.replace(/^https?:\/\//, ""),
  taxNumber: "",
  vatId: site.vatId,
  bankName: "",
  iban: "",
  bic: "",
  numberPrefix: `RE-${new Date().getFullYear()}-`,
  nextNumber: 1,
  defaultTaxMode: "regel",
  defaultDueDays: 14,
  warrantyMonths: site.warrantyMonths,
};

export const emptyParty: Party = {
  name: "",
  extra: "",
  street: "",
  zip: "",
  city: "",
  country: "",
  vatId: "",
  email: "",
  reference: "",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    // Flach zusammenführen, damit neue Felder nach einem Update Werte haben.
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...(fallback as object), ...(parsed as object) } as T
      : parsed;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Voller oder gesperrter Speicher: Der Entwurf im State bleibt gültig,
    // nur die Wiederherstellung nach einem Neuladen entfällt.
  }
}

/* ---- Firmenprofil -------------------------------------------------------- */

export function loadProfile(): CompanyProfile {
  return read(KEY_PROFILE, defaultProfile);
}

export function saveProfile(profile: CompanyProfile): void {
  write(KEY_PROFILE, profile);
}

/**
 * Nächste Belegnummer, ohne den Zähler zu erhöhen.
 *
 * Ein gemeinsamer Zähler für alle Belegarten, aber ein eigenes Kürzel je Art:
 * `RE-2026-0042`, `KV-2026-0043`. Das hält den Nummernkreis lückenlos – was
 * die Betriebsprüfung sehen will – und lässt trotzdem auf einen Blick
 * erkennen, was man in der Hand hält. Getrennte Zähler je Art wären hübscher
 * und wären genau die Konstruktion, bei der irgendwann zwei Belege dieselbe
 * Nummer tragen.
 */
export function peekNumber(profile: CompanyProfile, docType: DocType = "rechnung"): string {
  const prefix = profile.numberPrefix.replace(
    /^[A-Z]{2}-/,
    docTypeMeta(docType).prefix,
  );
  return `${prefix}${String(profile.nextNumber).padStart(4, "0")}`;
}

/**
 * Zähler weiterschalten. Wird erst beim tatsächlichen Abschluss gerufen –
 * eine verworfene Rechnung darf keine Lücke im Nummernkreis hinterlassen,
 * denn Lücken erklärt man später der Betriebsprüfung.
 */
export function commitNumber(profile: CompanyProfile): CompanyProfile {
  const next = { ...profile, nextNumber: profile.nextNumber + 1 };
  saveProfile(next);
  return next;
}

/* ---- Kundenarchiv -------------------------------------------------------- */

export function loadCustomers(): Party[] {
  return read<Party[]>(KEY_ARCHIVE, []);
}

/** Legt den Kunden ab bzw. aktualisiert ihn; jüngster Eintrag zuerst. */
export function rememberCustomer(party: Party): void {
  if (!party.name.trim()) return;
  const key = (p: Party) => `${p.name}|${p.zip}`.toLowerCase();
  const rest = loadCustomers().filter((p) => key(p) !== key(party));
  write(KEY_ARCHIVE, [party, ...rest].slice(0, 200));
}

export function forgetCustomer(party: Party): void {
  const key = (p: Party) => `${p.name}|${p.zip}`.toLowerCase();
  write(
    KEY_ARCHIVE,
    loadCustomers().filter((p) => key(p) !== key(party)),
  );
}

export function searchCustomers(query: string): Party[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return loadCustomers()
    .filter((p) =>
      `${p.name} ${p.city} ${p.street}`.toLowerCase().includes(q),
    )
    .slice(0, 6);
}

/* ---- Entwurf und Verlauf ------------------------------------------------- */

export function loadDraft(): Invoice | null {
  return read<Invoice | null>(KEY_DRAFT, null);
}

export function saveDraft(invoice: Invoice): void {
  write(KEY_DRAFT, invoice);
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_DRAFT);
  } catch {
    /* siehe write() */
  }
}

export interface HistoryEntry {
  number: string;
  date: string;
  customer: string;
  grossCents: number;
  invoice: Invoice;
}

export function loadHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(KEY_HISTORY, []);
}

export function pushHistory(entry: HistoryEntry): void {
  const rest = loadHistory().filter((h) => h.number !== entry.number);
  write(KEY_HISTORY, [entry, ...rest].slice(0, 500));
}

/* ---- Neue Rechnung ------------------------------------------------------- */

export function newInvoice(
  profile: CompanyProfile,
  docType: DocType = "rechnung",
): Invoice {
  const date = today();
  return {
    docType,
    number: peekNumber(profile, docType),
    date,
    serviceDate: date,
    dueDays: profile.defaultDueDays,
    customer: { ...emptyParty },
    lines: [],
    taxMode: profile.defaultTaxMode,
    grossEntry: true,
    device: { model: "", imei: "", condition: "" },
    intro: "",
    closing: "",
    paymentMethod: "ueberweisung",
    paid: false,
    copy: false,
    reference: "",
  };
}

/* ---- Sicherung ----------------------------------------------------------- */

export interface Backup {
  kind: "ds48-invoice-backup";
  version: 1;
  exportedAt: string;
  profile: CompanyProfile;
  customers: Party[];
  history: HistoryEntry[];
}

export function buildBackup(): Backup {
  return {
    kind: "ds48-invoice-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: loadProfile(),
    customers: loadCustomers(),
    history: loadHistory(),
  };
}

/** Spielt eine Sicherung ein. Gibt false zurück, wenn die Datei nicht passt. */
export function restoreBackup(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as Backup;
    if (data.kind !== "ds48-invoice-backup") return false;
    if (data.profile) write(KEY_PROFILE, data.profile);
    if (Array.isArray(data.customers)) write(KEY_ARCHIVE, data.customers);
    if (Array.isArray(data.history)) write(KEY_HISTORY, data.history);
    return true;
  } catch {
    return false;
  }
}
