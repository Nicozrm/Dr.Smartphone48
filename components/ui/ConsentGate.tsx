"use client";

import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/site";

/*
  Die Einwilligung – eine Regel, an genau einer Stelle.

  Regel dieser Website: Kein Auftrag und keine Anfrage verlässt das Gerät
  eines Besuchers, solange nicht zwei bewusste Handlungen vorliegen – der
  Haken an der Datenschutzerklärung und der Druck auf „Senden". Kein
  Versand nebenbei, kein vorausgewählter Haken, keine Zustimmung durch
  Weiterklicken. Das ist die Bedingung, unter der eine Einwilligung nach
  Art. 4 Nr. 11 DSGVO überhaupt eine ist.

  Damit die Regel nicht an einem Formular hängt, das jemand beim nächsten
  Umbau übersieht, wohnt sie hier statt viermal im Markup:

    const consent = useConsentGate();
    …
    <ConsentGate {...consent.gate} channel="mail" />
    <button {...consent.sendProps()} type="submit">Anfrage senden</button>

  und im Absendepfad als erste Zeile:

    if (!consent.allow()) return;

  `allow()` ist die eigentliche Sperre. Die zurückgenommene Schaltfläche ist
  nur ihre sichtbare Seite: Sie bleibt bedienbar und beantwortet den Druck
  mit dem Grund, statt tot zu sein. Ein `disabled`-Knopf nimmt sich aus der
  Tabulatorreihenfolge und erklärt nichts – wer nicht sieht, woran es liegt,
  hält die Seite für kaputt.

  Auch `aria-disabled` steht bewusst nicht dort. Es hieße „wahrnehmbar, aber
  nicht bedienbar" – und genau das stimmt hier nicht: Der Druck ist der Weg
  zur Erklärung. Werkzeuge nehmen die Angabe wörtlich (Playwright verweigert
  den Klick darauf), Vorlesehilfen kündigen den Knopf als abgeblendet an, und
  am Ende steht eine Schaltfläche, die nach außen tot ist und trotzdem
  reagiert. Stattdessen: ein kurzer Satz per `aria-describedby`, der die
  Bedingung nennt, solange sie offen ist.
*/

/** Wohin die Anfrage geht – ein Satz je Weg, nachprüfbar formuliert. */
const destinations = {
  /** Kontaktformular, Terminanfrage, Ankauf – alles landet im selben Postfach. */
  mail: (
    <>
      Die Anfrage geht ausschließlich an {site.name}: als E-Mail an{" "}
      <span className="whitespace-nowrap">{site.email}</span>, das Postfach
      des Betriebs bei Google (Gmail). Einsehen kann sie dort nur{" "}
      {site.name} – weitergegeben wird sie an niemanden.
    </>
  ),
  /** Terminanfrage aus dem Ticket heraus. */
  whatsapp: (
    <>
      Die Anfrage geht als WhatsApp-Nachricht an {site.phone} und wird nur
      von {site.name} gelesen. Für den Transport gelten zusätzlich die
      Datenschutzbestimmungen von WhatsApp.
    </>
  ),
} satisfies Record<string, ReactNode>;

export type ConsentChannel = keyof typeof destinations;

type GateProps = {
  id: string;
  accepted: boolean;
  reminded: boolean;
  onAccept: (next: boolean) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

/**
 * Zustand und Sperre für eine Absendestelle.
 *
 * Eine Instanz je Formular – die Kennung kommt aus `useId()`, damit zwei
 * Werkzeuge auf einer Seite sich nicht die Beschriftung teilen.
 */
export function useConsentGate() {
  const id = useId();
  const [accepted, setAccepted] = useState(false);
  const [reminded, setReminded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onAccept = (next: boolean) => {
    setAccepted(next);
    if (next) setReminded(false);
  };

  /**
   * Vor jedem Versand aufrufen. `false` heißt: Es geht nichts raus.
   *
   * Der Fokus wandert dabei auf den Haken, nicht nur die Meldung erscheint.
   * Wer per Tastatur arbeitet oder vorlesen lässt, steht sonst vor einer
   * Schaltfläche, die nichts tut, und findet die Ursache nicht.
   */
  const allow = () => {
    if (accepted) return true;
    setReminded(true);
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  };

  /** Nach dem Versand: Die nächste Anfrage braucht ihre eigene Einwilligung. */
  const reset = () => {
    setAccepted(false);
    setReminded(false);
  };

  return {
    accepted,
    allow,
    reset,
    /** An `<ConsentGate>` weiterreichen. */
    gate: { id, accepted, reminded, onAccept, inputRef } satisfies GateProps,
    /**
     * An die Absende-Schaltfläche weiterreichen. Sie bleibt bedienbar; die
     * Sperre sitzt in `allow()`. Solange der Haken fehlt, nennt
     * `aria-describedby` die Bedingung, und `data-consent-pending` nimmt
     * die Fläche optisch zurück.
     *
     * `look` sagt nur, wie der wartende Zustand aussehen soll: `fill` für
     * die gefüllte Akzentfläche, `quiet` für einen Knopf mit Rand. Beide
     * Varianten stehen in globals.css und sind auf Kontrast gemessen.
     */
    sendProps: (look: "fill" | "quiet" = "fill") => ({
      "aria-describedby": accepted ? undefined : `${id}-regel`,
      "data-consent-pending": accepted ? undefined : look,
    }),
  };
}

/**
 * Haken, Ziel und – falls jemand zu früh drückt – der Hinweis.
 *
 * `name="consent"` wird mitgeschickt, wo ein Server mithört: Der
 * Endpunkt in `app/api/kontakt` prüft dieselbe Zustimmung ein zweites
 * Mal. Was nur im Browser geprüft wird, ist nicht geprüft.
 */
export function ConsentGate({
  id,
  accepted,
  reminded,
  onAccept,
  inputRef,
  channel = "mail",
  name = "consent",
  error,
  className = "",
}: GateProps & {
  channel?: ConsentChannel;
  /** Feldname für den Versand. Leer, wo kein Server mithört. */
  name?: string;
  /** Meldung vom Server, falls die Zustimmung dort fehlte. */
  error?: string;
  className?: string;
}) {
  const zielId = `${id}-ziel`;
  const hinweisId = `${id}-hinweis`;
  const meldung = error ?? (reminded ? "Bitte zuerst zustimmen – erst danach lässt sich die Anfrage senden." : null);

  return (
    <div
      className={`rounded-[var(--radius-m)] border bg-sunken p-4 transition-colors duration-[var(--duration-fast)] ${
        meldung ? "border-[var(--danger)]" : "border-line"
      } ${className}`}
      data-print="hide"
    >
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          ref={inputRef}
          id={id}
          name={name || undefined}
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAccept(e.target.checked)}
          aria-describedby={meldung ? `${zielId} ${hinweisId}` : zielId}
          aria-invalid={meldung ? true : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span className="text-[0.875rem] leading-relaxed text-ink-soft">
          Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser
          Anfrage verarbeitet werden. Es gilt die{" "}
          <Link href="/datenschutz" className="text-accent hover:underline">
            Datenschutzerklärung
          </Link>
          ; die Einwilligung lässt sich jederzeit formlos widerrufen.
        </span>
      </label>

      <p
        id={zielId}
        className="mt-3 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-soft"
      >
        <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-positive" />
        <span>{destinations[channel]}</span>
      </p>

      {/* Die Bedingung in einem Satz – die Absende-Schaltfläche verweist
          darauf, solange der Haken fehlt. Sichtbar steht sie schon oben;
          eine Vorlesehilfe hört sie sonst erst, wenn sie zu spät ist. */}
      {accepted ? null : (
        <p id={`${id}-regel`} className="sr-only">
          Erst zustimmen, dann senden.
        </p>
      )}

      {meldung ? (
        <p
          id={hinweisId}
          role="alert"
          className="mt-2.5 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed"
          style={{ color: "var(--danger)" }}
        >
          <Icon name="close" size={15} className="mt-0.5 shrink-0" />
          <span>{meldung}</span>
        </p>
      ) : null}
    </div>
  );
}
