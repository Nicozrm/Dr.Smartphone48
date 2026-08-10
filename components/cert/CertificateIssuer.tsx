"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { QrCode } from "@/components/ui/QrCode";
import { SignatureGlyph } from "./SignatureGlyph";
import {
  deviceBinding,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  importPrivateKey,
  importPublicKey,
  normalizeImei,
  sign,
  verify,
} from "@/lib/cert/crypto";
import {
  BINDING_BYTES,
  CERT_REPAIRS,
  CHECK_LABEL,
  CHECK_NA,
  CHECK_NOTED,
  CHECK_OPEN,
  CHECK_PASSED,
  encodeCertificate,
  encodeSignable,
  fromBase64Url,
  toBase64Url,
  type CertRepair,
  type CheckResult,
} from "@/lib/cert/format";
import { fingerprint } from "@/lib/cert/glyph";
import { certKeys } from "@/lib/cert/keys";
import { appendLog, loadKey, loadLog, saveKey, type LogEntry } from "@/lib/cert/store";
import { fillIfEmpty, parseCertPrefill } from "@/lib/intern/prefill";
import { repairMeta } from "@/lib/data/devices";
import { brands } from "@/lib/data/devices";
import { checkpointCount, inspectionGroups } from "@/lib/data/inspection";
import { site } from "@/lib/site";

/** Reihum: nicht geprüft → bestanden → Befund → nicht zutreffend. */
const CYCLE: CheckResult[] = [CHECK_OPEN, CHECK_PASSED, CHECK_NOTED, CHECK_NA];

const cellClass: Record<CheckResult, string> = {
  [CHECK_OPEN]: "cert-cell is-open",
  [CHECK_PASSED]: "cert-cell is-passed",
  [CHECK_NOTED]: "cert-cell is-noted",
  [CHECK_NA]: "cert-cell is-na",
};

const cellSign: Record<CheckResult, string> = {
  [CHECK_OPEN]: "–",
  [CHECK_PASSED]: "✓",
  [CHECK_NOTED]: "!",
  [CHECK_NA]: "·",
};

interface Issued {
  code: string;
  url: string;
  signature: Uint8Array;
  /** Nachgerechnet mit der öffentlichen Hälfte – nicht bloß behauptet. */
  selfTest: boolean;
}

export function CertificateIssuer() {
  /* ---- Schlüssel -------------------------------------------------------- */

  const [keyId, setKeyId] = useState<number | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [signingKey, setSigningKey] = useState<CryptoKey | null>(null);
  const [keyNote, setKeyNote] = useState("");

  useEffect(() => {
    const stored = loadKey();
    if (!stored) return;
    setKeyId(stored.id);
    setPublicKey(stored.publicKey);
    importPrivateKey(stored.privateJwk)
      .then(setSigningKey)
      .catch(() => setKeyNote("Der gespeicherte Schlüssel ließ sich nicht laden."));
  }, []);

  const createKey = async () => {
    setKeyNote("");
    try {
      const pair = await generateKeyPair();
      const raw = await exportPublicKey(pair.publicKey);
      const jwk = await exportPrivateKey(pair.privateKey);
      // Fortlaufend, damit ein Wechsel die alten Belege nicht entwertet.
      const nextId = Math.max(0, ...certKeys.map((k) => k.id)) + 1;
      const stored = {
        id: nextId,
        privateJwk: jwk,
        publicKey: toBase64Url(raw),
        createdAt: new Date().toISOString(),
      };
      if (!saveKey(stored)) {
        setKeyNote("Der Browser lässt kein Speichern zu. Sicherung sofort laden!");
      }
      setKeyId(nextId);
      setPublicKey(stored.publicKey);
      setSigningKey(pair.privateKey);
    } catch (error) {
      setKeyNote(error instanceof Error ? error.message : "Fehlgeschlagen.");
    }
  };

  const downloadBackup = () => {
    const stored = loadKey();
    if (!stored) return;
    const blob = new Blob([JSON.stringify(stored, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `drsmartphone48-signaturschluessel-${stored.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (file: File) => {
    setKeyNote("");
    try {
      const stored = JSON.parse(await file.text());
      const key = await importPrivateKey(stored.privateJwk);
      saveKey(stored);
      setKeyId(stored.id);
      setPublicKey(stored.publicKey);
      setSigningKey(key);
    } catch {
      setKeyNote("Die Datei ist keine gültige Sicherung.");
    }
  };

  /* ---- Angaben zum Vorgang ---------------------------------------------- */

  const [model, setModel] = useState("");
  const [imei, setImei] = useState("");
  const [batch, setBatch] = useState("");

  const [technician, setTechnician] = useState("");
  const [repairs, setRepairs] = useState<CertRepair[]>([]);
  const [checks, setChecks] = useState<CheckResult[]>(
    () => Array<CheckResult>(checkpointCount).fill(CHECK_OPEN),
  );
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);


  /*
    Vorbelegung aus der Akte: `#modell=…&charge=…`.

    Nur leere Felder werden gefüllt – wer schon etwas eingetragen hat, soll
    es durch einen Klick auf einen Verweis nicht verlieren. Einmal beim
    Laden, denn die Adresse ist ein Startwert und kein Zustandsspeicher.
  */
  useEffect(() => {
    const pre = parseCertPrefill(window.location.hash);
    if (pre.model) setModel((current) => fillIfEmpty(current, pre.model));
    if (pre.batch) setBatch((current) => fillIfEmpty(current, pre.batch));
  }, []);

  useEffect(() => setLog(loadLog()), []);

  const allModels = useMemo(
    () => brands.flatMap((brand) => brand.models.map((m) => m.name)),
    [],
  );

  const cycle = (index: number) => {
    setChecks((current) => {
      const next = [...current];
      next[index] = CYCLE[(CYCLE.indexOf(current[index]) + 1) % CYCLE.length];
      return next;
    });
    setIssued(null);
  };

  const setGroup = (start: number, length: number, value: CheckResult) => {
    setChecks((current) => {
      const next = [...current];
      for (let i = start; i < start + length; i++) next[i] = value;
      return next;
    });
    setIssued(null);
  };

  const openCount = checks.filter((c) => c === CHECK_OPEN).length;

  /*
    Was zum Unterschreiben fehlt – als Liste, nicht als zusammengesetzter
    Satz. Die frühere Fassung baute ihn aus verschachtelten Bedingungen
    samt Kommas zusammen; das war schon bei drei Gründen kaum zu lesen und
    bei vieren falsch.
  */
  const fehlt = [
    !signingKey && "ein Signaturschlüssel",
    model.trim().length <= 1 && "die Modellbezeichnung",
    normalizeImei(imei).length < 14 && "eine vollständige IMEI",
  ].filter(Boolean) as string[];

  /** Steht die öffentliche Hälfte im veröffentlichten Ring? */
  const keyImRing = keyId !== null && certKeys.some((k) => k.id === keyId);

  const issue = async () => {
    setError("");
    setIssued(null);
    // Die Sperre sitzt hier, nicht am Knopf – siehe die Begründung unten.
    if (fehlt.length > 0 || !signingKey || keyId === null) return;
    try {
      const binding = await deviceBinding(imei, BINDING_BYTES);
      const signable = encodeSignable(
        {
          keyId,
          issued: new Date(),
          repairs,
          checks,
          binding,
          warrantyMonths: site.warrantyMonths,
          model,
          batch,
          technician,
        },
        checkpointCount,
      );
      const signature = await sign(signingKey, signable);
      const code = encodeCertificate(signable, signature);

      /*
        Sofort gegenprüfen, mit derselben öffentlichen Hälfte, die auf der
        Prüfseite steht. Ein Werkzeug, das einen Beleg ausgibt, ohne ihn
        selbst gelesen zu haben, gibt irgendwann einen aus, den niemand
        prüfen kann – und das fiele erst dem Kunden auf.
      */
      const check = await importPublicKey(fromBase64Url(publicKey));
      const selfTest = await verify(check, signature, signable);

      const url = `${site.url}/pruefen#${code}`;
      setIssued({ code, url, signature, selfTest });
      setLog(
        appendLog({
          code,
          model,
          issued: new Date().toISOString(),
          fingerprint: fingerprint(signature),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehlgeschlagen.");
    }
  };

  /* ---- Darstellung ------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-4xl space-y-14 px-6 pb-24">
      <header>
        <p className="text-eyebrow">Intern · nicht verlinkt</p>
        <h1 className="text-headline mt-4">Reparaturzertifikat ausstellen</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Das Protokoll wird hier eingetragen, im Browser unterschrieben und
          als QR-Code auf den Beleg gedruckt. Nichts davon verlässt dieses
          Gerät – auch der private Schlüssel nicht.
        </p>
      </header>

      {/* ---- Schlüssel ---- */}
      <section className="cert-entry">
        <h2 className="text-title">Signaturschlüssel</h2>
        {signingKey && keyId !== null ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              Schlüssel&nbsp;#{keyId} ist einsatzbereit.
              {certKeys.some((k) => k.id === keyId)
                ? " Er steht im veröffentlichten Schlüsselring – Kunden können prüfen."
                : " Er steht noch nicht im veröffentlichten Schlüsselring: Bis dahin lässt sich ein Beleg nur auf diesem Gerät prüfen."}
            </p>
            {!certKeys.some((k) => k.id === keyId) ? (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
                  Öffentliche Hälfte · diese Zeile nach{" "}
                  <code>lib/cert/keys.ts</code> übernehmen
                </p>
                <pre className="cert-hex mt-2">{`{ id: ${keyId}, publicKey: "${publicKey}", since: "${new Date().toISOString().slice(0, 10)}", note: "Werkstattrechner." },`}</pre>
                <p className="mt-2 text-sm text-ink-soft">
                  Genau diese eine Zeile, und zwar in das Array{" "}
                  <code>certKeys</code> – nicht in den Kommentar darüber. Ein
                  auskommentierter Schlüssel richtet nichts ein: Der Ring
                  bleibt leer, und die Prüfseite meldet weiterhin „Schlüssel
                  nicht hinterlegt“.
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={downloadBackup}>
                Sicherung herunterladen
              </Button>
              <label className="press inline-flex h-11 cursor-pointer items-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong">
                Sicherung einspielen
                <input
                  type="file"
                  accept="application/json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void restoreBackup(file);
                  }}
                />
              </label>
            </div>
            <p className="mt-4 text-sm text-warn">
              Ohne Sicherung ist die Unterschrift des Betriebs verloren, sobald
              dieser Browserspeicher geleert wird. Bereits ausgestellte Belege
              bleiben prüfbar; neue lassen sich nicht mehr unterschreiben.
            </p>
            <p className="mt-3 text-sm text-warn">
              Die Sicherungsdatei enthält die <strong>private</strong> Hälfte
              und sieht der Zeile oben ähnlich. Sie gehört in einen Tresor –
              niemals in dieses Repository und in keine Datei der Website. Wer
              sie dort einfügt, veröffentlicht die Unterschrift des Betriebs;
              der Schlüssel ist dann verbrannt und muss ersetzt werden.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              Noch kein Schlüssel auf diesem Gerät. Er wird hier erzeugt und
              hat diesen Browser nie verlassen – niemand sonst, auch nicht wer
              diese Website gebaut hat, kennt die private Hälfte.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={createKey}>Schlüssel erzeugen</Button>
              <label className="press inline-flex h-11 cursor-pointer items-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong">
                Sicherung einspielen
                <input
                  type="file"
                  accept="application/json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void restoreBackup(file);
                  }}
                />
              </label>
            </div>
          </>
        )}
        {keyNote ? <p className="mt-4 text-sm text-danger">{keyNote}</p> : null}
      </section>

      {/* ---- Vorgang ---- */}
      <section>
        <h2 className="text-title">Gerät und Arbeit</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-strong">
              Modell
            </span>
            <input
              value={model}
              list="cert-modelle"
              onChange={(e) => {
                setModel(e.target.value);
                setIssued(null);
              }}
              className="cert-field"
              placeholder="iPhone 14 Pro"
            />
            <datalist id="cert-modelle">
              {allModels.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-strong">
              IMEI
              <span className="ml-2 font-normal text-ink-faint">
                wird nicht gespeichert
              </span>
            </span>
            <input
              value={imei}
              inputMode="numeric"
              onChange={(e) => {
                setImei(e.target.value);
                setIssued(null);
              }}
              className="cert-field font-mono tabular-nums"
              placeholder="15 Ziffern"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-strong">
              Teilecharge oder Lieferschein
            </span>
            <input
              value={batch}
              onChange={(e) => {
                setBatch(e.target.value);
                setIssued(null);
              }}
              className="cert-field font-mono"
              placeholder="LS-2026-0413"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-strong">
              Kürzel der ausführenden Person
            </span>
            <input
              value={technician}
              onChange={(e) => {
                setTechnician(e.target.value);
                setIssued(null);
              }}
              className="cert-field"
              placeholder="N. Z."
            />
          </label>
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-medium text-ink-strong">
            Ausgeführte Arbeiten
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {CERT_REPAIRS.map((kind) => {
              const active = repairs.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setRepairs((current) =>
                      current.includes(kind)
                        ? current.filter((r) => r !== kind)
                        : [...current, kind],
                    );
                    setIssued(null);
                  }}
                  className={`press h-10 rounded-full border px-4 text-sm transition-colors ${
                    active
                      ? "border-accent bg-accent text-accent-contrast"
                      : "border-line-strong text-ink-strong hover:border-ink-strong"
                  }`}
                >
                  {repairMeta[kind].label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      {/* ---- Protokoll ---- */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-title">Prüfprotokoll</h2>
          <p className="text-sm text-ink-soft tabular-nums">
            {openCount === 0
              ? "alle Positionen erfasst"
              : `${openCount} von ${checkpointCount} noch offen`}
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Ein Klick schaltet weiter: nicht geprüft → bestanden → Befund
          vermerkt → nicht zutreffend. Offene Positionen werden mitunter-
          schrieben und erscheinen auf der Prüfseite als offen – ein leeres
          Protokoll wird also nicht heimlich zu einem bestandenen.
        </p>

        <div className="mt-8 space-y-8">
          {inspectionGroups.map((group) => {
            const start = inspectionGroups
              .slice(0, inspectionGroups.indexOf(group))
              .reduce((sum, g) => sum + g.points.length, 0);
            return (
              <div key={group.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
                  <h3 className="text-sm font-semibold text-ink-strong">
                    {group.title}
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => setGroup(start, group.points.length, CHECK_PASSED)}
                    >
                      alle bestanden
                    </button>
                    <span className="text-line-strong">·</span>
                    <button
                      type="button"
                      className="text-ink-faint hover:underline"
                      onClick={() => setGroup(start, group.points.length, CHECK_OPEN)}
                    >
                      zurücksetzen
                    </button>
                  </div>
                </div>
                <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  {group.points.map((point, offset) => {
                    const index = start + offset;
                    const value = checks[index];
                    return (
                      <li key={point.title}>
                        <button
                          type="button"
                          onClick={() => cycle(index)}
                          title={point.criterion}
                          className="flex w-full items-center gap-2.5 rounded-[var(--radius-s)] py-1 text-left text-sm hover:bg-sunken"
                        >
                          <span className={cellClass[value]} aria-hidden="true">
                            {cellSign[value]}
                          </span>
                          <span className="font-mono text-[0.6875rem] text-ink-faint tabular-nums">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {point.title}
                          </span>
                          <span className="sr-only">
                            : {CHECK_LABEL[value]} – zum Weiterschalten drücken
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Ausstellen ---- */}
      <section className="cert-binding">
        <h2 className="text-title">Unterschreiben</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Gewährleistung laut <code>site.warrantyMonths</code>:{" "}
          {site.warrantyMonths} Monate. Sie wandert in den Beleg und lässt sich
          später nicht mehr ändern, ohne die Unterschrift zu zerstören.
        </p>
        <div className="mt-5">
          <Button onClick={issue}>Zertifikat ausstellen</Button>
        </div>
        {fehlt.length > 0 ? (
          /*
            Kein `disabled`, dieselbe Regel wie bei der Absenderegel: Ein
            gesperrter Knopf sagt „nicht bedienbar" und fällt aus der
            Tabulatorreihenfolge – wer ihn mit der Tastatur erreicht, käme
            nie zu der Erklärung, warum nichts passiert. Der Druck ist hier
            der Weg zur Erklärung.

            `aria-live`, damit die Vorlesehilfe die Liste beim Drücken
            ansagt und nicht stumm bleibt.
          */
          <div className="mt-3" aria-live="polite">
            <p className="text-sm text-ink-soft">
              Zum Unterschreiben fehlt noch:
            </p>
            <ul className="mt-1.5 space-y-1">
              {fehlt.map((f) => (
                <li key={f} className="text-sm text-warn">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : keyImRing ? null : (
          /*
            Der sicherheitsrelevante Fall, und der einzige, den man beim
            Unterschreiben übersehen kann: Der Schlüssel ist da, der Beleg
            wird gültig – aber niemand außerhalb dieses Browsers kann ihn
            prüfen, weil die öffentliche Hälfte nicht im Ring steht. Der
            Kunde bekäme einen Beleg, der sein Versprechen nicht einlöst.
          */
          <p className="mt-3 text-sm text-warn">
            Einrichtungsmodus: Schlüssel&nbsp;#{keyId} steht nicht im
            veröffentlichten Ring. Der Beleg wird unterschrieben, ist aber
            nur auf diesem Gerät prüfbar.
          </p>
        )}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </section>

      {issued ? (
        <section className="cert-entry">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow text-accent">Ausgestellt</p>
              <h2 className="text-title mt-3">
                {issued.selfTest
                  ? "Unterschrieben und gegengeprüft."
                  : "Unterschrieben – Gegenprüfung fehlgeschlagen!"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {issued.selfTest
                  ? "Der Beleg wurde sofort mit der öffentlichen Hälfte nachgerechnet, genau wie es die Prüfseite tut."
                  : "Der Beleg lässt sich mit der hinterlegten öffentlichen Hälfte nicht prüfen. Nicht ausgeben – Schlüssel prüfen."}
              </p>
              <p className="mt-4 font-mono text-sm text-ink-strong">
                {fingerprint(issued.signature)}
              </p>
              <pre className="cert-hex mt-4">{issued.url}</pre>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard?.writeText(issued.url)}
                >
                  Adresse kopieren
                </Button>
                <Button variant="ghost" href="/pruefen">
                  Prüfseite öffnen
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-[var(--radius-m)] bg-white p-3">
                <QrCode value={issued.url} size={192} label="Zertifikat prüfen" />
              </div>
              <SignatureGlyph signature={issued.signature} tone="valid" size={120} animate />
            </div>
          </div>
        </section>
      ) : null}

      {log.length > 0 ? (
        <section>
          <h2 className="text-title">Ausstellungsbuch</h2>
          <p className="mt-3 text-sm text-ink-soft">
            Die letzten {log.length} Belege dieses Geräts – ohne Namen, ohne
            IMEI. Nur zum Nachdrucken eines verlorenen Codes.
          </p>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {log.map((item) => (
              <li
                key={item.code}
                className="flex flex-wrap items-center gap-x-5 gap-y-1 py-3 text-sm"
              >
                <span className="font-mono text-xs text-ink-faint tabular-nums">
                  {item.issued.slice(0, 10)}
                </span>
                <span className="font-medium text-ink-strong">{item.model}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {item.fingerprint}
                </span>
                <Link
                  className="ml-auto text-accent hover:underline"
                  href={`/pruefen#${item.code}`}
                >
                  öffnen
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
