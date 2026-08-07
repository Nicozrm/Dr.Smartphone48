import { eInvoiceModel, type EInvoiceLine, type EInvoiceTarget, type TaxCategory } from "./einvoice";
import type { InvoiceTotals } from "./calc";
import { isValidIban } from "./girocode";
import type { CompanyProfile, Invoice } from "./types";

/**
 * CII – Cross Industry Invoice (UN/CEFACT). Die Syntax hinter ZUGFeRD 2.3,
 * Factur-X und der CII-Ausprägung der XRechnung.
 *
 * Handgeschrieben statt generiert: Das Schema ist groß, der hier benötigte
 * Ausschnitt klein und seit Jahren stabil. Eine Bibliothek für drei Dutzend
 * Elemente einzukaufen hieße, die Lieferkette eines steuerrelevanten Dokuments
 * an ein fremdes Paket zu hängen.
 *
 * **Die Reihenfolge der Elemente ist bindend.** CII ist ein sequenzielles
 * Schema (xsd:sequence): `ram:BasisAmount` vor `ram:ExemptionReason` ist kein
 * Schönheitsfehler, sondern ein Schemaverstoß – der Empfänger weist die
 * Rechnung ab, und zwar automatisch. Deshalb steht hier alles in der
 * Reihenfolge des Schemas und nicht in der, in der man es erzählen würde.
 */

const NAMESPACES = [
  `xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"`,
  `xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"`,
  `xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"`,
].join(" ");

/* ---- Bausteine ----------------------------------------------------------- */

/**
 * XML-Escaping.
 *
 * `&` zuerst – sonst verwandelt der nächste Durchlauf das eben erzeugte
 * `&lt;` in `&amp;lt;`. Steuerzeichen fliegen raus: In XML 1.0 sind sie nicht
 * darstellbar und machen das Dokument unlesbar. Aus einer Warenwirtschaft
 * kopierte Texte bringen sie gelegentlich mit.
 */
function esc(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Betrag in Cent → „1234.56“. Punkt als Dezimaltrenner, immer zwei Stellen. */
function amt(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Einzelpreis in Cent → bis zu vier Nachkommastellen.
 *
 * Die Norm erlaubt beim Preis mehr Stellen als beim Betrag, und genau daran
 * hängt, dass Menge × Preis den Positionsbetrag trifft: 33,45 € netto auf zwei
 * Stück sind 16,725 € je Stück. Auf zwei Stellen gerundet (16,72) ergäbe die
 * Rückrechnung 33,44 € – ein Cent, den jedes Prüfprogramm anmerkt.
 */
function price(cents: number): string {
  return (cents / 100).toFixed(4);
}

/** Menge – höchstens vier Nachkommastellen, ohne Nullenschwanz. */
function qtyStr(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** ISO `2026-08-01` → `20260801` (Datumsformat 102 der Norm). */
function date102(iso: string): string {
  return iso.replace(/-/g, "");
}

function el(name: string, value: string, attrs = ""): string {
  return `<${name}${attrs ? " " + attrs : ""}>${esc(value)}</${name}>`;
}

/** Baut einen Block aus Zeilen; leere Einträge fallen weg. */
function block(lines: (string | false | null | undefined)[]): string[] {
  return lines.filter((l): l is string => typeof l === "string" && l.length > 0);
}

/* ---- Steuerkategorie ----------------------------------------------------- */

/**
 * Die Kategorieangaben auf Positionsebene: nur Art, Kategorie und Satz.
 * Der Befreiungsgrund steht ausschließlich in der Steueraufteilung im Kopf –
 * dort verlangt ihn BR-E-10, hier wäre er schemawidrig.
 */
function lineTax(cat: TaxCategory): string[] {
  return [
    el("ram:TypeCode", "VAT"),
    el("ram:CategoryCode", cat.code),
    el("ram:RateApplicablePercent", cat.rate.toFixed(2)),
  ];
}

/**
 * Steueraufteilung im Kopf (BG-23).
 *
 * Schemareihenfolge, nicht Erzählreihenfolge:
 * CalculatedAmount → TypeCode → ExemptionReason → BasisAmount →
 * CategoryCode → RateApplicablePercent.
 */
function headerTax(cat: TaxCategory, basisCents: number, taxCents: number): string[] {
  return block([
    el("ram:CalculatedAmount", amt(taxCents)),
    el("ram:TypeCode", "VAT"),
    cat.exemptionReason ? el("ram:ExemptionReason", cat.exemptionReason) : "",
    el("ram:BasisAmount", amt(basisCents)),
    el("ram:CategoryCode", cat.code),
    el("ram:RateApplicablePercent", cat.rate.toFixed(2)),
  ]);
}

/* ---- Positionen ---------------------------------------------------------- */

function lineXml(line: EInvoiceLine): string[] {
  // BG-27 – Nachlass auf Positionsebene. Der Positionsbetrag ergibt sich als
  // Menge × Einzelpreis minus Nachlass; deshalb trägt der Einzelpreis oben den
  // Wert *vor* Rabatt, und der Abzug steht hier einmal explizit.
  const allowance =
    line.allowanceCents > 0
      ? block([
          `<ram:SpecifiedTradeAllowanceCharge>`,
          `  <ram:ChargeIndicator>`,
          // false = Nachlass. Ohne das Element liest der Empfänger einen Zuschlag.
          `    ${el("udt:Indicator", "false")}`,
          `  </ram:ChargeIndicator>`,
          // Prozentsatz und Grundlage gehören zusammen: PEPPOL-EN16931-R041
          // weist eine Rechnung zurück, die den Satz ohne die Grundlage nennt.
          line.allowancePct > 0
            ? `  ${el("ram:CalculationPercent", line.allowancePct.toFixed(2))}`
            : "",
          line.allowancePct > 0
            ? `  ${el("ram:BasisAmount", amt(line.allowanceBasisCents))}`
            : "",
          `  ${el("ram:ActualAmount", amt(line.allowanceCents))}`,
          `  ${el("ram:Reason", `Rabatt ${line.allowancePct} %`)}`,
          `</ram:SpecifiedTradeAllowanceCharge>`,
        ])
      : [];

  return block([
    `<ram:IncludedSupplyChainTradeLineItem>`,
    `  <ram:AssociatedDocumentLineDocument>`,
    `    ${el("ram:LineID", String(line.id))}`,
    `  </ram:AssociatedDocumentLineDocument>`,
    `  <ram:SpecifiedTradeProduct>`,
    `    ${el("ram:Name", line.name)}`,
    line.note ? `    ${el("ram:Description", line.note)}` : "",
    `  </ram:SpecifiedTradeProduct>`,
    `  <ram:SpecifiedLineTradeAgreement>`,
    `    <ram:NetPriceProductTradePrice>`,
    `      ${el("ram:ChargeAmount", price(line.unitNetCents))}`,
    `    </ram:NetPriceProductTradePrice>`,
    `  </ram:SpecifiedLineTradeAgreement>`,
    `  <ram:SpecifiedLineTradeDelivery>`,
    `    ${el("ram:BilledQuantity", qtyStr(line.qty), `unitCode="${line.unitCode}"`)}`,
    `  </ram:SpecifiedLineTradeDelivery>`,
    `  <ram:SpecifiedLineTradeSettlement>`,
    `    <ram:ApplicableTradeTax>`,
    ...lineTax(line.category).map((l) => `      ${l}`),
    `    </ram:ApplicableTradeTax>`,
    ...allowance.map((l) => `    ${l}`),
    `    <ram:SpecifiedTradeSettlementLineMonetarySummation>`,
    `      ${el("ram:LineTotalAmount", amt(line.netCents))}`,
    `    </ram:SpecifiedTradeSettlementLineMonetarySummation>`,
    `  </ram:SpecifiedLineTradeSettlement>`,
    `</ram:IncludedSupplyChainTradeLineItem>`,
  ]);
}

/* ---- Dokument ------------------------------------------------------------ */

/** Ländercode aus dem Freitextfeld; leer heißt Deutschland. */
function countryCode(input: string): string {
  const v = input.trim();
  if (!v) return "DE";
  if (/^de(utschland)?$/i.test(v)) return "DE";
  if (/^(at|österreich|oesterreich)$/i.test(v)) return "AT";
  if (/^(ch|schweiz)$/i.test(v)) return "CH";
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return "DE";
}

export function ciiXml(
  invoice: Invoice,
  profile: CompanyProfile,
  target: EInvoiceTarget,
  totals?: InvoiceTotals,
): string {
  const m = eInvoiceModel(invoice, profile, target, totals);
  const c = invoice.customer;
  const useIban =
    !invoice.paid && invoice.paymentMethod === "ueberweisung" && isValidIban(profile.iban);

  const doc = block([
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rsm:CrossIndustryInvoice ${NAMESPACES}>`,

    /* Kontext – nach welchem Regelwerk gelesen werden will. */
    `  <rsm:ExchangedDocumentContext>`,
    // BT-23 – Geschäftsprozess. Ohne ihn beanstandet die XRechnung-Prüfung
    // (PEPPOL-EN16931-R001); „01“ ist der Regelfall „Rechnungsstellung“.
    `    <ram:BusinessProcessSpecifiedDocumentContextParameter>`,
    `      ${el("ram:ID", "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0")}`,
    `    </ram:BusinessProcessSpecifiedDocumentContextParameter>`,
    `    <ram:GuidelineSpecifiedDocumentContextParameter>`,
    `      ${el("ram:ID", m.guideline)}`,
    `    </ram:GuidelineSpecifiedDocumentContextParameter>`,
    `  </rsm:ExchangedDocumentContext>`,

    /* Kopf */
    `  <rsm:ExchangedDocument>`,
    `    ${el("ram:ID", m.number)}`,
    // 380 = Handelsrechnung (UNTDID 1001).
    `    ${el("ram:TypeCode", "380")}`,
    `    <ram:IssueDateTime>`,
    `      ${el("udt:DateTimeString", date102(m.issueDate), `format="102"`)}`,
    `    </ram:IssueDateTime>`,
    ...m.notes.flatMap((n) => [
      `    <ram:IncludedNote>`,
      `      ${el("ram:Content", n)}`,
      `    </ram:IncludedNote>`,
    ]),
    `  </rsm:ExchangedDocument>`,

    `  <rsm:SupplyChainTradeTransaction>`,

    /* Positionen */
    ...m.lines.flatMap(lineXml).map((l) => `    ${l}`),

    /* Vereinbarung: wer an wen */
    `    <ram:ApplicableHeaderTradeAgreement>`,
    // BT-10 – Leitweg-ID der Behörde bzw. Bestellnummer des Kunden. Für die
    // XRechnung Pflicht (BR-DE-15), für ZUGFeRD freiwillig.
    c.reference?.trim() ? `      ${el("ram:BuyerReference", c.reference.trim())}` : "",
    `      <ram:SellerTradeParty>`,
    `        ${el("ram:Name", profile.name)}`,
    ...(profile.owner && profile.owner !== profile.name
      ? [
          `        <ram:SpecifiedLegalOrganization>`,
          `          ${el("ram:TradingBusinessName", profile.owner)}`,
          `        </ram:SpecifiedLegalOrganization>`,
        ]
      : []),
    `        <ram:DefinedTradeContact>`,
    `          ${el("ram:PersonName", profile.owner || profile.name)}`,
    ...(profile.phone
      ? [
          `          <ram:TelephoneUniversalCommunication>`,
          `            ${el("ram:CompleteNumber", profile.phone)}`,
          `          </ram:TelephoneUniversalCommunication>`,
        ]
      : []),
    ...(profile.email
      ? [
          `          <ram:EmailURIUniversalCommunication>`,
          `            ${el("ram:URIID", profile.email)}`,
          `          </ram:EmailURIUniversalCommunication>`,
        ]
      : []),
    `        </ram:DefinedTradeContact>`,
    `        <ram:PostalTradeAddress>`,
    `          ${el("ram:PostcodeCode", profile.zip)}`,
    `          ${el("ram:LineOne", profile.street)}`,
    `          ${el("ram:CityName", profile.city)}`,
    `          ${el("ram:CountryID", "DE")}`,
    `        </ram:PostalTradeAddress>`,
    ...(profile.email
      ? [
          `        <ram:URIUniversalCommunication>`,
          `          ${el("ram:URIID", profile.email, `schemeID="EM"`)}`,
          `        </ram:URIUniversalCommunication>`,
        ]
      : []),
    // VA = USt-IdNr. (BT-31), FC = Steuernummer (BT-32). Beides darf stehen.
    ...(profile.vatId
      ? [
          `        <ram:SpecifiedTaxRegistration>`,
          `          ${el("ram:ID", profile.vatId, `schemeID="VA"`)}`,
          `        </ram:SpecifiedTaxRegistration>`,
        ]
      : []),
    ...(profile.taxNumber
      ? [
          `        <ram:SpecifiedTaxRegistration>`,
          `          ${el("ram:ID", profile.taxNumber, `schemeID="FC"`)}`,
          `        </ram:SpecifiedTaxRegistration>`,
        ]
      : []),
    `      </ram:SellerTradeParty>`,
    `      <ram:BuyerTradeParty>`,
    `        ${el("ram:Name", c.name.trim() || "Barverkauf")}`,
    ...(c.extra
      ? [
          `        <ram:DefinedTradeContact>`,
          `          ${el("ram:PersonName", c.extra)}`,
          `        </ram:DefinedTradeContact>`,
        ]
      : []),
    `        <ram:PostalTradeAddress>`,
    `          ${el("ram:PostcodeCode", c.zip)}`,
    `          ${el("ram:LineOne", c.street)}`,
    `          ${el("ram:CityName", c.city)}`,
    `          ${el("ram:CountryID", countryCode(c.country))}`,
    `        </ram:PostalTradeAddress>`,
    // BT-49 – elektronische Adresse des Empfängers, Schema EM = E-Mail.
    ...(c.email?.trim()
      ? [
          `        <ram:URIUniversalCommunication>`,
          `          ${el("ram:URIID", c.email.trim(), `schemeID="EM"`)}`,
          `        </ram:URIUniversalCommunication>`,
        ]
      : []),
    ...(c.vatId
      ? [
          `        <ram:SpecifiedTaxRegistration>`,
          `          ${el("ram:ID", c.vatId, `schemeID="VA"`)}`,
          `        </ram:SpecifiedTaxRegistration>`,
        ]
      : []),
    `      </ram:BuyerTradeParty>`,
    `    </ram:ApplicableHeaderTradeAgreement>`,

    /* Lieferung: wann geleistet wurde (BT-72) */
    `    <ram:ApplicableHeaderTradeDelivery>`,
    `      <ram:ActualDeliverySupplyChainEvent>`,
    `        <ram:OccurrenceDateTime>`,
    `          ${el("udt:DateTimeString", date102(m.deliveryDate), `format="102"`)}`,
    `        </ram:OccurrenceDateTime>`,
    `      </ram:ActualDeliverySupplyChainEvent>`,
    `    </ram:ApplicableHeaderTradeDelivery>`,

    /* Abrechnung: Zahlung, Steuer, Summen */
    `    <ram:ApplicableHeaderTradeSettlement>`,
    `      ${el("ram:InvoiceCurrencyCode", "EUR")}`,
    `      <ram:SpecifiedTradeSettlementPaymentMeans>`,
    `        ${el("ram:TypeCode", m.paymentMeans)}`,
    ...(useIban
      ? [
          `        <ram:PayeePartyCreditorFinancialAccount>`,
          `          ${el("ram:IBANID", profile.iban)}`,
          `          ${el("ram:AccountName", profile.name)}`,
          `        </ram:PayeePartyCreditorFinancialAccount>`,
          ...(profile.bic
            ? [
                `        <ram:PayeeSpecifiedCreditorFinancialInstitution>`,
                `          ${el("ram:BICID", profile.bic)}`,
                `        </ram:PayeeSpecifiedCreditorFinancialInstitution>`,
              ]
            : []),
        ]
      : []),
    `      </ram:SpecifiedTradeSettlementPaymentMeans>`,
    ...m.breakdown.flatMap((b) => [
      `      <ram:ApplicableTradeTax>`,
      ...headerTax(b.category, b.basisCents, b.taxCents).map((l) => `        ${l}`),
      `      </ram:ApplicableTradeTax>`,
    ]),
    `      <ram:SpecifiedTradePaymentTerms>`,
    `        ${el("ram:Description", m.paymentTerms)}`,
    ...(!invoice.paid
      ? [
          `        <ram:DueDateDateTime>`,
          `          ${el("udt:DateTimeString", date102(m.dueDate), `format="102"`)}`,
          `        </ram:DueDateDateTime>`,
        ]
      : []),
    `      </ram:SpecifiedTradePaymentTerms>`,
    `      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>`,
    `        ${el("ram:LineTotalAmount", amt(m.lineTotalCents))}`,
    `        ${el("ram:TaxBasisTotalAmount", amt(m.taxBasisCents))}`,
    `        ${el("ram:TaxTotalAmount", amt(m.taxTotalCents), `currencyID="EUR"`)}`,
    `        ${el("ram:GrandTotalAmount", amt(m.grossCents))}`,
    `        ${el("ram:TotalPrepaidAmount", amt(m.paidCents))}`,
    `        ${el("ram:DuePayableAmount", amt(m.dueCents))}`,
    `      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>`,
    `    </ram:ApplicableHeaderTradeSettlement>`,

    `  </rsm:SupplyChainTradeTransaction>`,
    `</rsm:CrossIndustryInvoice>`,
  ]);

  return doc.join("\n");
}
