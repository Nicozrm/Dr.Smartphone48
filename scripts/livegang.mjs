/*
  Was vor dem Livegang noch fehlt.

  Absichtlich **kein** `verify:`-Skript. Die Prüfskripte sind ein Tor: Sie
  halten einen Merge auf, wenn eine Zusage der Website nicht mehr stimmt.
  Diese Liste ist etwas anderes – ein frischer Klon hat naturgemäß keinen
  Signaturschlüssel und keine Bankverbindung, und daran soll niemand
  hängenbleiben. Der Bericht endet deshalb immer mit Code 0.

  Er läuft aus demselben Modul wie der Abschnitt auf /intern
  (`lib/intern/readiness.ts`). Zwei Listen wären dieselbe Falle wie überall
  sonst in diesem Projekt.

  Aufruf: npm run livegang
*/
import { MANUELL, readiness } from "../lib/intern/readiness.ts";
import { SUPPORT_CHECKED } from "../lib/data/support.ts";
import { certKeys } from "../lib/cert/keys.ts";
import { site } from "../lib/site.ts";

/*
  Das Rechnungsprofil liegt im Browserspeicher des Betriebs – ein Skript im
  Terminal kann es nicht sehen. `null` heißt deshalb „nicht prüfbar", nicht
  „fehlt": Ein Mangel, den man nicht festgestellt hat, wird hier nicht
  behauptet.
*/
const items = readiness({
  certKeyCount: certKeys.length,
  profile: null,
  supportChecked: SUPPORT_CHECKED,
  site,
  now: Date.now(),
});

console.log("Livegang – was noch fehlt\n");

const blocker = items.filter((i) => i.schwere === "blocker");
const hinweise = items.filter((i) => i.schwere === "hinweis");

if (items.length === 0) {
  console.log("  Maschinell prüfbar: nichts offen.\n");
} else {
  for (const item of [...blocker, ...hinweise]) {
    console.log(`  ${item.schwere === "blocker" ? "OFFEN " : "hinweis"} ${item.titel}`);
    console.log(`          ${item.hinweis}`);
    if (item.href) console.log(`          → ${item.href}`);
    console.log("");
  }
}

console.log("Nur von Hand zu bestätigen:\n");
for (const punkt of MANUELL) {
  console.log(`  [ ]     ${punkt.titel}`);
  console.log(`          ${punkt.hinweis}`);
  console.log("");
}

console.log(
  "Die Bankverbindung steht im Browserspeicher des Betriebs und ist von hier\n" +
    "aus nicht prüfbar – sie erscheint im selben Abschnitt auf /intern.\n",
);
console.log(
  blocker.length === 0
    ? "Kein maschinell feststellbarer Blocker."
    : `${blocker.length} Blocker. Die Website hält eine Zusage nicht.`,
);

// Immer 0: Bericht, kein Tor. Siehe Kopfkommentar.
process.exit(0);
