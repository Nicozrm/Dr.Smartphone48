"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CertificateSeal } from "./CertificateSeal";
import { CheckpointGrid, summarize } from "./CheckpointGrid";
import { Button } from "@/components/ui/Button";
import {
  bindingMatches,
  deviceBinding,
  importPublicKey,
  normalizeImei,
  verify,
} from "@/lib/cert/crypto";
import {
  BINDING_BYTES,
  decodeCertificate,
  fromBase64Url,
  type ParsedCertificate,
} from "@/lib/cert/format";
import { fingerprint } from "@/lib/cert/glyph";
import { certKeys, findKey, type CertKey } from "@/lib/cert/keys";
import { loadKey } from "@/lib/cert/store";
import { checkpointCount } from "@/lib/data/inspection";
import { repairMeta } from "@/lib/data/devices";
import { site } from "@/lib/site";

/** Woher der öffentliche Schlüssel stammt, mit dem geprüft wurde. */
type KeySource = "veroeffentlicht" | "lokal";

type State =
  | { phase: "leer" }
  | { phase: "pruefe" }
  | { phase: "unlesbar"; reason: string }
  | {
      phase: "fertig";
      parsed: ParsedCertificate;
      /** Fehlt, wenn zum Schlüssel im Beleg keine öffentliche Hälfte vorliegt. */
      key: CertKey | null;
      source: KeySource | null;
      valid: boolean;
    };

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

export function VerifyView() {
  const [state, setState] = useState<State>({ phase: "leer" });
  const [entry, setEntry] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  /* ---- Prüfung ---------------------------------------------------------- */

  const check = useCallback(async (code: string) => {
    setState({ phase: "pruefe" });
    try {
      const parsed = decodeCertificate(code, checkpointCount);

      // Erst der veröffentlichte Schlüsselring. Nur wenn dort nichts steht,
      // zählt ein Schlüssel, den dieser Browser selbst erzeugt hat – das ist
      // der Einrichtungsfall in der Werkstatt und wird auch so benannt.
      let raw: Uint8Array | null = null;
      let key: CertKey | null = findKey(parsed.certificate.keyId) ?? null;
      let source: KeySource | null = null;

      if (key) {
        raw = fromBase64Url(key.publicKey);
        source = "veroeffentlicht";
      } else {
        const local = loadKey();
        if (local && local.id === parsed.certificate.keyId) {
          raw = fromBase64Url(local.publicKey);
          source = "lokal";
          key = {
            id: local.id,
            publicKey: local.publicKey,
            since: local.createdAt.slice(0, 10),
            note: "Nur diesem Browser bekannt – noch nicht veröffentlicht.",
          };
        }
      }

      if (!raw) {
        setState({ phase: "fertig", parsed, key: null, source: null, valid: false });
        return;
      }

      const publicKey = await importPublicKey(raw);
      const valid = await verify(publicKey, parsed.signature, parsed.signed);
      setState({ phase: "fertig", parsed, key, source, valid });
    } catch (error) {
      setState({
        phase: "unlesbar",
        reason: error instanceof Error ? error.message : "Unbekannter Fehler.",
      });
    }
  }, []);

  /*
    Der Code steht im Fragment der Adresse, nicht in einem Parameter. Das ist
    keine Kosmetik: Ein Fragment wird vom Browser niemals an einen Server
    geschickt. Der Beleg landet damit in keinem Zugriffsprotokoll – weder in
    unserem noch im Protokoll dessen, der diese Seite gerade ausliefert.
  */
  useEffect(() => {
    const read = () => {
      const code = window.location.hash.replace(/^#/, "").trim();
      if (code) {
        setEntry(code);
        void check(code);
      } else {
        setState({ phase: "leer" });
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [check]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const code = entry.trim().replace(/^.*#/, "");
    if (!code) return;
    // Über die Adresse gehen, damit der Beleg teilbar und neu ladbar bleibt.
    window.location.hash = code;
    void check(code);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---- Darstellung ------------------------------------------------------ */

  return (
    <div className="space-y-16">
      <div ref={resultRef} className="scroll-mt-28">
        {state.phase === "leer" ? <Empty /> : null}
        {state.phase === "pruefe" ? <Working /> : null}
        {state.phase === "unlesbar" ? <Unreadable reason={state.reason} /> : null}
        {state.phase === "fertig" ? <Result state={state} /> : null}
      </div>

      <form onSubmit={submit} className="cert-entry">
        <label htmlFor="cert-code" className="text-sm font-medium text-ink-strong">
          Code von Hand eingeben
        </label>
        <p className="mt-1 text-sm text-ink-soft">
          Wenn die Kamera den Code auf dem Beleg nicht liest: Die Zeichenkette
          hinter dem <code className="font-mono text-[0.8em]">#</code> aus der
          gedruckten Adresse hier einfügen.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="cert-code"
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            placeholder="AQEC…"
            className="cert-field flex-1 font-mono text-sm"
          />
          <Button type="submit" variant="secondary">
            Prüfen
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ---- Zustände ----------------------------------------------------------- */

function Empty() {
  return (
    <div className="cert-hero">
      <div className="cert-hero-mark" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none" className="h-full w-full">
          <circle cx="50" cy="50" r="46" stroke="var(--line-strong)" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="43" stroke="var(--line)" strokeWidth="2" />
          <path
            d="M50 26v48M26 50h48"
            stroke="var(--line-strong)"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
        </svg>
      </div>
      <div>
        <p className="text-eyebrow">Kein Beleg geladen</p>
        <h2 className="text-headline mt-4">Scannen Sie den Code auf Ihrem Beleg.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Jede Reparatur bei {site.name} endet mit einem unterschriebenen
          Prüfprotokoll. Der QR-Code darauf führt zurück auf diese Seite – mit
          dem vollständigen Protokoll im Gepäck, in der Adresse selbst.
        </p>
      </div>
    </div>
  );
}

function Working() {
  return (
    <div className="cert-hero">
      <div className="cert-hero-mark cert-pulse" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none" className="h-full w-full">
          <circle cx="50" cy="50" r="43" stroke="var(--accent)" strokeWidth="1.5" />
        </svg>
      </div>
      <div>
        <p className="text-eyebrow">Prüfung läuft</p>
        <h2 className="text-headline mt-4">Unterschrift wird nachgerechnet.</h2>
      </div>
    </div>
  );
}

function Unreadable({ reason }: { reason: string }) {
  return (
    <div className="cert-hero">
      <div className="cert-hero-mark" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none" className="h-full w-full">
          <circle cx="50" cy="50" r="43" stroke="var(--danger)" strokeWidth="1.6" />
          <path d="M35 35l30 30M65 35L35 65" stroke="var(--danger)" strokeWidth="2" />
        </svg>
      </div>
      <div>
        <p className="text-eyebrow text-danger">Nicht lesbar</p>
        <h2 className="text-headline mt-4">Das ist kein Zertifikat dieser Werkstatt.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">{reason}</p>
        <p className="mt-3 text-sm text-ink-faint">
          Häufigster Grund: Beim Kopieren aus der Adresszeile ist ein Stück
          abgeschnitten worden. Der Code endet nie mit einem Punkt oder
          Leerzeichen.
        </p>
      </div>
    </div>
  );
}

function Result({
  state,
}: {
  state: Extract<State, { phase: "fertig" }>;
}) {
  const { parsed, key, source, valid } = state;
  const cert = parsed.certificate;
  const counts = summarize(cert.checks);

  const tone = valid && source === "veroeffentlicht" ? "valid" : valid ? "unknown" : "invalid";

  const headline = !key
    ? "Unterschrieben mit einem unbekannten Schlüssel."
    : !valid
      ? "Dieser Beleg wurde verändert."
      : source === "lokal"
        ? "Gültig – aber nur auf diesem Gerät nachprüfbar."
        : `Unverändert seit dem ${dateFormat.format(cert.issued)}.`;

  const eyebrow = !key
    ? "Schlüssel nicht hinterlegt"
    : !valid
      ? "Prüfung fehlgeschlagen"
      : source === "lokal"
        ? "Einrichtungsmodus"
        : "Unterschrift gültig";

  return (
    <div className="space-y-14">
      <div className="cert-hero">
        <div className="cert-hero-seal">
          <CertificateSeal signature={parsed.signature} tone={tone} />
        </div>
        <div>
          <p
            className={`text-eyebrow ${
              valid && source === "veroeffentlicht"
                ? "text-accent"
                : valid
                  ? ""
                  : "text-danger"
            }`}
          >
            {eyebrow}
          </p>
          <h2 className="text-headline mt-4 text-balance">{headline}</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            {!key ? (
              <>
                Der Beleg nennt Schlüssel&nbsp;#{cert.keyId}. Auf dieser Seite
                ist er nicht veröffentlicht
                {certKeys.length === 0
                  ? " – der Betrieb hat noch keinen Schlüssel hinterlegt."
                  : "."}{" "}
                Ohne die öffentliche Hälfte lässt sich nichts nachrechnen.
              </>
            ) : !valid ? (
              <>
                Die Unterschrift passt nicht zu diesem Inhalt. Entweder wurde
                der Code beim Übertragen beschädigt – oder jemand hat am
                Protokoll etwas geändert, nachdem es unterschrieben war.
              </>
            ) : source === "lokal" ? (
              <>
                Die Unterschrift stimmt. Geprüft wurde sie gegen einen
                Schlüssel, den nur dieser Browser kennt: Er steht noch nicht im
                veröffentlichten Schlüsselring. Auf einem fremden Gerät wäre
                dieser Beleg zurzeit nicht prüfbar.
              </>
            ) : (
              <>
                Das Protokoll unten ist Bit für Bit das, was am
                Ausstellungstag unterschrieben wurde. Hätte irgendjemand
                nachträglich eine Position geändert – auch wir –, stünde hier
                das Gegenteil.
              </>
            )}
          </p>

          <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Fact term="Gerät" value={cert.model} />
            <Fact term="Ausgestellt" value={dateFormat.format(cert.issued)} />
            <Fact
              term="Ausgeführt"
              value={
                cert.repairs.length
                  ? cert.repairs.map((r) => repairMeta[r].label).join(", ")
                  : "keine Angabe"
              }
            />
            <Fact term="Gewährleistung" value={`${cert.warrantyMonths} Monate`} />
            <Fact term="Teilecharge" value={cert.batch || "nicht angegeben"} mono />
            <Fact term="Ausgeführt von" value={cert.technician || "nicht angegeben"} />
          </dl>
        </div>
      </div>

      <Steps parsed={parsed} keyEntry={key} source={source} valid={valid} />

      {valid && key ? <Binding parsed={parsed} /> : null}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 className="text-title">Das unterschriebene Prüfprotokoll</h2>
          <p className="text-sm text-ink-soft tabular-nums">
            {counts.passed} bestanden
            {counts.noted > 0 ? ` · ${counts.noted} mit Befund` : ""}
            {counts.na > 0 ? ` · ${counts.na} nicht zutreffend` : ""}
            {counts.open > 0 ? ` · ${counts.open} offen` : ""}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-faint">
          <Legend sign="✓" className="is-passed" label="bestanden" />
          <Legend sign="!" className="is-noted" label="Befund vermerkt" />
          <Legend sign="·" className="is-na" label="nicht zutreffend" />
          <Legend sign="–" className="is-open" label="nicht geprüft" />
        </div>
        <div className="mt-8">
          <CheckpointGrid checks={cert.checks} />
        </div>
      </section>

      <Bytes parsed={parsed} />
    </div>
  );
}

function Fact({
  term,
  value,
  mono = false,
}: {
  term: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">{term}</dt>
      <dd
        className={`mt-1 text-ink-strong ${mono ? "font-mono text-sm" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Legend({
  sign,
  className,
  label,
}: {
  sign: string;
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`cert-cell ${className}`} aria-hidden="true">
        {sign}
      </span>
      {label}
    </span>
  );
}

/* ---- Die einzelnen Schritte --------------------------------------------- */

function Steps({
  parsed,
  keyEntry,
  source,
  valid,
}: {
  parsed: ParsedCertificate;
  keyEntry: CertKey | null;
  source: KeySource | null;
  valid: boolean;
}) {
  const total = parsed.signed.length + parsed.signature.length;

  return (
    <section>
      <h2 className="text-title">Wie geprüft wurde</h2>
      <ol className="cert-steps mt-6">
        <Step
          ok
          index={1}
          title="Code gelesen"
          detail={`${total} Byte, Formatversion 1. Davon ${parsed.signed.length} Byte Inhalt und 64 Byte Unterschrift.`}
        />
        <Step
          ok={Boolean(keyEntry)}
          index={2}
          title={
            keyEntry
              ? `Schlüssel #${parsed.certificate.keyId} gefunden`
              : `Schlüssel #${parsed.certificate.keyId} nicht gefunden`
          }
          detail={
            keyEntry
              ? `${
                  source === "lokal"
                    ? "Aus dem Speicher dieses Browsers"
                    : "Aus dem veröffentlichten Schlüsselring dieser Website"
                }, in Gebrauch seit ${keyEntry.since}. ${keyEntry.note}`
              : "Ein Beleg lässt sich nur gegen einen Schlüssel prüfen, dessen öffentliche Hälfte vorliegt."
          }
        />
        <Step
          ok={valid && Boolean(keyEntry)}
          index={3}
          title={
            !keyEntry
              ? "Unterschrift nicht prüfbar"
              : valid
                ? "Unterschrift stimmt"
                : "Unterschrift stimmt nicht"
          }
          detail={
            keyEntry
              ? `ECDSA über der Kurve P-256, Streuwert SHA-256. Kurzform: ${fingerprint(
                  parsed.signature,
                )}`
              : "Übersprungen."
          }
        />
      </ol>
    </section>
  );
}

function Step({
  ok,
  index,
  title,
  detail,
}: {
  ok: boolean;
  index: number;
  title: string;
  detail: string;
}) {
  return (
    <li
      className="cert-step"
      data-ok={ok ? "true" : "false"}
      style={{ "--step": index } as React.CSSProperties}
    >
      <span className="cert-step-mark" aria-hidden="true">
        {ok ? "✓" : "✕"}
      </span>
      <div>
        <p className="font-medium text-ink-strong">
          {title}
          <span className="sr-only">{ok ? " – erfüllt" : " – nicht erfüllt"}</span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{detail}</p>
      </div>
    </li>
  );
}

/* ---- Gerätebindung ------------------------------------------------------ */

function Binding({ parsed }: { parsed: ParsedCertificate }) {
  const [imei, setImei] = useState("");
  const [result, setResult] = useState<"offen" | "passt" | "passt-nicht" | "kurz">(
    "offen",
  );

  const compare = async (value: string) => {
    const digits = normalizeImei(value);
    if (digits.length < 14) {
      setResult(digits.length === 0 ? "offen" : "kurz");
      return;
    }
    const binding = await deviceBinding(digits, BINDING_BYTES);
    setResult(bindingMatches(binding, parsed.certificate.binding) ? "passt" : "passt-nicht");
  };

  return (
    <section className="cert-binding">
      <div className="max-w-2xl">
        <h2 className="text-title">Gehört der Beleg zu Ihrem Gerät?</h2>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Im Zertifikat steht nicht Ihre IMEI, sondern vier Byte ihres
          Streuwerts. Daraus lässt sich die Nummer nicht zurückrechnen – auf
          diese vier Byte passen rund 23 000 mögliche IMEIs. Für den Abgleich
          reicht das trotzdem: Ein fremder Beleg trifft zufällig mit einer
          Wahrscheinlichkeit von 1 zu 4,3 Milliarden.
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          Die eingegebene Nummer bleibt in diesem Tab. Sie wird nicht gesendet,
          nicht gespeichert und ist nach dem Schließen weg. Anzeigen lassen
          sich IMEI und Seriennummer mit&nbsp;
          <span className="font-mono">*#06#</span>.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={imei}
            inputMode="numeric"
            autoComplete="off"
            placeholder="15 Ziffern"
            aria-label="IMEI Ihres Geräts"
            onChange={(event) => {
              setImei(event.target.value);
              void compare(event.target.value);
            }}
            className="cert-field flex-1 font-mono tabular-nums"
          />
        </div>

        <p
          className="mt-4 text-sm font-medium"
          role="status"
          data-binding={result}
        >
          {result === "offen"
            ? "Noch keine Nummer eingegeben."
            : result === "kurz"
              ? "Eine IMEI hat 15 Ziffern."
              : result === "passt"
                ? "✓ Dieser Beleg gehört zu diesem Gerät."
                : "✕ Dieser Beleg gehört zu einem anderen Gerät."}
        </p>
      </div>
    </section>
  );
}

/* ---- Der Beleg in Bytes -------------------------------------------------- */

function Bytes({ parsed }: { parsed: ParsedCertificate }) {
  const cert = parsed.certificate;
  return (
    <details className="cert-bytes">
      <summary>Was genau unterschrieben wurde</summary>
      <div className="mt-5 space-y-5 text-sm leading-relaxed text-ink-soft">
        <p>
          Unterschrieben wurden genau diese {parsed.signed.length} Byte – nicht
          die Darstellung oben, sondern der Datensatz darunter. Die Darstellung
          entsteht daraus beim Lesen.
        </p>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Inhalt
          </p>
          <pre className="cert-hex">{hex(parsed.signed)}</pre>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
            Unterschrift (r ‖ s)
          </p>
          <pre className="cert-hex">{hex(parsed.signature)}</pre>
        </div>
        <p>
          Byte 0 ist die Formatversion, Byte 1 die Schlüsselkennung, Byte 2–3
          der Ausstellungstag, Byte 4 die Reparaturarten, Byte 5–14 die{" "}
          {checkpointCount} Prüfergebnisse zu je zwei Bit, Byte 15–18 die
          Gerätebindung ({hex(cert.binding)}), Byte 19 die Gewährleistung in
          Monaten. Danach folgen Modell, Charge und Kürzel als Text.
        </p>
      </div>
    </details>
  );
}

/* ---- Was der Beleg leistet ---------------------------------------------- */

export function Limits() {
  return (
    <div className="cert-limits">
      <div>
        <p className="text-eyebrow text-accent">Was dieser Beleg beweist</p>
        <ul className="mt-5 space-y-3 leading-relaxed text-ink">
          <li>
            Das Protokoll wurde mit einem Schlüssel unterschrieben, dessen
            öffentliche Hälfte auf dieser Website steht.
          </li>
          <li>
            Seit der Unterschrift wurde daran kein Bit geändert – auch von uns
            nicht.
          </li>
          <li>
            Er gehört zu dem Gerät, dessen IMEI Sie eingeben, und zu keinem
            anderen.
          </li>
        </ul>
      </div>
      <div>
        <p className="text-eyebrow">Was er nicht beweist</p>
        <ul className="mt-5 space-y-3 leading-relaxed text-ink-soft">
          <li>
            Dass wir gut gearbeitet haben. Das kann keine Mathematik zusichern.
            Die Unterschrift nimmt uns nur die Möglichkeit, unsere eigene
            Aussage später stillschweigend zu ändern.
          </li>
          <li>
            Dass die Angaben beim Eintragen richtig waren. Wer bei der
            Aufnahme irrt, unterschreibt einen Irrtum.
          </li>
          <li>
            Mehr, als wer die Domain kontrolliert. Der Anker dieser Prüfung ist
            der veröffentlichte Schlüssel auf {site.url.replace(/^https?:\/\//, "")}
            . Wer die Seite übernimmt, kann ihn austauschen – dann verlieren
            aber alle bisherigen Belege ihre Gültigkeit, und das fällt auf.
          </li>
        </ul>
      </div>
    </div>
  );
}
