"use client";

import {
  cents,
  formatDate,
  formatQty,
  invoiceTotals,
  type InvoiceTotals,
} from "@/lib/invoice/calc";
import { docTypeMeta } from "@/lib/invoice/doctype";
import { canRenderGiroCode, formatIban, giroCodePayload } from "@/lib/invoice/girocode";
import {
  CONTENT_W,
  MARGIN_L,
  MARGIN_R,
  paginate,
  type SheetPage,
} from "@/lib/invoice/paginate";
import type { CompanyProfile, Invoice } from "@/lib/invoice/types";
import { QrCode } from "@/components/ui/QrCode";
import {
  ContinuationHead,
  EdgeScale,
  Guilloche,
  MicroRule,
  SheetMark,
  Stamp,
} from "@/components/invoice/Letterhead";

/*
  Das Dokument. Kein Vorschaubild – dieselben Millimeter auf dem Schirm wie im
  Drucker, und seit dieser Fassung so viele Blätter, wie die Positionen
  brauchen.

  Maßgebend bleibt DIN 5008 Form B: Anschriftfeld 45 mm unter der Oberkante,
  20 mm vom linken Rand, Falzmarken bei 105 und 210 mm, Lochmarke bei
  148,5 mm. Nur dann steht die Adresse im Fenster eines DIN-lang-Umschlags.

  Alles darüber hinaus ist Briefkopf: Bildmarke, Mikroschriftlinie,
  Guillochenrosette, Randskala. Siehe Letterhead.tsx.
*/

interface Props {
  invoice: Invoice;
  profile: CompanyProfile;
  totals?: InvoiceTotals;
}

/* ---- Bausteine ----------------------------------------------------------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="sheet-label">{label}</span>
      <span className="sheet-value">{value}</span>
    </div>
  );
}

/** Geräteblock im Stil einer Messwertanzeige – drei Felder, feste Breiten. */
function DeviceStrip({ invoice }: { invoice: Invoice }) {
  const fields = [
    { label: "Gerät", value: invoice.device.model },
    { label: "IMEI / Seriennummer", value: invoice.device.imei },
    { label: "Befund bei Annahme", value: invoice.device.condition },
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <div className="sheet-device-strip">
      {fields.map((f) => (
        <div key={f.label} className="sheet-device-cell">
          <span className="sheet-device-label">{f.label}</span>
          <span className="sheet-device-value">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Abtrennbarer Zahlungsabschnitt mit GiroCode. */
function PaymentSlip({
  invoice,
  profile,
  grossCents,
  dueDate,
}: {
  invoice: Invoice;
  profile: CompanyProfile;
  grossCents: number;
  dueDate: string;
}) {
  const payload = giroCodePayload({
    name: profile.name,
    iban: profile.iban,
    bic: profile.bic,
    amountCents: grossCents,
    reference: `${docTypeMeta(invoice.docType).label} ${invoice.number}`,
  });

  return (
    <section
      className="absolute"
      style={{ left: `${MARGIN_L}mm`, right: `${MARGIN_R}mm`, bottom: "30mm" }}
    >
      {/* Perforation. Die Schere ist kein Schmuck: Sie sagt, dass hier
          abgetrennt werden darf, ohne dass Text verloren geht. */}
      <div className="sheet-perforation">
        <span className="sheet-scissors" aria-hidden="true">
          &#9986;
        </span>
      </div>

      <div className="sheet-slip">
        <div className="sheet-slip-fields">
          <p className="sheet-slip-title">Zahlungsabschnitt</p>
          <div className="sheet-slip-grid">
            <span className="sheet-slip-label">Empfänger</span>
            <span className="sheet-slip-value">{profile.name}</span>
            <span className="sheet-slip-label">IBAN</span>
            <span className="sheet-slip-value sheet-num">{formatIban(profile.iban)}</span>
            {profile.bic && (
              <>
                <span className="sheet-slip-label">BIC</span>
                <span className="sheet-slip-value sheet-num">{profile.bic}</span>
              </>
            )}
            <span className="sheet-slip-label">Verwendungszweck</span>
            <span className="sheet-slip-value sheet-num">{invoice.number}</span>
            <span className="sheet-slip-label">Fällig</span>
            <span className="sheet-slip-value">{formatDate(dueDate)}</span>
          </div>
        </div>

        <div className="sheet-slip-amount">
          <span className="sheet-slip-label">Betrag</span>
          <span className="sheet-slip-sum sheet-num">{cents(grossCents)}</span>
        </div>

        <div className="sheet-slip-qr">
          <QrCode
            value={payload}
            size={80}
            quiet={2}
            label={`GiroCode zur Zahlung von ${invoice.number}`}
          />
          <span className="sheet-slip-qr-note">
            Scannen &amp; zahlen
            <br />
            GiroCode
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---- Hauptkomponente ----------------------------------------------------- */

export function InvoiceSheet({ invoice, profile, totals }: Props) {
  const t = totals ?? invoiceTotals(invoice);
  const meta = docTypeMeta(invoice.docType);

  const wantsSlip =
    meta.demandsPayment &&
    !invoice.paid &&
    invoice.paymentMethod === "ueberweisung" &&
    canRenderGiroCode(profile.iban, profile.name);

  const grossOf = invoice.grossEntry
    ? (l: { grossCents: number }) => l.grossCents
    : (l: { netCents: number }) => l.netCents;

  const pages = paginate(
    invoice,
    t.lines,
    grossOf as (x: { grossCents: number; netCents: number }) => number,
    wantsSlip,
  );

  const senderLine = [profile.name, profile.street, `${profile.zip} ${profile.city}`]
    .filter(Boolean)
    .join(" · ");

  const taxNote =
    invoice.taxMode === "klein"
      ? "Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet."
      : invoice.taxMode === "differenz"
        ? "Differenzbesteuerung nach § 25a UStG – Gebrauchtgegenstände. Umsatzsteuer wird nicht gesondert ausgewiesen."
        : null;

  const paymentNote = !meta.demandsPayment
    ? (meta.validityNote ?? "")
    : invoice.paid
      ? "Der Betrag ist beglichen. Dieser Beleg dient als Nachweis."
      : invoice.dueDays === 0
        ? "Zahlbar sofort ohne Abzug."
        : `Zahlbar bis ${formatDate(t.dueDate)} ohne Abzug.`;

  const methodLabel = {
    ueberweisung: "Überweisung",
    bar: "Barzahlung",
    karte: "Kartenzahlung",
    paypal: "PayPal",
  }[invoice.paymentMethod];

  const stamp = invoice.copy
    ? { text: "Kopie", tone: "muted" as const }
    : invoice.paid && meta.demandsPayment
      ? { text: "Bezahlt", tone: "dark" as const }
      : invoice.docType === "storno"
        ? { text: "Storniert", tone: "dark" as const }
        : null;

  return (
    <div className="sheet-doc">
      {pages.map((page, pi) => (
        <SheetPageView
          key={pi}
          page={page}
          pageIndex={pi}
          pageCount={pages.length}
          invoice={invoice}
          profile={profile}
          totals={t}
          meta={meta}
          senderLine={senderLine}
          taxNote={taxNote}
          paymentNote={paymentNote}
          methodLabel={methodLabel}
          stamp={stamp}
          wantsSlip={wantsSlip}
        />
      ))}
    </div>
  );
}

/* ---- Ein Blatt ----------------------------------------------------------- */

function SheetPageView({
  page,
  pageIndex,
  pageCount,
  invoice,
  profile,
  totals: t,
  meta,
  senderLine,
  taxNote,
  paymentNote,
  methodLabel,
  stamp,
  wantsSlip,
}: {
  page: SheetPage;
  pageIndex: number;
  pageCount: number;
  invoice: Invoice;
  profile: CompanyProfile;
  totals: InvoiceTotals;
  meta: ReturnType<typeof docTypeMeta>;
  senderLine: string;
  taxNote: string | null;
  paymentNote: string;
  methodLabel: string;
  stamp: { text: string; tone: "dark" | "muted" } | null;
  wantsSlip: boolean;
}) {
  const first = pageIndex === 0;
  const showTax = invoice.taxMode === "regel";
  const cols = showTax ? 6 : 5;

  return (
    <article className="sheet" data-print="block">
      {/* Falz- und Lochmarken */}
      <span className="sheet-mark" style={{ top: "105mm" }} aria-hidden="true" />
      <span
        className="sheet-mark sheet-mark-hole"
        style={{ top: "148.5mm" }}
        aria-hidden="true"
      />
      <span className="sheet-mark" style={{ top: "210mm" }} aria-hidden="true" />

      <EdgeScale />

      {first ? (
        <>
          {/* Briefkopf */}
          <header
            className="absolute"
            style={{ left: `${MARGIN_L}mm`, right: `${MARGIN_R}mm`, top: "15mm" }}
          >
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-start gap-[3.5mm]">
                <SheetMark size={11} />
                <div>
                  <p className="sheet-wordmark">{profile.name}</p>
                  <p className="sheet-tagline">Präzision für Ihr Smartphone</p>
                </div>
              </div>
              <div className="sheet-contact">
                <p>{profile.street}</p>
                <p>
                  {profile.zip} {profile.city}
                </p>
                <p className="sheet-num">{profile.phone}</p>
                <p>{profile.email}</p>
              </div>
            </div>
            <div style={{ marginTop: "3mm" }}>
              <MicroRule text={`${profile.name} · ${profile.city}`} />
            </div>
          </header>

          {/* Anschriftfeld nach DIN 5008 Form B */}
          <section
            className="absolute"
            style={{ left: "20mm", top: "45mm", width: "85mm", height: "40mm" }}
          >
            <p className="sheet-return">{senderLine}</p>
            <div style={{ marginTop: "3mm" }}>
              {invoice.customer.name ? (
                <>
                  {invoice.customer.extra && (
                    <p className="sheet-address">{invoice.customer.extra}</p>
                  )}
                  <p className="sheet-address">{invoice.customer.name}</p>
                  {invoice.customer.street && (
                    <p className="sheet-address">{invoice.customer.street}</p>
                  )}
                  <p className="sheet-address">
                    {[invoice.customer.zip, invoice.customer.city]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {invoice.customer.country && (
                    <p className="sheet-address">{invoice.customer.country}</p>
                  )}
                </>
              ) : (
                <p className="sheet-address sheet-placeholder">Empfänger</p>
              )}
            </div>
          </section>

          {/* Informationsblock */}
          <section
            className="absolute"
            style={{ left: "125mm", right: `${MARGIN_R}mm`, top: "45mm" }}
          >
            <div className="grid gap-[1.2mm]">
              <InfoRow label={meta.label} value={invoice.number} />
              <InfoRow label="Datum" value={formatDate(invoice.date)} />
              <InfoRow label="Leistung" value={formatDate(invoice.serviceDate)} />
              {invoice.reference && <InfoRow label="Bezug" value={invoice.reference} />}
              {invoice.customer.vatId && (
                <InfoRow label="USt-IdNr." value={invoice.customer.vatId} />
              )}
              {pageCount > 1 && (
                <InfoRow label="Umfang" value={`Seite 1 von ${pageCount}`} />
              )}
            </div>
          </section>

          {/* Betreff */}
          <div
            className="absolute"
            style={{ left: `${MARGIN_L}mm`, right: `${MARGIN_R}mm`, top: "98mm" }}
          >
            <div className="flex items-baseline justify-between gap-6">
              <h1 className="sheet-doctype">{meta.label}</h1>
              <span className="sheet-docnumber sheet-num">{invoice.number}</span>
            </div>
            <div className="sheet-rule" style={{ marginTop: "2.4mm" }} />
            <div style={{ marginTop: "4mm" }}>
              <DeviceStrip invoice={invoice} />
            </div>
            {invoice.intro && <p className="sheet-text mt-[4mm]">{invoice.intro}</p>}
          </div>
        </>
      ) : (
        <ContinuationHead
          wordmark={profile.name}
          docLabel={meta.label}
          number={invoice.number}
          page={pageIndex + 1}
          pages={pageCount}
        />
      )}

      {/* Positionen und Abschluss */}
      <div
        className="absolute"
        style={{
          left: `${MARGIN_L}mm`,
          right: `${MARGIN_R}mm`,
          top: `${page.top}mm`,
        }}
        data-sheet-body
      >
        {!first && (
          <div className="sheet-carry sheet-carry-in">
            <span>Übertrag von Seite {pageIndex}</span>
            <span className="sheet-num">{cents(page.carryIn)}</span>
          </div>
        )}

        <table className="sheet-table">
          <thead>
            <tr>
              <th style={{ width: "8mm" }} className="text-left">
                Pos.
              </th>
              <th className="text-left">Bezeichnung</th>
              <th style={{ width: "17mm" }} className="text-right">
                Menge
              </th>
              <th style={{ width: "24mm" }} className="text-right">
                Einzel
              </th>
              {showTax && (
                <th style={{ width: "13mm" }} className="text-right">
                  USt
                </th>
              )}
              <th style={{ width: "26mm" }} className="text-right">
                Betrag
              </th>
            </tr>
          </thead>
          <tbody>
            {page.lines.length > 0 ? (
              page.lines.map(({ line, totals: lt, index }) => (
                <tr key={line.id}>
                  <td className="sheet-num align-top">{index + 1}</td>
                  <td className="align-top">
                    <span className="sheet-line-title">
                      {line.title || "Ohne Bezeichnung"}
                    </span>
                    {line.note && <span className="sheet-line-note">{line.note}</span>}
                    {line.discountPct > 0 && (
                      <span className="sheet-line-note">
                        Rabatt {formatQty(line.discountPct)} % (−{cents(lt.discountCents)})
                      </span>
                    )}
                  </td>
                  <td className="sheet-num text-right align-top">
                    {formatQty(line.qty)} {line.unit}
                  </td>
                  <td className="sheet-num text-right align-top">
                    {cents(line.unitCents)}
                  </td>
                  {showTax && (
                    <td className="sheet-num text-right align-top">
                      {lt.effectiveRate} %
                    </td>
                  )}
                  <td className="sheet-num text-right align-top">
                    {cents(invoice.grossEntry ? lt.grossCents : lt.netCents)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={cols} className="sheet-empty">
                  Noch keine Positionen erfasst.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {page.isLast && (
          /* Summe rechts, Schlusstext links – nebeneinander, nicht
             untereinander. Das spart rund 25 mm Blatthöhe und ist der
             Unterschied zwischen einer einseitigen und einer zweiseitigen
             Rechnung. */
          <div className="sheet-final">
            <div className="sheet-final-text">
              {taxNote && <p className="sheet-fine">{taxNote}</p>}
              <p className="sheet-text">
                {paymentNote}
                {meta.demandsPayment &&
                  !invoice.paid &&
                  invoice.paymentMethod === "ueberweisung" &&
                  profile.iban && (
                    <>
                      {" "}
                      Verwendungszweck{" "}
                      <span className="sheet-strong">{invoice.number}</span> – oder
                      GiroCode unten scannen.
                    </>
                  )}
                {meta.demandsPayment &&
                  !invoice.paid &&
                  invoice.paymentMethod !== "ueberweisung" && (
                    <> Zahlungsart: {methodLabel}.</>
                  )}
              </p>
              {invoice.closing && <p className="sheet-text">{invoice.closing}</p>}
              <p className="sheet-fine">
                Auf jede Reparatur und jedes verbaute Teil gewähren wir{" "}
                {profile.warrantyMonths} Monate Garantie.
              </p>
              {stamp && <Stamp text={stamp.text} tone={stamp.tone} />}
            </div>

            <div className="sheet-final-sum">
              <Guilloche size={42} className="sheet-summary-seal" />
              <div className="sheet-summary-inner">
                <div className="sheet-sum-row">
                  <span>Nettobetrag</span>
                  <span className="sheet-num">{cents(t.netCents)}</span>
                </div>

                {showTax &&
                  t.groups
                    .filter((g) => g.rate > 0)
                    .map((g) => (
                      <div key={g.rate} className="sheet-sum-row">
                        <span>
                          zzgl. {g.rate} % USt auf {cents(g.netCents)}
                        </span>
                        <span className="sheet-num">{cents(g.taxCents)}</span>
                      </div>
                    ))}

                {showTax && t.groups.some((g) => g.rate === 0) && (
                  <div className="sheet-sum-row">
                    <span>steuerfrei</span>
                    <span className="sheet-num">
                      {cents(t.groups.find((g) => g.rate === 0)?.netCents ?? 0)}
                    </span>
                  </div>
                )}

                <div className="sheet-sum-total">
                  <span>{meta.totalLabel}</span>
                  <span className="sheet-num">{cents(t.grossCents)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Übertrag am Seitenfuß */}
      {page.carryOut !== null && (
        <div
          className="absolute"
          style={{ left: `${MARGIN_L}mm`, right: `${MARGIN_R}mm`, bottom: "38mm" }}
        >
          <div className="sheet-carry sheet-carry-out">
            <span>Übertrag auf Seite {pageIndex + 2}</span>
            <span className="sheet-num">{cents(page.carryOut)}</span>
          </div>
        </div>
      )}

      {page.isLast && wantsSlip && (
        <PaymentSlip
          invoice={invoice}
          profile={profile}
          grossCents={t.grossCents}
          dueDate={t.dueDate}
        />
      )}

      {/* Fußzeile */}
      <footer
        className="absolute"
        style={{ left: `${MARGIN_L}mm`, right: `${MARGIN_R}mm`, bottom: "12mm" }}
        data-sheet-foot
      >
        <div className="sheet-hairline" />
        <div
          className="grid gap-[4mm] pt-[2.5mm]"
          style={{ gridTemplateColumns: `repeat(3, ${(CONTENT_W - 8) / 3}mm)` }}
        >
          <div>
            <p className="sheet-fine sheet-strong">{profile.name}</p>
            <p className="sheet-fine">{profile.owner}</p>
            <p className="sheet-fine">{profile.street}</p>
            <p className="sheet-fine">
              {profile.zip} {profile.city}
            </p>
          </div>
          <div>
            <p className="sheet-fine">{profile.phone}</p>
            <p className="sheet-fine">{profile.email}</p>
            <p className="sheet-fine">{profile.web}</p>
            {profile.taxNumber && <p className="sheet-fine">St.-Nr. {profile.taxNumber}</p>}
            {profile.vatId && <p className="sheet-fine">USt-IdNr. {profile.vatId}</p>}
          </div>
          <div>
            {profile.bankName && <p className="sheet-fine">{profile.bankName}</p>}
            {profile.iban && (
              <p className="sheet-fine sheet-num">{formatIban(profile.iban)}</p>
            )}
            {profile.bic && <p className="sheet-fine sheet-num">{profile.bic}</p>}
            <p className="sheet-fine sheet-page">
              Seite {pageIndex + 1} von {pageCount}
            </p>
          </div>
        </div>
      </footer>
    </article>
  );
}
