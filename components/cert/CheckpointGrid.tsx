import {
  CHECK_LABEL,
  CHECK_NA,
  CHECK_NOTED,
  CHECK_OPEN,
  CHECK_PASSED,
  type CheckResult,
} from "@/lib/cert/format";
import { inspectionGroups } from "@/lib/data/inspection";

const marks: Record<CheckResult, { className: string; sign: string }> = {
  [CHECK_OPEN]: { className: "cert-cell is-open", sign: "–" },
  [CHECK_PASSED]: { className: "cert-cell is-passed", sign: "✓" },
  [CHECK_NOTED]: { className: "cert-cell is-noted", sign: "!" },
  [CHECK_NA]: { className: "cert-cell is-na", sign: "·" },
};

/**
 * Das Prüfprotokoll, wie es unterschrieben wurde.
 *
 * Hier steht der eigentliche Inhalt des Zertifikats: vierzig Positionen mit
 * ihrem Ergebnis, gruppiert wie in `lib/data/inspection.ts`. Die Zahl vor
 * jeder Position ist dieselbe wie auf der Geräteakte und im gedruckten
 * Protokoll – wer beides nebeneinander legt, vergleicht Zeile für Zeile.
 *
 * Ein „Befund vermerkt“ ist ausdrücklich kein Makel, der versteckt gehört.
 * Ein Protokoll, in dem vierzigmal derselbe Haken steht, hat niemand
 * durchgearbeitet; das sieht auch ein Kunde.
 */
export function CheckpointGrid({ checks }: { checks: CheckResult[] }) {
  let index = 0;

  return (
    <div className="space-y-8">
      {inspectionGroups.map((group) => {
        const start = index;
        index += group.points.length;

        return (
          <section key={group.id}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <h3 className="text-sm font-semibold tracking-tight text-ink-strong">
                {group.title}
              </h3>
              <span className="font-mono text-[0.6875rem] text-ink-faint tabular-nums">
                {start + 1}–{start + group.points.length}
              </span>
            </div>

            <ul className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {group.points.map((point, offset) => {
                const result = checks[start + offset] ?? CHECK_OPEN;
                const mark = marks[result];
                return (
                  <li
                    key={point.title}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span
                      className={mark.className}
                      aria-hidden="true"
                      title={CHECK_LABEL[result]}
                    >
                      {mark.sign}
                    </span>
                    <span className="font-mono text-[0.6875rem] text-ink-faint tabular-nums">
                      {String(start + offset + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {point.title}
                    </span>
                    <span className="sr-only">: {CHECK_LABEL[result]}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Zusammenzählung für die Kopfzeile – bestanden, Befund, offen. */
export function summarize(checks: CheckResult[]) {
  return {
    passed: checks.filter((c) => c === CHECK_PASSED).length,
    noted: checks.filter((c) => c === CHECK_NOTED).length,
    na: checks.filter((c) => c === CHECK_NA).length,
    open: checks.filter((c) => c === CHECK_OPEN).length,
  };
}
