"use client";

import { useMemo } from "react";
import {
  cents,
  formatDate,
  formatQty,
  invoiceTotals,
  type InvoiceTotals,
} from "@/lib/invoice/calc";
import { canRenderGiroCode, formatIban, giroCodePayload } from "@/lib/invoice/girocode";
// Derselbe Encoder wie überall sonst auf der Seite. Es gab hier eine zweite,
// eigene Umsetzung – dieselbe Norm, dieselbe Fehlerkorrekturstufe, nur von
// `npm run verify:qr` nicht erfasst. Ausgerechnet der Code, der zum Bezahlen
// auffordert, war damit der einzige ungeprüfte.
import { encodeQr, qrToPath } from "@/lib/qr";
import type { CompanyProfile, Invoice } from "@/lib/invoice/types";

/*
  Das Blatt. Kein Vorschaubild, sondern das Dokument selbst – dieselben
  Millimeter auf dem Schirm wie im Drucker.

  Maßgebend ist DIN 5008 Form B: Das Anschriftfeld beginnt 45 mm unter der
  Oberkante und 20 mm vom linken Rand. Nur dann steht die Adresse im Fenster
  eines DIN-lang-Umschlags – sonst faltet man 200 Rechnungen im Jahr von Hand
  nach, bis es zufällig passt. Falz- und Lochmarken sitzen bei 105 mm,
  148,5 mm und 210 mm.

  Alle Geometrie in Millimetern, nichts in Pixeln: Ein Blatt Papier kennt
  keine Bildschirmauflösung.
*/

const MARGIN_LEFT = 25;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = 210 - MARGIN_LEFT - MARGIN_RIGHT;

/** Kurzzeile unter der Wortmarke – bewusst konstant, nicht konfigurierbar. */
const TAGLINE = "Präzision für Ihr Smartphone.";

interface Props {
  invoice: Invoice;
  profile: CompanyProfile;
  /** Vorberechnete Summen – der Editor braucht sie ohnehin. */
  totals?: InvoiceTotals;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="sheet-label">{label}</span>
      <span className="sheet-value">{value}</span>
    </div>
  );
}

/** GiroCode als SVG. Fällt lautlos aus, wenn die Bankdaten unvollständig sind. */
function GiroCode({
  profile,
  invoice,
  grossCents,
}: {
  profile: CompanyProfile;
  invoice: Invoice;
  grossCents: number;
}) {
  const svg = useMemo(() => {
    if (!canRenderGiroCode(profile.iban, profile.name)) return null;
    try {
      const payload = giroCodePayload({
        name: profile.name,
        iban: profile.iban,
        bic: profile.bic,
        amountCents: grossCents,
        reference: `Rechnung ${invoice.number}`,
      });
      // Ruhezone 4 Module – so verlangt es die Norm. Zuvor waren es zwei;
      // auf weißem Papier ging das gut, auf einem Beleg mit Rahmen nicht.
      return qrToPath(encodeQr(payload), 4);
    } catch {
      return null;
    }
  }, [profile.iban, profile.name, profile.bic, invoice.number, grossCents]);

  if (!svg) return null;

  return (
    <div className="flex items-start gap-3">
      <svg
        viewBox={`0 0 ${svg.extent} ${svg.extent}`}
        width="22mm"
        height="22mm"
        role="img"
        aria-label={`GiroCode zur Zahlung von Rechnung ${invoice.number}`}
        shapeRendering="crispEdges"
      >
        <rect width={svg.extent} height={svg.extent} fill="#fff" />
        <path d={svg.d} fill="#000" />
      </svg>
      <p className="sheet-fine max-w-[38mm] leading-snug">
        Mit der Banking-App scannen – Empfänger, Betrag und Verwendungszweck
        sind bereits eingetragen.
      </p>
    </div>
  );
}

export function InvoiceSheet({ invoice, profile, totals }: Props) {
  const t = totals ?? invoiceTotals(invoice);
  const hasLines = invoice.lines.length > 0;

  const senderLine = [
    profile.name,
    profile.street,
    `${profile.zip} ${profile.city}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const taxNote =
    invoice.taxMode === "klein"
      ? "Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet."
      : invoice.taxMode === "differenz"
        ? "Differenzbesteuerung nach § 25a UStG – Gebrauchtgegenstände. Umsatzsteuer wird nicht gesondert ausgewiesen."
        : null;

  const paymentNote = invoice.paid
    ? "Der Betrag ist beglichen. Diese Rechnung dient als Beleg."
    : invoice.dueDays === 0
      ? "Zahlbar sofort ohne Abzug."
      : `Zahlbar bis ${formatDate(t.dueDate)} ohne Abzug.`;

  const methodLabel = {
    ueberweisung: "Überweisung",
    bar: "Barzahlung",
    karte: "Kartenzahlung",
    paypal: "PayPal",
  }[invoice.paymentMethod];

  return (
    <article className="sheet" data-print="block">
      {/* Falz- und Lochmarken – dünn, aber im Druck vorhanden. */}
      <span className="sheet-mark" style={{ top: "105mm" }} aria-hidden="true" />
      <span className="sheet-mark sheet-mark-hole" style={{ top: "148.5mm" }} aria-hidden="true" />
      <span className="sheet-mark" style={{ top: "210mm" }} aria-hidden="true" />

      {/* Kopf */}
      <header
        className="absolute flex items-start justify-between gap-8"
        style={{ left: `${MARGIN_LEFT}mm`, right: `${MARGIN_RIGHT}mm`, top: "14mm" }}
      >
        <div>
          <p className="sheet-wordmark">{profile.name}</p>
          <p className="sheet-fine mt-[1mm]">{TAGLINE}</p>
        </div>
        <div className="text-right">
          <p className="sheet-fine">{profile.street}</p>
          <p className="sheet-fine">
            {profile.zip} {profile.city}
          </p>
          <p className="sheet-fine mt-[1.5mm]">{profile.phone}</p>
          <p className="sheet-fine">{profile.email}</p>
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
                {[invoice.customer.zip, invoice.customer.city].filter(Boolean).join(" ")}
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
        style={{ left: "125mm", right: `${MARGIN_RIGHT}mm`, top: "45mm" }}
      >
        <div className="grid gap-[1.2mm]">
          <Field label="Rechnung" value={invoice.number} />
          <Field label="Datum" value={formatDate(invoice.date)} />
          <Field label="Leistung" value={formatDate(invoice.serviceDate)} />
          {invoice.customer.vatId && (
            <Field label="USt-IdNr." value={invoice.customer.vatId} />
          )}
        </div>
      </section>

      {/* Inhalt.
          `data-sheet-body` und `data-sheet-foot` sind Messpunkte, keine Deko:
          Das Blatt ist 297 mm hoch und schneidet ab, was nicht hineinpasst
          (overflow: hidden). Der Editor vergleicht beide Kanten und schlägt
          Alarm, bevor eine Rechnung ohne Summe aus dem Drucker kommt. */}
      <div
        data-sheet-body
        className="absolute"
        style={{ left: `${MARGIN_LEFT}mm`, right: `${MARGIN_RIGHT}mm`, top: "98mm" }}
      >
        <h1 className="sheet-subject">Rechnung {invoice.number}</h1>

        {(invoice.device.model || invoice.device.imei) && (
          <p className="sheet-device">
            {[
              invoice.device.model && `Gerät: ${invoice.device.model}`,
              invoice.device.imei && `IMEI/Seriennummer: ${invoice.device.imei}`,
              invoice.device.condition && `Befund bei Annahme: ${invoice.device.condition}`,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        )}

        {invoice.intro && <p className="sheet-text mt-[4mm]">{invoice.intro}</p>}

        {/* Positionen */}
        <table className="sheet-table" style={{ marginTop: invoice.intro ? "5mm" : "6mm" }}>
          <thead>
            <tr>
              <th style={{ width: "8mm" }} className="text-left">Pos.</th>
              <th className="text-left">Bezeichnung</th>
              <th style={{ width: "17mm" }} className="text-right">Menge</th>
              <th style={{ width: "24mm" }} className="text-right">Einzel</th>
              {invoice.taxMode === "regel" && (
                <th style={{ width: "13mm" }} className="text-right">USt</th>
              )}
              <th style={{ width: "26mm" }} className="text-right">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {hasLines ? (
              invoice.lines.map((line, i) => {
                const lt = t.lines[i];
                return (
                  <tr key={line.id}>
                    <td className="sheet-num align-top">{i + 1}</td>
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
                      {cents(
                        invoice.grossEntry
                          ? line.unitCents
                          : Math.round(line.unitCents),
                      )}
                    </td>
                    {invoice.taxMode === "regel" && (
                      <td className="sheet-num text-right align-top">{lt.effectiveRate} %</td>
                    )}
                    <td className="sheet-num text-right align-top">
                      {cents(invoice.grossEntry ? lt.grossCents : lt.netCents)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="sheet-empty">
                  Noch keine Positionen erfasst.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summen */}
        <div className="mt-[5mm] flex justify-end">
          <div style={{ width: "78mm" }}>
            <div className="sheet-sum-row">
              <span>Nettobetrag</span>
              <span className="sheet-num">{cents(t.netCents)}</span>
            </div>

            {invoice.taxMode === "regel" &&
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

            {invoice.taxMode === "regel" &&
              t.groups.some((g) => g.rate === 0) && (
                <div className="sheet-sum-row">
                  <span>steuerfrei</span>
                  <span className="sheet-num">
                    {cents(t.groups.find((g) => g.rate === 0)?.netCents ?? 0)}
                  </span>
                </div>
              )}

            <div className="sheet-sum-total">
              <span>Rechnungsbetrag</span>
              <span className="sheet-num">{cents(t.grossCents)}</span>
            </div>
          </div>
        </div>

        {taxNote && <p className="sheet-fine mt-[4mm]">{taxNote}</p>}

        {/* Zahlung */}
        <div className="sheet-payment">
          <div className="flex-1">
            <p className="sheet-text">
              {paymentNote}
              {!invoice.paid && invoice.paymentMethod === "ueberweisung" && profile.iban && (
                <>
                  {" "}
                  Bitte überweisen Sie auf das unten genannte Konto und geben Sie{" "}
                  <span className="sheet-strong">{invoice.number}</span> als
                  Verwendungszweck an.
                </>
              )}
              {!invoice.paid && invoice.paymentMethod !== "ueberweisung" && (
                <> Zahlungsart: {methodLabel}.</>
              )}
            </p>
            {invoice.closing && <p className="sheet-text mt-[2.5mm]">{invoice.closing}</p>}
            <p className="sheet-fine mt-[2.5mm]">
              Auf jede Reparatur und jedes verbaute Teil gewähren wir{" "}
              {profile.warrantyMonths} Monate Garantie.
            </p>
          </div>
          {!invoice.paid && invoice.paymentMethod === "ueberweisung" && (
            <GiroCode profile={profile} invoice={invoice} grossCents={t.grossCents} />
          )}
        </div>
      </div>

      {/* Fußzeile */}
      <footer
        data-sheet-foot
        className="absolute"
        style={{ left: `${MARGIN_LEFT}mm`, right: `${MARGIN_RIGHT}mm`, bottom: "12mm" }}
      >
        <div className="sheet-footer-rule" />
        <div
          className="grid gap-[4mm] pt-[2.5mm]"
          style={{ gridTemplateColumns: `repeat(3, ${(CONTENT_WIDTH - 8) / 3}mm)` }}
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
          </div>
        </div>
      </footer>
    </article>
  );
}
