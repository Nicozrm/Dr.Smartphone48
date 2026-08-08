#!/usr/bin/env bash
#
# Führt jedes `verify:*`-Skript aus package.json aus.
#
# Die Liste steht bewusst nirgends in einer Workflow-Datei. Zwei Workflows
# brauchen sie – das Tor vor dem Merge und der Lauf vor dem Deployment –,
# und eine von Hand gepflegte Liste in beiden wäre dieselbe Falle, die in
# diesem Projekt schon zweimal zugeschnappt ist: Zwei Fassungen derselben
# Liste driften auseinander, und dann läuft ein neues Prüfskript in CI
# einfach nicht mit. Ein Prüfskript, das niemand ausführt, ist ein
# Kommentar mit Laufzeit.
#
# Wer also `npm run verify:neu` anlegt, muss hier nichts nachtragen.
#
# Aufruf: bash .github/scripts/verify-alle.sh

set -euo pipefail

skripte=$(node -p "
  Object.keys(require('./package.json').scripts)
    .filter((name) => name.startsWith('verify:'))
    .join(' ')
")

if [ -z "$skripte" ]; then
  echo "Kein einziges verify:*-Skript gefunden. Das ist selbst ein Befund."
  exit 1
fi

anzahl=0
for skript in $skripte; do
  # ::group:: klappt den Block im Actions-Protokoll zusammen. Der Name steht
  # in der Kopfzeile, also ist auch ohne Aufklappen zu sehen, wo es klemmt.
  echo "::group::npm run $skript"
  if ! npm run "$skript"; then
    echo "::endgroup::"
    echo "::error title=$skript::Eine Zusage der Website stimmt nicht mehr. Siehe den Block „npm run $skript“."
    exit 1
  fi
  echo "::endgroup::"
  anzahl=$((anzahl + 1))
done

echo "$anzahl fachliche Prüfskripte, alle bestanden."
