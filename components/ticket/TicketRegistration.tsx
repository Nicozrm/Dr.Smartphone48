"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { QrCode } from "@/components/ui/QrCode";
import { ConsentGate, useConsentGate } from "@/components/ui/ConsentGate";
import { registerTicket } from "@/lib/api/client";
import { hasTicketBackend } from "@/lib/supabase/env";
import { statusPath, statusUrl } from "@/lib/tickets/links";
import { CONTACT_CHANNELS, type ContactChannel } from "@/lib/tickets/types";
import type { FieldIssue } from "@/lib/tickets/validate";
import type { Ticket } from "@/lib/ticket";
import { formatEuro } from "@/lib/format";
import { site } from "@/lib/site";

/*
  Die Anmeldung – die Stelle, an der aus einem Ticket ein Vorgang wird.

  Bis hierher hat diese Website über einen Besucher nichts gespeichert, und
  das ist eine Zusage, die auf der Ticketseite ausdrücklich steht. Hier wird
  sie überschritten – deshalb ist dieser Abschnitt vom Übergabeprotokoll
  darüber sichtbar getrennt und sagt in eigenen Worten, was passiert:

  – **Was übertragen wird, steht als Liste da**, bevor gedrückt wird. Nicht in
    der Datenschutzerklärung, nicht in einer Fußnote: an der Schaltfläche.
  – **Das Protokoll oben bleibt draußen.** Schadenskarte, Zubehör, Sperrcode,
    die Häkchen – nichts davon wird gesendet. Was übertragen wird, steht in
    genau diesen Feldern hier.
  – **Es gilt die Regel der Website**: erst zustimmen, dann senden. Die Sperre
    sitzt in `consent.allow()`, nicht in der Optik der Schaltfläche.

  Ohne eingerichtetes Backend erscheint der Abschnitt gar nicht. Ein Formular,
  das nirgendwo ankommt, wäre schlimmer als keins.
*/

const channelLabels: Record<ContactChannel, { label: string; detail: string }> = {
  none: {
    label: "Keine Nachrichten",
    detail: "Sie schauen selbst nach oder wir rufen an, wenn es nötig ist.",
  },
  email: {
    label: "E-Mail",
    detail: "Eine Nachricht bei Annahme, bei Wartezeit und bei Fertigstellung.",
  },
  whatsapp: {
    label: "WhatsApp",
    detail: "Dieselben drei Nachrichten an Ihre Mobilnummer.",
  },
  sms: {
    label: "SMS",
    detail: "Dieselben drei Nachrichten – auch ohne Internet auf dem Gerät.",
  },
};

const inputClass =
  "h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint transition-colors duration-[var(--duration-fast)] focus:border-accent";

export function TicketRegistration({
  ticket,
  /** Vorbelegung aus dem Protokoll darüber – gesendet wird trotzdem nur, was hier steht. */
  prefill,
}: {
  ticket: Ticket;
  prefill?: { name?: string; phone?: string; imei?: string; notes?: string };
}) {
  const [customer, setCustomer] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [email, setEmail] = useState("");
  const [imei, setImei] = useState(prefill?.imei ?? "");
  const [note, setNote] = useState(prefill?.notes ?? "");
  const [channel, setChannel] = useState<ContactChannel>("none");
  const [state, setState] = useState<"idle" | "sendet" | "fertig">("idle");
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const consent = useConsentGate();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const issueFor = useMemo(
    () => (field: string) => issues.find((issue) => issue.field === field)?.message,
    [issues],
  );

  // Ohne Server oder ohne Projekt gibt es nichts anzumelden.
  if (!hasTicketBackend()) return null;

  if (state === "fertig" && code) {
    return <Registered ticketCode={code} origin={origin} />;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Erste Zeile im Absendepfad – vor jedem Netzwerkaufruf.
    if (!consent.allow()) return;

    setState("sendet");
    setIssues([]);
    setError("");

    const result = await registerTicket({
      query: ticket.query,
      customer: customer.trim(),
      phone: phone.trim(),
      email: email.trim(),
      imei: imei.trim(),
      customerNote: note.trim(),
      contactChannel: channel,
      consent: true,
    });

    if (result.ok && result.data.ticketCode) {
      setCode(result.data.ticketCode);
      setState("fertig");
      consent.reset();
      return;
    }

    setState("idle");
    if (!result.ok) {
      setIssues(result.issues ?? []);
      setError(result.issues?.length ? "" : result.error);
    }
  };

  return (
    <section className="mt-14 md:mt-20" data-print="hide">
      <p className="text-eyebrow">Vorgang anmelden</p>
      <h2 className="text-headline mt-3 max-w-2xl">
        Damit Sie sehen können,
        <br />
        wo Ihr Gerät gerade ist.
      </h2>
      <p className="mt-5 max-w-xl leading-relaxed text-ink-soft">
        Sie bekommen eine Vorgangsnummer und eine Seite, die sich von selbst
        aktualisiert – vom Eingang bis zur Abholung. Freiwillig: Ohne Anmeldung
        funktioniert alles wie bisher, Sie kommen einfach vorbei.
      </p>

      <form
        onSubmit={submit}
        className="mt-10 rounded-[var(--radius-l)] border border-line bg-raised p-6 md:p-8"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={issueFor("customer")} id="anm-name">
            <input
              id="anm-name"
              className={inputClass}
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              autoComplete="name"
              placeholder="Vor- und Nachname"
            />
          </Field>
          <Field label="Telefon" error={issueFor("phone")} id="anm-tel">
            <input
              id="anm-tel"
              className={inputClass}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
              placeholder="Mobil oder Festnetz"
            />
          </Field>
          <Field label="E-Mail" hint="optional" error={issueFor("email")} id="anm-mail">
            <input
              id="anm-mail"
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="fuer die Fertigmeldung"
            />
          </Field>
          <Field label="IMEI" hint="optional" error={issueFor("imei")} id="anm-imei">
            <input
              id="anm-imei"
              className={`${inputClass} font-mono`}
              value={imei}
              onChange={(event) => setImei(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="15 Ziffern"
            />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Anmerkung" hint="optional" id="anm-notiz">
            <textarea
              id="anm-notiz"
              className="min-h-[5.5rem] w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-strong placeholder:text-ink-faint transition-colors focus:border-accent"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Wann tritt der Fehler auf? Gab es einen Sturz, Wasser, eine Vorreparatur?"
            />
          </Field>
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2.5 text-[0.875rem] font-medium text-ink-strong">
            Sollen wir uns melden?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTACT_CHANNELS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer gap-3 rounded-[var(--radius-m)] border p-3.5 transition-colors duration-[var(--duration-fast)] ${
                  channel === option
                    ? "border-accent bg-accent-subtle"
                    : "border-line hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="kanal"
                  className="mt-1 accent-[var(--accent)]"
                  checked={channel === option}
                  onChange={() => setChannel(option)}
                />
                <span className="min-w-0">
                  <span className="block text-[0.875rem] font-medium text-ink-strong">
                    {channelLabels[option].label}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-soft">
                    {channelLabels[option].detail}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Was übertragen wird – vor der Schaltfläche, nicht danach. */}
        <div className="mt-7 rounded-[var(--radius-m)] border border-line bg-sunken p-4">
          <p className="text-[0.875rem] font-medium text-ink-strong">
            Das wird gespeichert
          </p>
          <ul className="mt-2.5 space-y-1 text-[0.8125rem] leading-relaxed text-ink-soft">
            <li>
              Gerät und Auftrag: {ticket.brand.name} {ticket.model.name},{" "}
              {ticket.positions.map((position) => position.label).join(", ") || "Diagnose"} ·{" "}
              {formatEuro(ticket.total)}
            </li>
            <li>Ihre Angaben aus den Feldern oben – nicht mehr.</li>
            <li>
              Nicht übertragen wird das Übergabeprotokoll darüber:
              Schadenskarte, Zubehör, Sperrcode und Häkchen bleiben in Ihrem
              Browser.
            </li>
          </ul>
          <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
            Einzelheiten – auch zur Aufbewahrung und zum Widerruf – stehen in
            der{" "}
            <Link href="/datenschutz" className="text-accent hover:underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>

        <ConsentGate {...consent.gate} channel="mail" name="" className="mt-4" />

        {error ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 text-[0.875rem] leading-relaxed"
            style={{ color: "var(--danger)" }}
          >
            <Icon name="close" size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <button
          type="submit"
          {...consent.sendProps()}
          className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          {state === "sendet" ? "Wird angemeldet …" : "Vorgang anmelden"}
          <Icon name="arrow-right" size={17} />
        </button>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-faint">{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p
          className="mt-1.5 text-[0.8125rem] leading-relaxed"
          style={{ color: "var(--danger)" }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Nach der Anmeldung: die Nummer, der QR-Code zur Statusseite und ein
 * deutlicher Hinweis, dass beides zusammen der Zugang ist.
 */
function Registered({ ticketCode, origin }: { ticketCode: string; origin: string }) {
  const url = statusUrl(ticketCode, origin);

  return (
    <section className="mt-14 md:mt-20" data-print-keep>
      <div className="rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-raised md:p-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="min-w-0">
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--positive-subtle)", color: "var(--positive)" }}
            >
              <Icon name="check" size={22} />
            </span>
            <h2 className="text-headline mt-5">Angemeldet.</h2>
            <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
              Ihre Vorgangsnummer – bitte notieren oder diese Seite ausdrucken.
              Mit ihr sehen Sie jederzeit, wo Ihr Gerät steht.
            </p>

            <p className="mt-6 font-mono text-3xl font-semibold tracking-[0.06em] text-ink-strong">
              {ticketCode}
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5" data-print="hide">
              <Link
                href={statusPath(ticketCode)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Status ansehen
                <Icon name="arrow-right" size={16} />
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4.5 text-[0.875rem] font-medium text-ink-strong transition-colors hover:border-ink-strong"
              >
                <Icon name="check" size={16} />
                Protokoll drucken
              </button>
            </div>

            <p className="mt-6 max-w-md text-[0.8125rem] leading-relaxed text-ink-soft">
              Wer diesen Link hat, sieht den Zustand Ihres Vorgangs – Name,
              Telefonnummer und IMEI stehen dort nicht. Bringen Sie das Gerät
              vorbei, wann es Ihnen passt: {site.openingHoursShort}.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 md:w-[200px]">
            <div className="rounded-[var(--radius-m)] border border-line bg-white p-3">
              <QrCode
                value={url}
                size={168}
                label={`QR-Code zum Status von Vorgang ${ticketCode}`}
              />
            </div>
            <p className="max-w-[200px] text-center text-[0.75rem] leading-relaxed text-ink-soft">
              Scannen und den Stand der Reparatur sehen – ohne Konto, ohne App.
            </p>
          </div>
        </div>

        <p className="mt-8 break-all border-t border-line pt-5 text-center font-mono text-[0.75rem] text-ink-faint">
          {url}
        </p>
      </div>
    </section>
  );
}
