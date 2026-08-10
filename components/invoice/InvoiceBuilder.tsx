"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { InvoiceSheet } from "@/components/invoice/InvoiceSheet";
import {
  cents,
  centsInput,
  formatDate,
  formatQty,
  invoiceTotals,
  parseCents,
  parseQty,
} from "@/lib/invoice/calc";
import { searchCatalog, type CatalogItem } from "@/lib/invoice/catalog";
import { ciiXml } from "@/lib/invoice/cii";
import {
  validateEInvoice,
  xmlFileName,
  type EInvoiceTarget,
} from "@/lib/invoice/einvoice";
import { canRenderGiroCode, formatIban, isValidIban } from "@/lib/invoice/girocode";
import { docTypeMeta, docTypes } from "@/lib/invoice/doctype";
import { paginate } from "@/lib/invoice/paginate";
import { HandoffNotice } from "@/components/intern/HandoffNotice";
import {
  type Handoff,
  clearHandoff,
  peekHandoff,
  toInvoiceDevice,
  toInvoiceLines,
  toInvoiceParty,
} from "@/lib/intern/handoff";
import {
  buildBackup,
  clearDraft,
  commitNumber,
  loadDraft,
  loadHistory,
  loadProfile,
  newInvoice,
  peekNumber,
  pushHistory,
  rememberCustomer,
  restoreBackup,
  saveDraft,
  saveProfile,
  searchCustomers,
  type HistoryEntry,
} from "@/lib/invoice/store";
import type { DocType } from "@/lib/invoice/doctype";
import type {
  CompanyProfile,
  Invoice,
  InvoiceLine,
  Party,
  PaymentMethod,
  TaxMode,
  TaxRate,
} from "@/lib/invoice/types";
import { checkImei, isReady, validateInvoice, type Issue } from "@/lib/invoice/validate";

/*
  Rechnungswerkzeug.

  Die Prämisse: Wer den Laden führt, hat keine zwanzig Minuten für ein
  Formular. Deshalb entsteht eine Position hier durch Tippen, nicht durch
  Klicken – „2x iphone 13 display“ ergibt zwei Zeilen zum hinterlegten Preis.
  Alles andere ist bereits ausgefüllt oder wird gerechnet.

  Rechts steht kein Vorschaubild, sondern das Dokument selbst, in denselben
  Millimetern, in denen es aus dem Drucker kommt. Was man sieht, ist was man
  bekommt – wörtlich, nicht als Werbeversprechen.
*/

/* ---- Kleine Bausteine ---------------------------------------------------- */

function Section({
  id,
  title,
  hint,
  action,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={`abschnitt-${id}`} className="scroll-mt-32">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-ink-strong">{title}</h2>
          {hint && <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Labeled({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="inv-label">{label}</span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-s)] border border-line bg-page p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-[6px] px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-[var(--duration-fast)] ${
            value === o.id
              ? "bg-ink-strong text-[var(--surface-page)]"
              : "text-ink-soft hover:text-ink-strong"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  tone = "ghost",
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  tone?: "ghost" | "solid";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-40 ${
        tone === "solid"
          ? "bg-ink-strong text-[var(--surface-page)] hover:opacity-90"
          : "border border-line text-ink-strong hover:border-line-strong hover:bg-sunken"
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

/* ---- Schnellerfassung ---------------------------------------------------- */

interface QuickParse {
  qty: number;
  query: string;
  priceCents: number | null;
}

/**
 * Zerlegt die Eingabe der Schnellerfassung.
 *
 * `2x iphone 13 display @179` heißt: zwei Stück, Katalogtreffer „iPhone 13
 * Display", Einzelpreis abweichend 179 €. Alle drei Teile sind optional.
 */
function parseQuick(input: string): QuickParse {
  const m = input.match(
    /^\s*(?:(\d+(?:[.,]\d+)?)\s*[x×*]\s*)?(.*?)(?:\s*@\s*(\d+(?:[.,]\d+)?))?\s*$/,
  );
  return {
    qty: m?.[1] ? parseQty(m[1]) || 1 : 1,
    query: (m?.[2] ?? input).trim(),
    priceCents: m?.[3] ? parseCents(m[3]) : null,
  };
}

function QuickAdd({
  onPick,
  inputRef,
}: {
  onPick: (item: CatalogItem | null, parsed: QuickParse) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);

  const parsed = useMemo(() => parseQuick(text), [text]);
  const hits = useMemo(
    () => (parsed.query.length >= 2 ? searchCatalog(parsed.query) : []),
    [parsed.query],
  );

  useEffect(() => setActive(0), [text]);

  const commit = (item: CatalogItem | null) => {
    if (!item && parsed.query.length === 0) return;
    onPick(item, parsed);
    setText("");
    setActive(0);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 rounded-[var(--radius-m)] border border-line-strong bg-raised px-3.5 shadow-raised focus-within:border-accent">
        <Icon name="search" size={17} className="shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit(hits[active] ?? null);
            } else if (e.key === "Escape") {
              setText("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Position erfassen – z. B. 2x iPhone 13 Display @179"
          aria-label="Position aus dem Katalog erfassen"
          className="h-12 w-full bg-transparent text-[0.9375rem] text-ink-strong outline-none placeholder:text-ink-faint"
        />
        {text && (
          <button
            type="button"
            onClick={() => commit(hits[active] ?? null)}
            className="shrink-0 rounded-full bg-ink-strong px-3 py-1.5 text-[0.75rem] font-medium text-[var(--surface-page)]"
          >
            Enter
          </button>
        )}
      </div>

      {hits.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 rounded-[var(--radius-m)] border border-line bg-raised p-1.5 shadow-floating">
          {hits.map((h, i) => (
            <button
              key={h.id}
              type="button"
              className="inv-hit"
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(h)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] text-ink-strong">
                  {h.title}
                </span>
                {h.note && (
                  <span className="block truncate text-[0.75rem] text-ink-soft">{h.note}</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums text-ink-strong">
                {cents(parsed.priceCents ?? h.priceCents)}
              </span>
            </button>
          ))}
          <p className="px-3 py-1.5 text-[0.6875rem] text-ink-faint">
            ↑↓ wählen · Enter übernehmen · Freitext ohne Treffer legt eine leere
            Position an
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- Positionszeile ------------------------------------------------------ */

function LineRow({
  line,
  index,
  invoice,
  onChange,
  onRemove,
  onMove,
}: {
  line: InvoiceLine;
  index: number;
  invoice: Invoice;
  onChange: (patch: Partial<InvoiceLine>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  const totals = invoiceTotals(invoice).lines[index];
  const [priceText, setPriceText] = useState(() => centsInput(line.unitCents));
  const [qtyText, setQtyText] = useState(() => formatQty(line.qty));

  // Der Editor ist die Quelle der Wahrheit, solange getippt wird; Änderungen
  // von außen (Katalog, Import) müssen die Felder aber nachziehen.
  useEffect(() => setPriceText(centsInput(line.unitCents)), [line.unitCents]);
  useEffect(() => setQtyText(formatQty(line.qty)), [line.qty]);

  return (
    <div className="inv-row p-3">
      <div className="flex items-start gap-3">
        <span className="mt-2 w-5 shrink-0 text-center font-mono text-[0.75rem] text-ink-faint">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={line.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Bezeichnung der Leistung"
            className="inv-input font-medium"
            aria-label={`Bezeichnung Position ${index + 1}`}
          />
          <input
            value={line.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Zusatz – Modell, IMEI, Teilequalität"
            className="inv-input text-[0.8125rem]"
            aria-label={`Zusatz Position ${index + 1}`}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Labeled label="Menge">
              <div className="flex gap-1">
                <input
                  value={qtyText}
                  onChange={(e) => {
                    setQtyText(e.target.value);
                    onChange({ qty: parseQty(e.target.value) });
                  }}
                  inputMode="decimal"
                  className="inv-input inv-num"
                  aria-label={`Menge Position ${index + 1}`}
                />
                <input
                  value={line.unit}
                  onChange={(e) => onChange({ unit: e.target.value })}
                  className="inv-input w-16 text-center text-[0.8125rem]"
                  aria-label={`Einheit Position ${index + 1}`}
                />
              </div>
            </Labeled>

            <Labeled label={invoice.grossEntry ? "Einzel brutto" : "Einzel netto"}>
              <input
                value={priceText}
                onChange={(e) => {
                  setPriceText(e.target.value);
                  onChange({ unitCents: parseCents(e.target.value) });
                }}
                inputMode="decimal"
                className="inv-input inv-num"
                aria-label={`Einzelpreis Position ${index + 1}`}
              />
            </Labeled>

            <Labeled label="Rabatt %">
              <input
                value={line.discountPct === 0 ? "" : formatQty(line.discountPct)}
                onChange={(e) => onChange({ discountPct: parseQty(e.target.value) })}
                placeholder="0"
                inputMode="decimal"
                className="inv-input inv-num"
                aria-label={`Rabatt Position ${index + 1}`}
              />
            </Labeled>

            <Labeled label="USt">
              <select
                value={line.taxRate}
                onChange={(e) => onChange({ taxRate: Number(e.target.value) as TaxRate })}
                disabled={invoice.taxMode !== "regel"}
                className="inv-input disabled:opacity-45"
                aria-label={`Steuersatz Position ${index + 1}`}
              >
                <option value={19}>19 %</option>
                <option value={7}>7 %</option>
                <option value={0}>0 %</option>
              </select>
            </Labeled>
          </div>
        </div>

        <div className="flex w-24 shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[0.9375rem] font-semibold tabular-nums text-ink-strong">
            {cents(invoice.grossEntry ? totals.grossCents : totals.netCents)}
          </span>
          {totals.discountCents > 0 && (
            <span className="font-mono text-[0.6875rem] tabular-nums text-ink-faint line-through">
              {cents(totals.rawCents)}
            </span>
          )}
          <div className="mt-1 flex gap-0.5">
            <button
              type="button"
              onClick={() => onMove(-1)}
              className="rounded p-1 text-ink-faint hover:bg-sunken hover:text-ink-strong"
              aria-label="Position nach oben"
            >
              <Icon name="chevron-down" size={14} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              className="rounded p-1 text-ink-faint hover:bg-sunken hover:text-ink-strong"
              aria-label="Position nach unten"
            >
              <Icon name="chevron-down" size={14} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-1 text-ink-faint hover:bg-sunken hover:text-[var(--danger)]"
              aria-label="Position löschen"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Hauptkomponente ----------------------------------------------------- */

export function InvoiceBuilder() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [panel, setPanel] = useState<"none" | "profil" | "verlauf">("none");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [customerHits, setCustomerHits] = useState<Party[]>([]);
  const [zoom, setZoom] = useState(1);
  /* Eine wartende Übergabe aus der Werkstatt. Sie wird beim Laden nur
     gelesen, nicht angewandt – siehe HandoffNotice. */
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  const quickRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Laden – erst im Browser, damit Server und Client identisch rendern. */
  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setInvoice(loadDraft() ?? newInvoice(p));
    setHistory(loadHistory());
    setHandoff(peekHandoff("rechnung"));
  }, []);

  /* Entwurf sichern, aber nicht bei jedem Tastendruck. */
  useEffect(() => {
    if (!invoice) return;
    const id = window.setTimeout(() => saveDraft(invoice), 400);
    return () => window.clearTimeout(id);
  }, [invoice]);

  /*
    Blatt auf die verfügbare Breite skalieren.

    Die Bühne muss die volle Höhe aller Seiten reservieren, sonst schneidet
    das übergeordnete Layout Seite zwei ab. Höhe und Skalierung stecken
    deshalb beide in CSS-Variablen und werden dort zusammengerechnet – kein
    JavaScript, das bei jedem Scrollen nachmisst.
  */
  const mounted = invoice !== null;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const available = stage.parentElement?.clientWidth ?? stage.clientWidth;
      const base = Math.min(1, Math.max(0.25, (available - 44) / 793.7));
      stage.style.setProperty("--sheet-scale", String(base * zoom));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (stage.parentElement) ro.observe(stage.parentElement);
    return () => ro.disconnect();
  }, [mounted, zoom]);

  /* Kurzmeldung wieder ausblenden. */
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 2600);
    return () => window.clearTimeout(id);
  }, [flash]);

  /* „/“ springt in die Schnellerfassung, solange nicht getippt wird. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        quickRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totals = useMemo(() => (invoice ? invoiceTotals(invoice) : null), [invoice]);
  const issues = useMemo<Issue[]>(
    () =>
      invoice && profile && totals
        ? validateInvoice(invoice, profile, totals.grossCents)
        : [],
    [invoice, profile, totals],
  );
  const ready = isReady(issues);

  /* Was fehlt der E-Rechnung noch – je Zielformat getrennt. */
  const eInvoiceIssues = useMemo(
    () => ({
      zugferd:
        invoice && profile && totals
          ? validateEInvoice(invoice, profile, totals, "zugferd")
          : [],
      xrechnung:
        invoice && profile && totals
          ? validateEInvoice(invoice, profile, totals, "xrechnung")
          : [],
    }),
    [invoice, profile, totals],
  );

  /* Wie viele Blätter das ergibt – dieselbe Rechnung wie im Dokument. */
  const pageCount = useMemo(() => {
    if (!invoice || !profile || !totals) return 1;
    const meta = docTypeMeta(invoice.docType);
    const wantsSlip =
      meta.demandsPayment &&
      !invoice.paid &&
      invoice.paymentMethod === "ueberweisung" &&
      canRenderGiroCode(profile.iban, profile.name);
    return paginate(
      invoice,
      totals.lines,
      (l) => (invoice.grossEntry ? l.grossCents : l.netCents),
      wantsSlip,
    ).length;
  }, [invoice, profile, totals]);

  const patch = useCallback((p: Partial<Invoice>) => {
    setInvoice((inv) => (inv ? { ...inv, ...p } : inv));
  }, []);

  const patchLine = useCallback((id: string, p: Partial<InvoiceLine>) => {
    setInvoice((inv) =>
      inv
        ? { ...inv, lines: inv.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) }
        : inv,
    );
  }, []);

  const addLine = useCallback(
    (item: CatalogItem | null, parsed: QuickParse) => {
      setInvoice((inv) => {
        if (!inv) return inv;
        const line: InvoiceLine = {
          id: `l${Date.now()}${inv.lines.length}`,
          qty: parsed.qty,
          unit: item?.unit ?? "Stk.",
          title: item?.title ?? parsed.query,
          note: item?.note ?? "",
          unitCents: parsed.priceCents ?? item?.priceCents ?? 0,
          taxRate: item?.taxRate ?? 19,
          discountPct: 0,
        };
        // Ein Gerät auf der Rechnung ist fast immer das Gerät im Kopfbereich –
        // wenn dort noch nichts steht, übernehmen wir es.
        const device =
          !inv.device.model && item?.group === "Reparatur" && item.note
            ? { ...inv.device, model: item.note }
            : inv.device;
        return { ...inv, lines: [...inv.lines, line], device };
      });
    },
    [],
  );

  /**
   * Belegart wechseln.
   *
   * Das Kürzel im Nummernkreis zieht mit – aus RE-2026-0042 wird KV-2026-0042.
   * Der Zähler bleibt, weil er erst beim Abschließen weiterspringt.
   */
  const changeDocType = (docType: DocType) => {
    setInvoice((inv) => {
      if (!inv) return inv;
      const number = inv.number.replace(/^[A-Z]{2}-/, docTypeMeta(docType).prefix);
      return { ...inv, docType, number };
    });
  };

  const removeLine = (id: string) =>
    setInvoice((inv) => (inv ? { ...inv, lines: inv.lines.filter((l) => l.id !== id) } : inv));

  const moveLine = (index: number, delta: number) =>
    setInvoice((inv) => {
      if (!inv) return inv;
      const target = index + delta;
      if (target < 0 || target >= inv.lines.length) return inv;
      const lines = [...inv.lines];
      [lines[index], lines[target]] = [lines[target], lines[index]];
      return { ...inv, lines };
    });

  const setProfileField = (p: Partial<CompanyProfile>) =>
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      saveProfile(next);
      return next;
    });

  /** Nummer vergeben, archivieren, neues Blatt aufziehen. */
  const finalise = () => {
    if (!invoice || !profile || !totals) return;
    rememberCustomer(invoice.customer);
    pushHistory({
      number: invoice.number,
      date: invoice.date,
      customer: invoice.customer.name || "Barverkauf",
      grossCents: totals.grossCents,
      invoice,
    });
    const nextProfile = commitNumber(profile);
    setProfile(nextProfile);
    setHistory(loadHistory());
    clearDraft();
    setInvoice(newInvoice(nextProfile, invoice.docType));
    setFlash(
      `${invoice.number} abgeschlossen. Nächste Nummer: ${peekNumber(nextProfile, invoice.docType)}`,
    );
  };

  const startNew = () => {
    if (!profile) return;
    if (invoice && invoice.lines.length > 0) {
      const ok = window.confirm(
        "Aktuellen Entwurf verwerfen? Die Rechnungsnummer bleibt erhalten.",
      );
      if (!ok) return;
    }
    clearDraft();
    setInvoice(newInvoice(profile, invoice?.docType ?? "rechnung"));
    setFlash("Neuer Entwurf.");
  };

  /**
   * E-Rechnung als XML herunterladen.
   *
   * Kein Serverweg, kein Dienst: Das XML entsteht im Browser und wird direkt
   * als Datei ausgegeben. Für Rechnungsdaten mit Namen, Anschriften und
   * Gerätekennungen ist das dieselbe Entscheidung wie beim Rest des Werkzeugs.
   */
  const downloadEInvoice = (target: EInvoiceTarget) => {
    if (!invoice || !profile || !totals) return;
    const xml = ciiXml(invoice, profile, target, totals);
    // BOM voran: Die Norm schreibt UTF-8 vor, und manche Prüfprogramme der
    // Verwaltung erkennen die Kodierung sonst nicht zuverlässig.
    const blob = new Blob(["﻿", xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = xmlFileName(invoice, target);
    a.click();
    URL.revokeObjectURL(url);
    setFlash(
      target === "xrechnung"
        ? "XRechnung 3.0 gespeichert."
        : "ZUGFeRD-XML (EN 16931) gespeichert.",
    );
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rechnungen-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFlash("Sicherung heruntergeladen.");
  };

  const importBackup = async (file: File) => {
    const ok = restoreBackup(await file.text());
    if (!ok) {
      setFlash("Datei nicht erkannt.");
      return;
    }
    const p = loadProfile();
    setProfile(p);
    setHistory(loadHistory());
    setFlash("Sicherung eingespielt.");
  };

  if (!invoice || !profile || !totals) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[0.875rem] text-ink-soft">
        Werkzeug wird geladen …
      </div>
    );
  }

  const imei = checkImei(invoice.device.imei);

  /*
    Steht schon Arbeit im Formular? Positionen oder ein Kundenname genügen –
    beides bekommt man nicht versehentlich hinein. Ist das Formular leer,
    gibt es nichts zu entscheiden, und die Übergabe wird ungefragt
    übernommen (siehe unten im Rumpf des Hinweises).
  */
  const dirty = invoice.lines.length > 0 || invoice.customer.name.trim().length > 0;

  const applyHandoff = () => {
    if (!handoff) return;
    setInvoice({
      ...invoice,
      customer: toInvoiceParty(handoff),
      device: toInvoiceDevice(handoff),
      lines: toInvoiceLines(handoff),
      // Bruttoeingabe: Der Festpreis auf dem Ticket ist der Ladenpreis, den
      // der Kunde gelesen hat. Er bleibt unangetastet – dieselbe Regel wie
      // in lib/invoice/calc.ts.
      grossEntry: true,
    });
    clearHandoff();
    setHandoff(null);
    setFlash(`Vorgang ${handoff.ticketCode} übernommen`);
  };

  const dismissHandoff = () => {
    clearHandoff();
    setHandoff(null);
  };

  return (
    <>
      {/* Werkzeugleiste */}
      <div className="inv-toolbar sticky top-16 z-40 border-b border-line bg-page/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[0.9375rem] font-semibold text-ink-strong">
              {invoice.number}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium ${
                ready
                  ? "bg-[var(--positive-subtle)] text-[var(--positive)]"
                  : "bg-[var(--warn-subtle)] text-[var(--warn)]"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {ready ? "Vollständig" : `${issues.filter((i) => i.level === "pflicht").length} offen`}
            </span>
            {flash && (
              <span className="inv-tick text-[0.8125rem] text-ink-soft">{flash}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToolButton icon="calendar" label="Verlauf" onClick={() => setPanel("verlauf")} />
            <ToolButton icon="tool" label="Stammdaten" onClick={() => setPanel("profil")} />
            <ToolButton icon="sparkle" label="Neu" onClick={startNew} />
            <ToolButton icon="check" label="Drucken / PDF" onClick={() => window.print()} />
            <ToolButton
              icon="shield"
              label="Abschließen"
              tone="solid"
              onClick={finalise}
              disabled={!ready}
            />
          </div>
        </div>
      </div>

      {handoff ? (
        <div className="mx-auto max-w-[1600px] px-5 pt-6 md:px-8">
          <HandoffNotice
            handoff={handoff}
            replaces={dirty}
            onApply={applyHandoff}
            onDismiss={dismissHandoff}
          />
        </div>
      ) : null}

      <div className="inv-app mx-auto grid max-w-[1600px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)] lg:gap-12">
        {/* Editor */}
        <div className="inv-editor space-y-10">
          <Section
            id="belegart"
            title="Belegart"
            hint="Dieselben Positionen, dieselbe Rechenlogik – andere Sprache und anderes Kürzel im Nummernkreis."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {docTypes.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => changeDocType(d.id)}
                    aria-pressed={invoice.docType === d.id}
                    className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-[var(--duration-fast)] ${
                      invoice.docType === d.id
                        ? "bg-ink-strong text-[var(--surface-page)]"
                        : "border border-line text-ink-soft hover:border-line-strong hover:text-ink-strong"
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>

              {(invoice.docType === "storno" || invoice.docType === "gutschrift") && (
                <input
                  value={invoice.reference}
                  onChange={(e) => patch({ reference: e.target.value })}
                  placeholder="Bezug – Nummer der Ursprungsrechnung"
                  className="inv-input inv-num text-left"
                  aria-label="Bezug zur Ursprungsrechnung"
                />
              )}

              <label className="flex items-center gap-2.5 text-[0.875rem] text-ink-strong">
                <input
                  type="checkbox"
                  checked={invoice.copy}
                  onChange={(e) => patch({ copy: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Zweitausfertigung – Stempel &bdquo;Kopie&ldquo;
              </label>
            </div>
          </Section>

          <Section
            id="positionen"
            title="Positionen"
            hint="Tippen statt klicken. „2x iPhone 13 Display @179“ – Menge, Katalogtreffer, abweichender Preis."
          >
            <QuickAdd onPick={addLine} inputRef={quickRef} />

            <div className="mt-4 space-y-2.5">
              {invoice.lines.map((line, i) => (
                <LineRow
                  key={line.id}
                  line={line}
                  index={i}
                  invoice={invoice}
                  onChange={(p) => patchLine(line.id, p)}
                  onRemove={() => removeLine(line.id)}
                  onMove={(d) => moveLine(i, d)}
                />
              ))}
              {invoice.lines.length === 0 && (
                <p className="rounded-[var(--radius-m)] border border-dashed border-line px-4 py-8 text-center text-[0.875rem] text-ink-soft">
                  Noch nichts erfasst. Taste <kbd className="font-mono">/</kbd> springt ins
                  Suchfeld.
                </p>
              )}
            </div>

            {/* Summenkaskade – die Steuerlogik offen ausgelegt. */}
            {invoice.lines.length > 0 && (
              <div className="mt-6 rounded-[var(--radius-m)] border border-line bg-raised px-4 py-2">
                <div className="inv-cascade">
                  <div>
                    <span className="text-ink-soft">Netto</span>
                    <span className="font-mono tabular-nums text-ink-strong">
                      {cents(totals.netCents)}
                    </span>
                  </div>
                  {totals.discountCents > 0 && (
                    <div>
                      <span className="text-ink-soft">davon Rabatt</span>
                      <span className="font-mono tabular-nums text-ink-soft">
                        −{cents(totals.discountCents)}
                      </span>
                    </div>
                  )}
                  {totals.groups.map((g) => (
                    <div key={g.rate}>
                      <span className="text-ink-soft">
                        {g.rate > 0 ? `USt ${g.rate} % auf ${cents(g.netCents)}` : "ohne USt"}
                      </span>
                      <span className="font-mono tabular-nums text-ink-strong">
                        {cents(g.taxCents)}
                      </span>
                    </div>
                  ))}
                  <div>
                    <span className="font-semibold text-ink-strong">Rechnungsbetrag</span>
                    <span className="inv-tick font-mono text-[1.125rem] font-semibold tabular-nums text-ink-strong">
                      {cents(totals.grossCents)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Kunde */}
          <Section id="kunde" title="Empfänger" hint="Frühere Kunden erscheinen beim Tippen.">
            <div className="relative space-y-2">
              <input
                value={invoice.customer.name}
                onChange={(e) => {
                  patch({ customer: { ...invoice.customer, name: e.target.value } });
                  setCustomerHits(searchCustomers(e.target.value));
                }}
                onBlur={() => window.setTimeout(() => setCustomerHits([]), 120)}
                placeholder="Name oder Firma"
                className="inv-input"
                aria-label="Name des Empfängers"
              />
              {customerHits.length > 0 && (
                <div className="absolute inset-x-0 top-[calc(2.25rem+0.4rem)] z-30 rounded-[var(--radius-m)] border border-line bg-raised p-1.5 shadow-floating">
                  {customerHits.map((c) => (
                    <button
                      key={`${c.name}-${c.zip}`}
                      type="button"
                      className="inv-hit"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        patch({ customer: c });
                        setCustomerHits([]);
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] text-ink-strong">
                          {c.name}
                        </span>
                        <span className="block truncate text-[0.75rem] text-ink-soft">
                          {[c.street, `${c.zip} ${c.city}`].filter(Boolean).join(", ")}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <input
                value={invoice.customer.extra}
                onChange={(e) =>
                  patch({ customer: { ...invoice.customer, extra: e.target.value } })
                }
                placeholder="Zusatz – z. Hd., Abteilung"
                className="inv-input text-[0.8125rem]"
                aria-label="Adresszusatz"
              />
              <input
                value={invoice.customer.street}
                onChange={(e) =>
                  patch({ customer: { ...invoice.customer, street: e.target.value } })
                }
                placeholder="Straße und Hausnummer"
                className="inv-input"
                aria-label="Straße"
              />
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <input
                  value={invoice.customer.zip}
                  onChange={(e) =>
                    patch({ customer: { ...invoice.customer, zip: e.target.value } })
                  }
                  placeholder="PLZ"
                  className="inv-input inv-num text-left"
                  aria-label="Postleitzahl"
                />
                <input
                  value={invoice.customer.city}
                  onChange={(e) =>
                    patch({ customer: { ...invoice.customer, city: e.target.value } })
                  }
                  placeholder="Ort"
                  className="inv-input"
                  aria-label="Ort"
                />
              </div>
              <input
                value={invoice.customer.vatId}
                onChange={(e) =>
                  patch({ customer: { ...invoice.customer, vatId: e.target.value } })
                }
                placeholder="USt-IdNr. des Kunden (nur bei Geschäftskunden)"
                className="inv-input text-[0.8125rem]"
                aria-label="USt-IdNr. des Kunden"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={invoice.customer.email ?? ""}
                  onChange={(e) =>
                    patch({ customer: { ...invoice.customer, email: e.target.value } })
                  }
                  placeholder="E-Mail für die Rechnung (E-Rechnung)"
                  inputMode="email"
                  className="inv-input text-[0.8125rem]"
                  aria-label="E-Mail-Adresse des Kunden"
                />
                <input
                  value={invoice.customer.reference ?? ""}
                  onChange={(e) =>
                    patch({ customer: { ...invoice.customer, reference: e.target.value } })
                  }
                  placeholder="Leitweg-ID oder Bestellnummer"
                  className="inv-input text-[0.8125rem]"
                  aria-label="Leitweg-ID oder Bestellnummer des Kunden"
                />
              </div>
            </div>
          </Section>

          {/* Gerät */}
          <Section
            id="geraet"
            title="Gerät"
            hint="Der Teil, den nur eine Werkstattrechnung braucht – und der im Garantiefall zählt."
          >
            <div className="space-y-2">
              <input
                value={invoice.device.model}
                onChange={(e) =>
                  patch({ device: { ...invoice.device, model: e.target.value } })
                }
                placeholder="Modell – z. B. Apple iPhone 13, 128 GB, Mitternacht"
                className="inv-input"
                aria-label="Gerätemodell"
              />
              <div>
                <input
                  value={invoice.device.imei}
                  onChange={(e) =>
                    patch({ device: { ...invoice.device, imei: e.target.value } })
                  }
                  placeholder="IMEI oder Seriennummer"
                  inputMode="numeric"
                  className="inv-input inv-num text-left"
                  aria-label="IMEI"
                />
                {imei !== "leer" && (
                  <p
                    className="mt-1 text-[0.75rem]"
                    style={{
                      color:
                        imei === "gueltig" ? "var(--positive)" : "var(--warn)",
                    }}
                  >
                    {imei === "gueltig"
                      ? "IMEI-Prüfziffer stimmt."
                      : imei === "laenge"
                        ? "Eine IMEI hat 15 Ziffern – als Seriennummer in Ordnung."
                        : "Prüfziffer stimmt nicht. Bitte die Ziffernfolge kontrollieren."}
                  </p>
                )}
              </div>
              <input
                value={invoice.device.condition}
                onChange={(e) =>
                  patch({ device: { ...invoice.device, condition: e.target.value } })
                }
                placeholder="Befund bei Annahme – z. B. Displayglas gebrochen, Touch funktionsfähig"
                className="inv-input text-[0.8125rem]"
                aria-label="Befund bei Annahme"
              />
            </div>
          </Section>

          {/* Steuer und Zahlung */}
          <Section id="zahlung" title="Steuer und Zahlung">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  <span className="inv-label">Besteuerung</span>
                  <Segmented<TaxMode>
                    value={invoice.taxMode}
                    onChange={(taxMode) => patch({ taxMode })}
                    options={[
                      { id: "regel", label: "Regel" },
                      { id: "klein", label: "§ 19" },
                      { id: "differenz", label: "§ 25a" },
                    ]}
                  />
                </div>
                <div>
                  <span className="inv-label">Preiseingabe</span>
                  <Segmented<"brutto" | "netto">
                    value={invoice.grossEntry ? "brutto" : "netto"}
                    onChange={(v) => patch({ grossEntry: v === "brutto" })}
                    options={[
                      { id: "brutto", label: "Brutto" },
                      { id: "netto", label: "Netto" },
                    ]}
                  />
                </div>
                <div>
                  <span className="inv-label">Zahlungsart</span>
                  <Segmented<PaymentMethod>
                    value={invoice.paymentMethod}
                    onChange={(paymentMethod) => patch({ paymentMethod })}
                    options={[
                      { id: "ueberweisung", label: "Überweisung" },
                      { id: "bar", label: "Bar" },
                      { id: "karte", label: "Karte" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Labeled label="Rechnungsdatum">
                  <input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => patch({ date: e.target.value })}
                    className="inv-input"
                  />
                </Labeled>
                <Labeled label="Leistungsdatum">
                  <input
                    type="date"
                    value={invoice.serviceDate}
                    onChange={(e) => patch({ serviceDate: e.target.value })}
                    className="inv-input"
                  />
                </Labeled>
                <Labeled label="Zahlungsziel (Tage)">
                  <input
                    value={invoice.dueDays}
                    onChange={(e) => patch({ dueDays: Math.max(0, parseQty(e.target.value)) })}
                    inputMode="numeric"
                    className="inv-input inv-num"
                  />
                </Labeled>
              </div>

              <label className="flex items-center gap-2.5 text-[0.875rem] text-ink-strong">
                <input
                  type="checkbox"
                  checked={invoice.paid}
                  onChange={(e) => patch({ paid: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Bereits bezahlt – Rechnung dient als Beleg
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Einleitung (optional)">
                  <textarea
                    value={invoice.intro}
                    onChange={(e) => patch({ intro: e.target.value })}
                    rows={3}
                    placeholder="Vielen Dank für Ihren Auftrag. Wir haben folgende Leistungen erbracht:"
                    className="inv-input h-auto resize-y py-2 leading-relaxed"
                  />
                </Labeled>
                <Labeled label="Schlusstext (optional)">
                  <textarea
                    value={invoice.closing}
                    onChange={(e) => patch({ closing: e.target.value })}
                    rows={3}
                    placeholder="Grund der Steuerbefreiung, Hinweise zur Garantie, Grußformel."
                    className="inv-input h-auto resize-y py-2 leading-relaxed"
                  />
                </Labeled>
              </div>
            </div>
          </Section>

          {/* E-Rechnung */}
          <Section
            id="erechnung"
            title="E-Rechnung"
            hint="Strukturiertes Format nach EN 16931. Ab 2028 im Geschäftsverkehr Pflicht – Empfangen muss sie heute schon jeder."
          >
            <div className="rounded-[var(--radius-m)] border border-line bg-raised p-4">
              <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
                Ein PDF ist kein strukturierter Datensatz, sondern ein Bild von
                einer Rechnung. Die Datei hier enthält dieselben Beträge
                maschinenlesbar – der Empfänger bucht sie, ohne sie abzutippen.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <ToolButton
                  icon="arrow-up-right"
                  label="ZUGFeRD-XML"
                  onClick={() => downloadEInvoice("zugferd")}
                  disabled={eInvoiceIssues.zugferd.length > 0}
                />
                <ToolButton
                  icon="arrow-up-right"
                  label="XRechnung-XML"
                  onClick={() => downloadEInvoice("xrechnung")}
                  disabled={eInvoiceIssues.xrechnung.length > 0}
                />
              </div>

              {eInvoiceIssues.zugferd.length === 0 &&
              eInvoiceIssues.xrechnung.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-ink-soft">
                  <Icon name="check" size={15} className="text-[var(--positive)]" />
                  Beide Formate vollständig.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {/* Die XRechnung fordert am meisten; ihre Liste enthält die
                      von ZUGFeRD bereits mit. */}
                  {eInvoiceIssues.xrechnung.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex items-start gap-2 text-[0.8125rem] leading-snug text-ink-soft"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--warn)" }}
                      />
                      {issue.text}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
                ZUGFeRD für Unternehmen, XRechnung für Behörden. Beide entstehen
                hier im Browser; die Rechnungsdaten verlassen das Gerät nicht.
              </p>
            </div>
          </Section>

          {/* Pflichtangaben */}
          <Section
            id="pruefung"
            title="Pflichtangaben"
            hint="§ 14 UStG – geprüft, solange getippt wird. Keine Rechtsberatung."
          >
            {issues.length === 0 ? (
              <p className="flex items-center gap-2 rounded-[var(--radius-m)] border border-line bg-raised px-4 py-3 text-[0.875rem]">
                <Icon name="check" size={16} className="text-[var(--positive)]" />
                Alle Pflichtangaben vorhanden.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {issues.map((issue) => (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const map: Record<Issue["anchor"], string> = {
                          profil: "abschnitt-pruefung",
                          kunde: "abschnitt-kunde",
                          positionen: "abschnitt-positionen",
                          zahlung: "abschnitt-zahlung",
                          kopf: "abschnitt-zahlung",
                        };
                        if (issue.anchor === "profil") setPanel("profil");
                        else
                          document
                            .getElementById(map[issue.anchor])
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex w-full items-start gap-2.5 rounded-[var(--radius-s)] border border-line bg-raised px-3.5 py-2.5 text-left transition-colors hover:border-line-strong"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background:
                            issue.level === "pflicht" ? "var(--danger)" : "var(--warn)",
                        }}
                      />
                      <span className="text-[0.8125rem] leading-snug text-ink">{issue.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Blatt */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="inv-editor mb-3 flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-ink-soft">
              {pageCount === 1 ? "1 Blatt" : `${pageCount} Blätter`} · A4 ·
              DIN 5008 Form B
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                disabled={zoom <= 0.5}
                className="h-8 w-8 rounded-full border border-line text-ink-strong disabled:opacity-35 hover:border-line-strong"
                aria-label="Verkleinern"
              >
                −
              </button>
              <span className="w-14 text-center font-mono text-[0.75rem] tabular-nums text-ink-soft">
                {Math.round(zoom * 100)} %
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
                disabled={zoom >= 2}
                className="h-8 w-8 rounded-full border border-line text-ink-strong disabled:opacity-35 hover:border-line-strong"
                aria-label="Vergrößern"
              >
                +
              </button>
            </div>
          </div>

          <div className="sheet-desk">
            <div
              ref={stageRef}
              className="sheet-stage"
              style={{ ["--sheet-pages" as string]: pageCount }}
            >
              <div className="sheet-frame">
                <InvoiceSheet invoice={invoice} profile={profile} totals={totals} />
              </div>
            </div>
          </div>

          <p className="inv-editor mt-3 text-center text-[0.75rem] text-ink-faint">
            Anschrift im Fenster eines DIN-lang-Umschlags · Mikroschriftlinie
            und Guillochenrosette drucken ab 600 dpi
          </p>
        </div>
      </div>

      {/* Stammdaten */}
      {panel === "profil" && (
        <Overlay title="Stammdaten" onClose={() => setPanel("none")}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Firmenname">
                <input
                  value={profile.name}
                  onChange={(e) => setProfileField({ name: e.target.value })}
                  className="inv-input"
                />
              </Labeled>
              <Labeled label="Inhaber">
                <input
                  value={profile.owner}
                  onChange={(e) => setProfileField({ owner: e.target.value })}
                  className="inv-input"
                />
              </Labeled>
              <Labeled label="Straße">
                <input
                  value={profile.street}
                  onChange={(e) => setProfileField({ street: e.target.value })}
                  className="inv-input"
                />
              </Labeled>
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <Labeled label="PLZ">
                  <input
                    value={profile.zip}
                    onChange={(e) => setProfileField({ zip: e.target.value })}
                    className="inv-input inv-num text-left"
                  />
                </Labeled>
                <Labeled label="Ort">
                  <input
                    value={profile.city}
                    onChange={(e) => setProfileField({ city: e.target.value })}
                    className="inv-input"
                  />
                </Labeled>
              </div>
              <Labeled label="Steuernummer">
                <input
                  value={profile.taxNumber}
                  onChange={(e) => setProfileField({ taxNumber: e.target.value })}
                  placeholder="z. B. 337/5804/1234"
                  className="inv-input inv-num text-left"
                />
              </Labeled>
              <Labeled label="USt-IdNr.">
                <input
                  value={profile.vatId}
                  onChange={(e) => setProfileField({ vatId: e.target.value })}
                  className="inv-input inv-num text-left"
                />
              </Labeled>
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-3 text-[0.8125rem] text-ink-soft">
                Bankverbindung – Grundlage für den GiroCode auf der Rechnung.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Bank">
                  <input
                    value={profile.bankName}
                    onChange={(e) => setProfileField({ bankName: e.target.value })}
                    className="inv-input"
                  />
                </Labeled>
                <Labeled label="BIC (optional)">
                  <input
                    value={profile.bic}
                    onChange={(e) => setProfileField({ bic: e.target.value.toUpperCase() })}
                    className="inv-input inv-num text-left"
                  />
                </Labeled>
                <Labeled label="IBAN" className="sm:col-span-2">
                  <input
                    value={formatIban(profile.iban)}
                    onChange={(e) =>
                      setProfileField({ iban: e.target.value.replace(/\s+/g, "").toUpperCase() })
                    }
                    placeholder="DE00 0000 0000 0000 0000 00"
                    className="inv-input inv-num text-left"
                  />
                  {profile.iban.length > 0 && (
                    <span
                      className="mt-1 block text-[0.75rem]"
                      style={{
                        color: isValidIban(profile.iban)
                          ? "var(--positive)"
                          : "var(--danger)",
                      }}
                    >
                      {isValidIban(profile.iban)
                        ? "Prüfziffer korrekt."
                        : "Prüfziffer stimmt nicht – der GiroCode bleibt aus."}
                    </span>
                  )}
                </Labeled>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Labeled label="Nummernkreis">
                  <input
                    value={profile.numberPrefix}
                    onChange={(e) => setProfileField({ numberPrefix: e.target.value })}
                    className="inv-input inv-num text-left"
                  />
                </Labeled>
                <Labeled label="Nächste Nummer">
                  <input
                    value={profile.nextNumber}
                    onChange={(e) =>
                      setProfileField({ nextNumber: Math.max(1, parseQty(e.target.value)) })
                    }
                    inputMode="numeric"
                    className="inv-input inv-num"
                  />
                </Labeled>
                <Labeled label="Zahlungsziel (Tage)">
                  <input
                    value={profile.defaultDueDays}
                    onChange={(e) =>
                      setProfileField({ defaultDueDays: Math.max(0, parseQty(e.target.value)) })
                    }
                    inputMode="numeric"
                    className="inv-input inv-num"
                  />
                </Labeled>
              </div>
              <p className="mt-2 font-mono text-[0.75rem] text-ink-faint">
                Nächste Rechnung: {peekNumber(profile)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <ToolButton icon="arrow-up-right" label="Sicherung speichern" onClick={exportBackup} />
              <ToolButton
                icon="arrow-right"
                label="Sicherung einspielen"
                onClick={() => fileRef.current?.click()}
              />
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importBackup(f);
                  e.target.value = "";
                }}
              />
              <p className="w-full text-[0.75rem] leading-relaxed text-ink-faint">
                Alle Daten liegen ausschließlich in diesem Browser – nichts wird
                übertragen. Damit sie einen Gerätewechsel überstehen, gehört die
                Sicherung regelmäßig auf einen anderen Datenträger.
              </p>
            </div>
          </div>
        </Overlay>
      )}

      {/* Verlauf */}
      {panel === "verlauf" && (
        <Overlay title="Abgeschlossene Rechnungen" onClose={() => setPanel("none")}>
          {history.length === 0 ? (
            <p className="py-8 text-center text-[0.875rem] text-ink-soft">
              Noch keine Rechnung abgeschlossen.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {history.map((h) => (
                <li key={h.number} className="flex items-center gap-4 py-2.5">
                  <span className="w-28 shrink-0 font-mono text-[0.8125rem] text-ink-strong">
                    {h.number}
                  </span>
                  <span className="w-24 shrink-0 font-mono text-[0.75rem] text-ink-soft">
                    {formatDate(h.date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">
                    {h.customer}
                  </span>
                  <span className="shrink-0 font-mono text-[0.875rem] tabular-nums text-ink-strong">
                    {cents(h.grossCents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoice(h.invoice);
                      setPanel("none");
                      setFlash(`${h.number} geöffnet – Änderungen bekommen keine neue Nummer.`);
                    }}
                    className="shrink-0 rounded-full border border-line px-3 py-1 text-[0.75rem] text-ink-strong hover:border-line-strong"
                  >
                    Öffnen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Overlay>
      )}
    </>
  );
}

/* ---- Overlay ------------------------------------------------------------- */

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="inv-editor fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-24 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-2xl rounded-[var(--radius-l)] border border-line bg-page p-6 shadow-floating"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-sunken hover:text-ink-strong"
            aria-label="Schließen"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
