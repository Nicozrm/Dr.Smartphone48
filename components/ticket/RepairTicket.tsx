"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { QrCode } from "@/components/ui/QrCode";
import { ConsentGate, useConsentGate } from "@/components/ui/ConsentGate";
import { DamageMap, markKinds, type Mark, type MarkKind } from "./DamageMap";
import { TicketRegistration } from "./TicketRegistration";
import { inspectImei } from "@/lib/imei";
import { formatEuro, formatMinutes } from "@/lib/format";
import { parseTicket, ticketIcs, type Ticket } from "@/lib/ticket";
import { hasTicketBackend } from "@/lib/supabase/env";
import { site, fullAddress } from "@/lib/site";

/*
  Reparatur-Ticket – der Kostenvoranschlag als Dokument, das man mitbringt.

  Der Gedanke dahinter: Zwischen „Preis gesehen" und „Gerät abgegeben" liegt
  in dieser Branche eine Lücke, die überall mit Zetteln, Zurufen und
  Erinnerungsvermögen gefüllt wird. Genau dort passieren die Konflikte – über
  Vorschäden, über den Sperrcode, über den Preis, über die Daten.

  Dieses Ticket schließt die Lücke, ohne ein Konto, ohne einen Server und
  ohne eine einzige gespeicherte Zeile: Alles Öffentliche steht in der
  Adresse, alles Persönliche bleibt im Arbeitsspeicher dieses Browsers und
  ist nach dem Schließen des Tabs weg.
*/

const accessories = [
  "Ladekabel",
  "Netzteil",
  "Hülle",
  "Schutzglas",
  "SIM-Karte",
  "Speicherkarte",
];

type LockHandling = "entsperrt" | "code" | "unbekannt";

const lockOptions: { id: LockHandling; label: string; detail: string }[] = [
  {
    id: "entsperrt",
    label: "Gerät wird entsperrt übergeben",
    detail: "Sperre vorher deaktiviert – der schnellste Weg durch die Prüfung.",
  },
  {
    id: "code",
    label: "Code wird vor Ort mündlich genannt",
    detail: "Wir notieren ihn auf dem Werkstattzettel und vernichten ihn bei der Abholung.",
  },
  {
    id: "unbekannt",
    label: "Code nicht verfügbar",
    detail: "Funktionsprüfung dann nur eingeschränkt möglich – wir sagen vorher, was fehlt.",
  },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-faint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint transition-colors duration-[var(--duration-fast)] focus:border-accent";

/** Zwei Linien zum Unterschreiben – nur auf Papier sinnvoll. */
function SignatureLines() {
  return (
    <div className="print-only mt-10 grid grid-cols-2 gap-10">
      {["Kundin / Kunde", site.name].map((who) => (
        <div key={who}>
          <div className="h-12 border-b border-[#999]" />
          <p className="mt-1.5 text-[0.75rem] text-[#444]">
            {who} · Datum, Unterschrift
          </p>
        </div>
      ))}
    </div>
  );
}

export function RepairTicket() {
  const params = useSearchParams();
  const ticket = useMemo(
    () => parseTicket(new URLSearchParams(params.toString())),
    [params],
  );

  if (!ticket) return <EmptyTicket />;
  return <TicketBody ticket={ticket} />;
}

function EmptyTicket() {
  return (
    <div className="rounded-[var(--radius-l)] border border-line bg-raised p-8 text-center md:p-12">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-soft">
        <Icon name="tool" size={24} />
      </span>
      <h2 className="text-title mt-5">Noch kein Vorgang gewählt</h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
        Ein Ticket entsteht aus einem Kostenvoranschlag. Wählen Sie im
        Sofortpreis-Rechner Gerät und Schaden – am Ende steht der Knopf, der
        genau diese Seite erzeugt.
      </p>
      <Link
        href="/reparatur"
        className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        Zum Sofortpreis-Rechner
        <Icon name="arrow-right" size={17} />
      </Link>
    </div>
  );
}

function TicketBody({ ticket }: { ticket: Ticket }) {
  const [imei, setImei] = useState("");
  const [holder, setHolder] = useState("");
  const [phone, setPhone] = useState("");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activeKind, setActiveKind] = useState<MarkKind>("kratzer");
  const [taken, setTaken] = useState<string[]>([]);
  const [lock, setLock] = useState<LockHandling>("entsperrt");
  const [backupDone, setBackupDone] = useState(false);
  const [findMyOff, setFindMyOff] = useState(false);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const consent = useConsentGate();

  // Die absolute Adresse steht erst im Browser fest – im Export gibt es
  // keinen Server, der sie kennen könnte.
  useEffect(() => {
    setOrigin(`${window.location.origin}${window.location.pathname}`);
  }, []);

  const shareUrl = origin
    ? `${origin}?${ticket.query}`
    : `${site.url}/ticket?${ticket.query}`;

  const imeiInfo = useMemo(() => inspectImei(imei), [imei]);

  const addMark = useCallback(
    (side: "front" | "back", x: number, y: number) => {
      setMarks((prev) => [
        ...prev,
        { id: (prev.at(-1)?.id ?? 0) + 1, side, x, y, kind: activeKind },
      ]);
    },
    [activeKind],
  );

  const removeMark = useCallback((id: number) => {
    // Nach dem Entfernen neu durchnummerieren – Lücken in einer Legende,
    // die unterschrieben wird, sind eine Einladung für Rückfragen.
    setMarks((prev) =>
      prev.filter((m) => m.id !== id).map((m, i) => ({ ...m, id: i + 1 })),
    );
  }, []);

  const toggleAccessory = (item: string) => {
    setTaken((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Ohne Zwischenablage-Rechte bleibt der Link sichtbar darunter stehen.
    }
  };

  const share = async () => {
    const text = `Kostenvoranschlag ${ticket.reference} – ${ticket.brand.name} ${ticket.model.name}, ${formatEuro(ticket.total)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${site.name} · Vorgang ${ticket.reference}`, text, url: shareUrl });
        return;
      } catch {
        // Abbruch durch die Nutzerin ist kein Fehler.
      }
    }
    void copyLink();
  };

  const downloadIcs = () => {
    // Nächster Werktag als Vorschlag – der Termin wird dadurch nicht bestätigt.
    const date = new Date();
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    const ics = ticketIcs({
      ticket,
      date,
      url: shareUrl,
      location: `${site.name}, ${fullAddress}`,
      organizer: site.name,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${site.name.replace(/\s+/g, "-")}-${ticket.reference}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const whatsappText = encodeURIComponent(
    [
      `Guten Tag, ich möchte einen Termin für Vorgang ${ticket.reference}.`,
      `${ticket.brand.name} ${ticket.model.name} – ${ticket.positions.map((p) => p.label).join(", ")}`,
      `Kostenvoranschlag: ${formatEuro(ticket.total)}`,
      shareUrl,
    ].join("\n"),
  );

  const actionClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-4.5 text-[0.875rem] font-medium text-ink-strong transition-colors duration-[var(--duration-fast)] hover:border-ink-strong";

  return (
    <div data-print-root>
      {/* Briefkopf – erscheint nur auf dem Ausdruck */}
      <div className="print-only mb-8 border-b border-[#999] pb-4">
        <p className="text-[1.1rem] font-semibold">{site.name} · Übergabeprotokoll</p>
        <p className="mt-1 text-[0.8rem]">
          {fullAddress} · {site.phone} · {site.email}
        </p>
      </div>

      {/* ---- Kopf: Vorgang, Gerät, QR ---------------------------------- */}
      <div className="overflow-hidden rounded-[var(--radius-l)] border border-line bg-raised shadow-raised">
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:gap-12 md:p-8">
          <div className="min-w-0">
            <p className="text-eyebrow">Kostenvoranschlag</p>
            <h2 className="text-headline mt-3 break-words">
              {ticket.brand.name} {ticket.model.name}
            </h2>
            <p className="mt-2 font-mono text-[0.875rem] text-ink-soft">
              Vorgang {ticket.reference} · Modelljahr {ticket.model.year}
            </p>

            <ul className="mt-7 divide-y divide-line border-y border-line">
              {ticket.positions.map((position) => (
                <li key={position.kind} className="flex items-baseline justify-between gap-6 py-3">
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-medium text-ink-strong">
                      {position.label}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] text-ink-soft">
                      {position.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[0.9375rem] text-ink-strong">
                      {position.price === 0 ? "kostenlos" : formatEuro(position.price)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[0.75rem] text-ink-faint">
                      {formatMinutes(position.minutes)}
                    </span>
                  </span>
                </li>
              ))}
              {ticket.positions.length === 0 ? (
                <li className="py-3 text-[0.9375rem] text-ink-soft">
                  Keine Position gewählt – wir beginnen mit der kostenlosen Diagnose.
                </li>
              ) : null}
            </ul>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="text-[0.9375rem] font-medium text-ink-strong">Festpreis gesamt</span>
              <span className="font-mono text-3xl font-semibold tracking-tight text-ink-strong">
                {formatEuro(ticket.total)}
              </span>
            </div>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
              Arbeitszeit {formatMinutes(ticket.minutes)} · inklusive Einbau und{" "}
              {site.warrantyMonths} Monaten Garantie auf Teil und Arbeit ·
              Zahlung erst nach der Reparatur.
            </p>
          </div>

          {/* QR – dunkel auf hell, in eigener Fläche, damit er in jedem
              Theme scanbar bleibt */}
          <div className="flex flex-col items-center gap-3 md:w-[200px]">
            <div className="rounded-[var(--radius-m)] border border-line bg-white p-3">
              <QrCode
                value={shareUrl}
                size={168}
                label={`QR-Code zum Vorgang ${ticket.reference}`}
              />
            </div>
            <p className="max-w-[200px] text-center text-[0.75rem] leading-relaxed text-ink-soft">
              Am Tresen vorzeigen – wir haben Ihren Voranschlag sofort auf dem
              Schirm, ohne Nachfragen.
            </p>
          </div>
        </div>

        {/* Aktionen – auf Papier sinnlos.

            Drucken, Teilen und Kalender bleiben auf diesem Gerät und
            brauchen deshalb keine Einwilligung. Die Terminanfrage per
            WhatsApp verlässt es – für sie gilt die Regel der Website:
            erst zustimmen, dann senden. */}
        <div
          className="border-t border-line bg-sunken px-6 py-4 md:px-8"
          data-print="hide"
        >
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => window.print()} className={actionClass}>
              <Icon name="check" size={16} />
              Protokoll drucken
            </button>
            <button type="button" onClick={share} className={actionClass}>
              <Icon name="arrow-up-right" size={16} />
              {copied ? "Link kopiert" : "Ticket teilen"}
            </button>
            <button type="button" onClick={downloadIcs} className={actionClass}>
              <Icon name="calendar" size={16} />
              In den Kalender
            </button>
            {/* Bewusst ein Knopf, kein Verweis.

                Als `<a href="https://wa.me/…?text=…">` trüge die Adresse die
                fertige Nachricht schon vor der Einwilligung – und ein Klick
                mit der mittleren Maustaste, „In neuem Tab öffnen" oder
                „Link kopieren" ginge an jeder Prüfung im JavaScript vorbei.
                Die Adresse entsteht deshalb erst, wenn der Haken sitzt. */}
            <button
              type="button"
              onClick={() => {
                if (!consent.allow()) return;
                window.open(
                  `${site.whatsappHref}?text=${whatsappText}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              {...consent.sendProps("quiet")}
              className={actionClass}
            >
              <Icon name="phone" size={16} />
              Termin per WhatsApp
            </button>
          </div>
          <ConsentGate
            {...consent.gate}
            channel="whatsapp"
            /* Kein Server hört hier mit – der Name im Formular wäre
               eine Zusage, die niemand einlöst. */
            name=""
            className="mt-4 max-w-2xl"
          />
        </div>
      </div>

      {/* ---- Übergabeprotokoll ----------------------------------------- */}
      <section className="mt-14 md:mt-20">
        <div data-print="hide">
          <p className="text-eyebrow">Übergabeprotokoll</p>
          <h2 className="text-headline mt-3 max-w-2xl">
            Was vorher geklärt ist,
            <br />
            wird hinterher nicht diskutiert.
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-ink-soft">
            Füllen Sie aus, was Sie festhalten möchten, und drucken Sie das
            Blatt aus – oder lassen Sie es leer und wir machen es gemeinsam am
            Tresen. Beides ist in Ordnung.
          </p>
          <p className="mt-4 flex max-w-xl items-start gap-2.5 rounded-[var(--radius-m)] border border-line bg-sunken p-4 text-[0.875rem] leading-relaxed text-ink-soft">
            <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-positive" />
            <span>
              Alles auf diesem Blatt bleibt in Ihrem Browser. Es wird nicht
              gesendet, nicht gespeichert – auch nicht lokal – und ist
              verschwunden, sobald Sie den Tab schließen. Drucken Sie es, wenn
              Sie es behalten wollen.
              {/* Sobald es die Anmeldung gibt, stimmt der Satz oben nur noch
                  mit dieser Ergänzung: Sie ist die eine Ausnahme, und sie
                  passiert nie nebenbei. */}
              {hasTicketBackend() ? (
                <>
                  {" "}
                  Die einzige Ausnahme ist die Anmeldung ganz unten – dort
                  übertragen Sie ausdrücklich die Angaben, die in jenem
                  Abschnitt noch einmal aufgeführt sind. Vom Blatt hier geht
                  nichts mit.
                </>
              ) : null}
            </span>
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Linke Spalte: Person, IMEI, Zubehör */}
          <div className="space-y-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name">
                <input
                  className={inputClass}
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Vor- und Nachname"
                  autoComplete="name"
                />
              </Field>
              <Field label="Telefon" hint="für die Fertigmeldung">
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobil oder Festnetz"
                  type="tel"
                  autoComplete="tel"
                />
              </Field>
            </div>

            {/* IMEI mit offengelegter Prüfung */}
            <div>
              <Field label="IMEI" hint="auf dem Gerät mit *#06# abrufbar">
                <input
                  className={`${inputClass} font-mono ${
                    imeiInfo.verdict === "pruefziffer-falsch"
                      ? "border-[var(--danger)]"
                      : imeiInfo.verdict === "gueltig"
                        ? "border-[var(--positive)]"
                        : ""
                  }`}
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="15 Ziffern"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-describedby="imei-status"
                />
              </Field>
              {/* Der Hinweis am Feld sagt bereits, wo die Nummer steht –
                  solange nichts eingegeben ist, bleibt es still. */}
              {imeiInfo.verdict === "leer" ? null : (
                <p
                  id="imei-status"
                  className={`mt-2 flex items-start gap-2 text-[0.8125rem] leading-relaxed ${
                    imeiInfo.verdict === "gueltig"
                      ? "text-positive"
                      : imeiInfo.verdict === "pruefziffer-falsch"
                        ? "text-[var(--danger)]"
                        : "text-ink-soft"
                  }`}
                  role="status"
                >
                  {imeiInfo.verdict === "gueltig" ? (
                    <Icon name="check" size={15} className="mt-0.5 shrink-0" />
                  ) : null}
                  {imeiInfo.message}
                </p>
              )}

              {/* Die Rechnung, nicht nur das Urteil */}
              {imeiInfo.steps.length > 0 ? (
                <details className="mt-3 rounded-[var(--radius-m)] border border-line bg-sunken px-4 py-3">
                  <summary className="cursor-pointer text-[0.8125rem] font-medium text-ink-strong">
                    Wie diese Prüfung funktioniert
                  </summary>
                  <div className="mt-3 text-[0.8125rem] leading-relaxed text-ink-soft">
                    <p>
                      Die letzte Ziffer ist eine Prüfziffer. Jede zweite Stelle
                      von rechts wird verdoppelt, bei zweistelligem Ergebnis
                      wird die Quersumme genommen. Alles zusammen ergibt{" "}
                      <span className="font-mono text-ink-strong">{imeiInfo.sum}</span>
                      {" – "}auf das nächste Vielfache von zehn fehlen{" "}
                      <span className="font-mono text-ink-strong">
                        {imeiInfo.expectedCheckDigit}
                      </span>
                      .
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {imeiInfo.steps.map((step, i) => (
                        <span
                          key={i}
                          className={`inline-flex min-w-[2.1rem] flex-col items-center rounded-[6px] border px-1 py-1 font-mono text-[0.6875rem] ${
                            step.doubled
                              ? "border-accent/40 bg-accent-subtle text-accent"
                              : "border-line bg-raised text-ink-soft"
                          }`}
                          title={step.doubled ? "verdoppelt" : "unverändert"}
                        >
                          <span>{step.digit}</span>
                          <span className="text-ink-faint">{step.contribution}</span>
                        </span>
                      ))}
                      <span className="inline-flex min-w-[2.1rem] flex-col items-center rounded-[6px] border border-line-strong bg-raised px-1 py-1 font-mono text-[0.6875rem] text-ink-strong">
                        <span>{imeiInfo.expectedCheckDigit}</span>
                        <span className="text-ink-faint">P</span>
                      </span>
                    </div>
                    <p className="mt-3">
                      Geben Sie Ihre IMEI niemals öffentlich weiter – in
                      Kleinanzeigen, Foren oder sozialen Netzwerken. Sie
                      identifiziert Ihr Gerät eindeutig und wird für Sperren
                      und Garantieanfragen verwendet.
                    </p>
                  </div>
                </details>
              ) : null}
            </div>

            <fieldset>
              <legend className="mb-2.5 text-[0.875rem] font-medium text-ink-strong">
                Mitgegeben
              </legend>
              <div className="flex flex-wrap gap-2">
                {accessories.map((item) => {
                  const on = taken.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAccessory(item)}
                      aria-pressed={on}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] transition-colors duration-[var(--duration-fast)] ${
                        on
                          ? "border-accent bg-accent-subtle font-medium text-accent"
                          : "border-line text-ink-soft hover:border-ink-faint hover:text-ink-strong"
                      }`}
                    >
                      {on ? <Icon name="check" size={13} /> : null}
                      {item}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[0.8125rem] text-ink-soft">
                Nehmen Sie SIM- und Speicherkarte lieber mit. Wir brauchen sie
                für keine Reparatur.
              </p>
            </fieldset>

            <fieldset>
              <legend className="mb-2.5 text-[0.875rem] font-medium text-ink-strong">
                Gerätesperre
              </legend>
              <div className="space-y-2">
                {lockOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer gap-3 rounded-[var(--radius-m)] border p-3.5 transition-colors duration-[var(--duration-fast)] ${
                      lock === option.id
                        ? "border-accent bg-accent-subtle"
                        : "border-line bg-raised hover:border-ink-faint"
                    }`}
                  >
                    <input
                      type="radio"
                      name="lock"
                      className="mt-1 accent-[var(--accent)]"
                      checked={lock === option.id}
                      onChange={() => setLock(option.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.875rem] font-medium text-ink-strong">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-soft">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Rechte Spalte: Schadenskarte, Bestätigungen, Notizen */}
          <div className="space-y-7">
            <div
              className="rounded-[var(--radius-l)] border border-line bg-raised p-5 md:p-6"
              data-print-keep
            >
              <p className="text-[0.875rem] font-medium text-ink-strong">
                Zustand bei Übergabe
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft" data-print="hide">
                Halten Sie fest, was schon vorher da war. Das schützt Sie – und
                uns.
              </p>
              <div className="mt-4">
                <DamageMap
                  marks={marks}
                  active={activeKind}
                  onActiveChange={setActiveKind}
                  onAdd={addMark}
                  onRemove={removeMark}
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2.5 text-[0.875rem] font-medium text-ink-strong">
                Vor der Abgabe erledigt
              </legend>
              <div className="space-y-2">
                {[
                  {
                    checked: backupDone,
                    set: setBackupDone,
                    label: "Datensicherung angelegt",
                    detail:
                      "Wir arbeiten datenschonend, aber keine Reparatur ist eine Garantie gegen Datenverlust.",
                  },
                  {
                    checked: findMyOff,
                    set: setFindMyOff,
                    label: "Gerätesuche deaktiviert",
                    detail:
                      "„Wo ist?“ bzw. „Mein Gerät finden“ sperrt sonst die Funktionsprüfung nach dem Einbau.",
                  },
                ].map((row) => (
                  <label
                    key={row.label}
                    className="flex cursor-pointer gap-3 rounded-[var(--radius-m)] border border-line bg-raised p-3.5 transition-colors duration-[var(--duration-fast)] hover:border-ink-faint"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[var(--accent)]"
                      checked={row.checked}
                      onChange={(e) => row.set(e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.875rem] font-medium text-ink-strong">
                        {row.label}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-soft">
                        {row.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Anmerkungen" hint="optional">
              <textarea
                className="min-h-[7rem] w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-strong placeholder:text-ink-faint transition-colors focus:border-accent"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Wann tritt der Fehler auf? Gab es einen Sturz, Wasser, eine Vorreparatur?"
              />
            </Field>
          </div>
        </div>

        {/* Zusammenfassung des Protokolls – vor allem für den Ausdruck */}
        <div
          className="mt-12 rounded-[var(--radius-l)] border border-line bg-sunken p-6 md:p-8"
          data-print-keep
        >
          <p className="text-[0.875rem] font-medium text-ink-strong">
            Zusammenfassung
          </p>
          <dl className="mt-4 grid gap-x-10 gap-y-3 text-[0.875rem] sm:grid-cols-2">
            {[
              ["Vorgang", ticket.reference],
              ["Gerät", `${ticket.brand.name} ${ticket.model.name}`],
              ["Leistungen", ticket.positions.map((p) => p.label).join(", ") || "Diagnose"],
              ["Festpreis", formatEuro(ticket.total)],
              ["Name", holder || "—"],
              ["Telefon", phone || "—"],
              ["IMEI", imeiInfo.verdict === "gueltig" ? imeiInfo.formatted : imei ? `${imeiInfo.formatted} (Prüfziffer offen)` : "—"],
              ["Mitgegeben", taken.length > 0 ? taken.join(", ") : "nichts"],
              ["Gerätesperre", lockOptions.find((o) => o.id === lock)!.label],
              [
                "Vorschäden",
                marks.length > 0
                  ? marks
                      .map(
                        (m) =>
                          `${m.id} ${markKinds.find((k) => k.id === m.kind)!.label} (${
                            m.side === "front" ? "vorn" : "hinten"
                          })`,
                      )
                      .join(", ")
                  : "keine markiert",
              ],
              ["Datensicherung", backupDone ? "bestätigt" : "offen"],
              ["Gerätesuche", findMyOff ? "deaktiviert" : "offen"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="text-right font-medium text-ink-strong">{value}</dd>
              </div>
            ))}
          </dl>
          {notes ? (
            <div className="mt-5">
              <p className="text-[0.875rem] text-ink-soft">Anmerkungen</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-strong">
                {notes}
              </p>
            </div>
          ) : null}

          <p className="mt-6 border-t border-line pt-4 text-[0.75rem] leading-relaxed text-ink-soft">
            Dieser Voranschlag ist unverbindlich und ersetzt keine Diagnose.
            Zeigt sich beim Öffnen ein weiterer Defekt, sagen wir Bescheid,
            bevor wir weiterarbeiten – und Sie entscheiden neu. Preisstand zum
            Zeitpunkt des Aufrufs.
          </p>
        </div>

        <SignatureLines />

        {/* Der Link im Klartext – für alle, die ihn abtippen oder ablegen */}
        <p className="mt-8 break-all text-center font-mono text-[0.75rem] text-ink-faint">
          {shareUrl}
        </p>
      </section>

      {/* ---- Anmeldung ------------------------------------------------
          Erscheint nur, wo es eine Vorgangsverwaltung gibt. Die Felder
          sind aus dem Protokoll vorbelegt, übertragen wird trotzdem nur,
          was dort steht – und erst nach Zustimmung. */}
      <TicketRegistration
        ticket={ticket}
        prefill={{ name: holder, phone, imei, notes }}
      />
    </div>
  );
}
