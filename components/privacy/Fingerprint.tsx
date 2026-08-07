"use client";

import { useCallback, useState } from "react";
import { combine, signals } from "@/lib/privacy/signals";

/**
 * Der Fingerabdruck, den diese Seite nicht nimmt.
 *
 * Eine Datenschutzerklärung ist der am wenigsten gelesene Text jeder
 * Website, weil sie nur behaupten kann. Dieser Abschnitt zeigt stattdessen:
 * Hier steht, was in dieser Sekunde über Sie ablesbar war – ohne Nachfrage,
 * ohne Dialog, ohne dass irgendetwas aufgeleuchtet hätte.
 *
 * Drei Regeln, die diesen Abschnitt tragen:
 *
 * 1. **Nichts verlässt den Tab.** Kein `fetch`, kein `sendBeacon`, kein
 *    Speicher. `verify:privacy` prüft das im Quelltext dieser Datei.
 * 2. **Alles wird gezeigt.** Kein Wert wird gelesen, ohne dass er darunter
 *    steht. Ein Abschnitt über Datensparsamkeit, der selbst etwas verbirgt,
 *    wäre die Pointe gegen sich selbst.
 * 3. **Keine Einzigartigkeitszahl.** Sie wäre der stärkste Effekt und
 *    verlangte genau die Vergleichssammlung, deren Fehlen hier der Punkt
 *    ist. Stattdessen der Beweis, den jeder selbst führen kann: neu laden,
 *    derselbe Wert.
 *
 * Gelesen wird erst auf Knopfdruck. Beim bloßen Aufrufen der Seite passiert
 * nichts – auch das ist Teil der Aussage.
 */
export function Fingerprint() {
  const [values, setValues] = useState<string[] | null>(null);
  const [id, setId] = useState("");
  const [again, setAgain] = useState(0);
  const [stable, setStable] = useState<boolean | null>(null);

  /*
    Es gibt hier bewusst keinen Effekt und nichts aufzuräumen: Beim Aufrufen
    der Seite wird nichts gelesen. Erst der Druck auf den Knopf tut es, und
    danach läuft nichts weiter.
  */
  const read = useCallback(() => {
    const gelesen = signals.map((signal) => {
      try {
        return signal.read();
      } catch {
        return "nicht verfügbar";
      }
    });
    const next = combine(gelesen);
    setValues(gelesen);
    // Beim ersten Mal gibt es nichts zu vergleichen; danach zählt, ob der
    // Wert derselbe geblieben ist.
    setStable(id === "" ? null : id === next);
    setId(next);
    setAgain((n) => n + 1);
  }, [id]);

  return (
    <div className="print">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <h3 className="text-title">Was wir sehen könnten, ohne zu fragen</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Die folgenden Angaben gibt Ihr Browser jeder Website heraus, die
            danach greift – ohne Dialog, ohne Hinweis, ohne Schloss in der
            Adresszeile. Ein Besucherzähler oder ein eingebettetes
            Kartenfenster liest sie, sobald die Seite geladen ist.
          </p>
        </div>
        <button
          type="button"
          onClick={read}
          data-ripple
          className="press inline-flex h-11 shrink-0 items-center rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast"
        >
          {values ? "Noch einmal lesen" : "Zeigen, was ablesbar ist"}
        </button>
      </div>

      {values ? (
        <>
          <div className="print-badge mt-8">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">
              Aus allen Angaben zusammengesetzt
            </p>
            <p className="print-id tabular-nums">{id}</p>
            {again > 1 ? (
              <p className="mt-2 text-sm" data-stable={stable ? "ja" : "nein"}>
                {stable
                  ? `Beim ${again}. Lesen derselbe Wert. Genau das macht ihn als Wiedererkennung brauchbar – und genau deshalb steht er hier und nirgendwo sonst.`
                  : "Diesmal ein anderer Wert. Etwas hat sich geändert: Fenstergröße, Theme oder eine Einstellung."}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                Drücken Sie noch einmal. Der Wert bleibt derselbe – das ist der
                Grund, warum er sich zum Wiedererkennen eignet.
              </p>
            )}
          </div>

          <dl className="print-list mt-8">
            {signals.map((signal, i) => (
              <div key={signal.id}>
                <dt>{signal.label}</dt>
                <dd className="print-value">{values[i]}</dd>
                <dd className="print-reason">{signal.reason}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      <div className="print-limits mt-10">
        <div>
          <p className="text-eyebrow text-accent">Was hier passiert ist</p>
          <ul className="mt-4 space-y-2.5 leading-relaxed text-ink">
            <li>Alle Werte wurden in Ihrem Tab gelesen und stehen vollständig oben.</li>
            <li>
              Nichts wurde gesendet, nichts gespeichert, nichts gezählt. Beim
              Schließen des Tabs ist es weg.
            </li>
            <li>
              Der Quelltext dieser Seite wird maschinell darauf geprüft, dass
              er keinen Weg nach draußen enthält.
            </li>
          </ul>
        </div>
        <div>
          <p className="text-eyebrow">Was wir Ihnen nicht sagen</p>
          <ul className="mt-4 space-y-2.5 leading-relaxed text-ink-soft">
            <li>
              Wie einzigartig diese Kombination ist. Das wäre die
              eindrucksvollste Zahl und die einzige, die wir nicht haben
              dürften – dafür müssten wir Sie mit tausenden anderen Besuchern
              vergleichen, also genau die Sammlung angelegt haben, deren
              Fehlen hier der Punkt ist.
            </li>
            <li>
              Wer Ihnen sagt, wie selten Sie sind, hat Sie mit anderen
              verglichen.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
