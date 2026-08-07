"use client";

import { useCallback, useEffect, useState } from "react";
import { REFILL, cachedPages, formatBytes } from "@/lib/pwa/precache";

/**
 * Der Offline-Vorrat, nachgesehen statt zugesagt.
 *
 * Auf /notfall steht die Zusage, dass diese Seite ohne Netz funktioniert.
 * Das ist die wichtigste Zusage der ganzen Website – jemand mit einem nassen
 * Telefon hat oft kein Netz mehr – und zugleich die einzige, die ein Besucher
 * unmöglich glauben kann: Man merkt es erst, wenn es zu spät ist, es zu
 * prüfen.
 *
 * Also wird nachgesehen. Dieser Abschnitt liest den tatsächlichen Speicher
 * des Browsers (Cache API) und listet Seite für Seite, was jetzt auf diesem
 * Gerät liegt. Keine Behauptung, ein Kassensturz.
 *
 * ## Warum die Größe erst auf Knopfdruck kommt
 *
 * Die Byte-Zahl steht in keinem Verzeichnis; sie entsteht, indem jede
 * gespeicherte Antwort einmal gelesen wird. Das sind wenige Hundert
 * Kilobyte, aber es ist Arbeit, die niemand bestellt hat, wenn er die Seite
 * bloß aufruft. Der Vorhandensein-Haken kostet dagegen fast nichts.
 *
 * ## Nachlegen macht der Service Worker
 *
 * Der Vorrat gehört ihm, also füllt er ihn auch. Die Seite bittet nur per
 * `postMessage` darum und erfährt über einen MessagePort, wann es erledigt
 * ist. Warum nicht einfacher – siehe die Begründung bei `topUp`.
 */

type State = "unbekannt" | "geprüft" | "kein-speicher";

interface Entry {
  path: string;
  label: string;
  critical: boolean;
  present: boolean;
  bytes: number | null;
}

export function OfflineStock() {
  const [state, setState] = useState<State>("unbekannt");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [weighed, setWeighed] = useState(false);
  /** Was der Service Worker beim letzten Nachlegen gemeldet hat. */
  const [failed, setFailed] = useState<string[] | null>(null);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const inspect = useCallback(
    async (withSize: boolean) => {
      if (typeof caches === "undefined") {
        setState("kein-speicher");
        return;
      }
      setBusy(true);
      try {
        const found: Entry[] = [];
        for (const page of cachedPages) {
          const url = `${base}${page.path === "/" ? "/" : page.path}`;
          const hit = await caches.match(url);
          let bytes: number | null = null;
          if (hit && withSize) {
            // Die Antwort einmal lesen. `clone()` ist Pflicht – ein Body
            // lässt sich nur einmal auslesen, und das Original bleibt im
            // Vorrat liegen.
            bytes = (await hit.clone().blob()).size;
          }
          found.push({
            path: page.path,
            label: page.label,
            critical: Boolean(page.critical),
            present: Boolean(hit),
            bytes,
          });
        }
        setEntries(found);
        setWeighed(withSize);
        setState("geprüft");
      } catch {
        setState("kein-speicher");
      } finally {
        setBusy(false);
      }
    },
    [base],
  );

  useEffect(() => {
    void inspect(false);
  }, [inspect]);

  /*
    Nachlegen lässt der Service Worker machen, nicht diese Seite.

    Der erste Entwurf rief die fehlenden Adressen hier per `fetch` ab und
    verließ sich darauf, dass der Worker sie unterwegs mitnimmt. Er tut es
    nicht: Sein Handler legt HTML nur bei echten Navigationen ab, und ein
    `fetch` aus einem Skript ist keine. Der Knopf lief ins Leere, und zwar
    ohne Fehlermeldung – nach dem Drücken stand dieselbe Zahl da wie vorher.

    Jetzt geht die Bitte über `postMessage` an den Worker, dem der Vorrat
    gehört, und die Antwort über einen MessagePort zurück.
  */
  const topUp = useCallback(async () => {
    setBusy(true);
    setFailed(null);
    try {
      const worker = navigator.serviceWorker?.controller;
      if (!worker) return;
      const report = await new Promise<{ fehlgeschlagen?: string[] } | null>(
        (resolve) => {
          const channel = new MessageChannel();
          // Ein Netz, das gar nicht antwortet, darf den Knopf nicht für immer
          // auf „Lädt …" stehen lassen.
          const bail = window.setTimeout(() => resolve(null), 10000);
          channel.port1.onmessage = (event) => {
            window.clearTimeout(bail);
            resolve(event.data);
          };
          worker.postMessage({ type: REFILL }, [channel.port2]);
        },
      );
      setFailed(report?.fehlgeschlagen ?? null);
    } finally {
      await inspect(weighed);
    }
  }, [inspect, weighed]);

  const present = entries.filter((entry) => entry.present).length;
  const missing = entries.length - present;
  const total = entries.reduce((sum, entry) => sum + (entry.bytes ?? 0), 0);
  const criticalMissing = entries.some((entry) => entry.critical && !entry.present);

  return (
    <div className="stock">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h2 className="text-title">Was Ihr Gerät jetzt schon offline kann</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Diese Seite verspricht, ohne Netz zu funktionieren. Das lässt sich
            nicht glauben, sondern nur nachsehen – hier steht, was in diesem
            Augenblick tatsächlich im Speicher Ihres Browsers liegt.
          </p>
        </div>
        {state === "geprüft" ? (
          <div className="flex flex-wrap gap-3">
            {missing > 0 ? (
              <button
                type="button"
                onClick={topUp}
                disabled={busy}
                data-ripple
                className="press inline-flex h-11 items-center rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast disabled:opacity-50"
              >
                {busy ? "Lädt …" : `${missing} fehlende laden`}
              </button>
            ) : null}
            {!weighed ? (
              <button
                type="button"
                onClick={() => inspect(true)}
                disabled={busy}
                className="press inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-medium text-ink-strong hover:border-ink-strong disabled:opacity-50"
              >
                Größe messen
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {state === "kein-speicher" ? (
        <p className="mt-6 text-sm leading-relaxed text-warn">
          Dieser Browser gibt keinen Zugriff auf den Seitenspeicher – im
          privaten Modus ist das normal. Dann steht diese Seite offline auch
          nicht zur Verfügung.
        </p>
      ) : null}

      {state === "geprüft" ? (
        <>
          <p className="mt-6 text-sm text-ink-soft tabular-nums">
            {present} von {entries.length} Seiten im Speicher
            {weighed && total > 0 ? ` · ${formatBytes(total)}` : ""}
            {criticalMissing ? " · die Notfallhilfe fehlt" : ""}
          </p>

          <ul className="stock-list mt-5">
            {entries.map((entry) => (
              <li key={entry.path} data-present={entry.present ? "ja" : "nein"}>
                <span className="stock-mark" aria-hidden="true">
                  {entry.present ? "✓" : "–"}
                </span>
                <span className="stock-label">
                  {entry.label}
                  {/* Leerzeichen von Hand: Ohne es liest eine Vorlesehilfe
                      „Notfall-Soforthilfeunverzichtbar" als ein Wort – der
                      Abstand steht sonst nur im CSS. */}
                  {entry.critical ? (
                    <> <span className="stock-critical">unverzichtbar</span></>
                  ) : null}
                </span>
                <span className="stock-size tabular-nums">
                  {entry.bytes !== null ? formatBytes(entry.bytes) : ""}
                </span>
                <span className="sr-only">
                  {entry.present ? "im Speicher" : "nicht im Speicher"}
                </span>
              </li>
            ))}
          </ul>

          {failed && failed.length > 0 ? (
            <p className="mt-5 text-sm leading-relaxed text-warn">
              {failed.length === 1 ? "Eine Seite ließ" : `${failed.length} Seiten ließen`}{" "}
              sich nicht laden: {failed.join(", ")}. Meist liegt es an der
              Verbindung – später noch einmal versuchen.
            </p>
          ) : null}

          <p className="mt-6 text-sm leading-relaxed text-ink-faint">
            Der Vorrat entsteht beim ersten Besuch von selbst und wird beim
            Weitersurfen ergänzt. Er liegt in Ihrem Browser, nicht bei uns –
            und verschwindet, wenn Sie die Websitedaten löschen. Was hier
            steht, ist gelesen, nicht behauptet.
          </p>
        </>
      ) : null}
    </div>
  );
}
