/*
  Typisierter Zugriff auf den Prüfbeleg.

  Die eigentlichen Daten erzeugt `npm run verify:report` (siehe
  `scripts/verify-report.mjs`) und schreibt sie nach `verify-report.json` –
  ein eingecheckter Schnappschuss, keine Laufzeit-Berechnung. Diese Datei
  gibt ihm nur eine Form, die der Rest des Projekts kennt, wie bei jeder
  anderen Tabelle unter `lib/data/`.
*/

import report from "./verify-report.json";

export interface VerifyCheck {
  id: string;
  npmScript: string;
  title: string;
  description: string;
  ok: boolean;
  durationMs: number;
  /** Wortgleiche Ausgabe des Skripts – keine eigene Zusammenfassung. */
  output: string;
}

export interface VerifyReport {
  generatedAt: string;
  ok: boolean;
  checks: VerifyCheck[];
}

export const verifyReport: VerifyReport = report;
