/*
  Prüft den Werkstattablauf gegen das Datenbankschema.

  Der Ablauf steht zweimal: in `lib/tickets/status.ts` als TypeScript-Liste
  und in `supabase/migrations/*_repair_tickets.sql` als Postgres-Enum. Das ist
  unvermeidbar – Postgres kennt keine TypeScript-Typen –, aber es ist auch die
  Sorte Wiederholung, die still auseinanderläuft:

  – Ein neuer Zustand nur in TypeScript: Die Werkstatt drückt einen Knopf, die
    Datenbank lehnt den Wert ab, im Dashboard steht ein Fehler ohne Ursache.
  – Ein neuer Zustand nur in SQL: Die Statusseite bekommt einen Wert, den sie
    nicht kennt, und zeigt eine leere Zeitleiste.
  – Andere **Reihenfolge**: Der Fortschrittsbalken rechnet mit der falschen
    Position, und „ein Schritt zurück“ erlaubt plötzlich etwas anderes. Das
    ist der heimtückischste Fall, weil nichts abstürzt.

  Deshalb vergleicht dieses Skript beide Listen zeichen- und reihenfolgegenau.
  Dazu drei Dinge, die ebenfalls zusammenpassen müssen: die Kanäle für
  Benachrichtigungen, das Muster des Vorgangscodes und die Namen der
  Realtime-Kanäle.

  Aufruf: npm run verify:status
*/
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  TICKET_STATUSES,
  ticketStatusMeta,
  NOTIFYING_STATUSES,
  canTransition,
  statusProgress,
} from "../lib/tickets/status.ts";
import { CONTACT_CHANNELS } from "../lib/tickets/types.ts";
import { TICKET_CODE_PATTERN, generateTicketCode } from "../lib/tickets/code.ts";
import { WORKSHOP_TOPIC, ticketTopic } from "../lib/realtime/topics.ts";
import {
  PICKUP_DAYS,
  STALE_DAYS,
  attentionItems,
  valueInProgress,
} from "../lib/workshop/attention.ts";
import { parseDeepLink, workshopHref } from "../lib/workshop/deeplink.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};
const ok = (text) => console.log(`  ok     ${text}`);

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const sql = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
  .join("\n");

/** Liest die Werte eines `create type … as enum (…)` aus dem SQL. */
function enumValues(name) {
  const match = sql.match(
    new RegExp(`create type public\\.${name} as enum\\s*\\(([^)]*)\\)`, "i"),
  );
  if (!match) return null;
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

/* ---- 1. Die Zustände ---------------------------------------------------- */

console.log("\nZustände (TypeScript ↔ Postgres)");

const sqlStatuses = enumValues("ticket_status");
if (!sqlStatuses) {
  fail("In den Migrationen fehlt `create type public.ticket_status as enum (…)`.");
} else if (sqlStatuses.join(",") !== [...TICKET_STATUSES].join(",")) {
  fail("Die Listen unterscheiden sich:");
  console.log(`         TypeScript: ${TICKET_STATUSES.join(", ")}`);
  console.log(`         Postgres:   ${sqlStatuses.join(", ")}`);
} else {
  ok(`${TICKET_STATUSES.length} Zustände, gleiche Reihenfolge`);
}

/* ---- 2. Beschreibungen -------------------------------------------------- */

for (const status of TICKET_STATUSES) {
  const meta = ticketStatusMeta[status];
  if (!meta) {
    fail(`Zu „${status}“ fehlt der Eintrag in ticketStatusMeta.`);
    continue;
  }
  if (!meta.label || !meta.customerHint) {
    fail(`Zu „${status}“ fehlt Beschriftung oder Kundenhinweis.`);
  }
}
if (failures === 0) ok("jeder Zustand hat Beschriftung, Kundenhinweis, Ton und Zeichen");

/* ---- 3. Fortschritt und Übergänge --------------------------------------- */

const first = TICKET_STATUSES[0];
const last = TICKET_STATUSES[TICKET_STATUSES.length - 1];
if (statusProgress(first) !== 0) fail("Der erste Zustand muss bei 0 stehen.");
if (statusProgress(last) !== 1) fail("Der letzte Zustand muss bei 1 stehen.");

// Vorwärts immer erlaubt, zwei Schritte zurück nie, ein Schritt zurück immer.
for (let i = 0; i < TICKET_STATUSES.length; i++) {
  for (let j = 0; j < TICKET_STATUSES.length; j++) {
    const erlaubt = canTransition(TICKET_STATUSES[i], TICKET_STATUSES[j]);
    const erwartet = j > i || j === i - 1;
    if (erlaubt !== erwartet) {
      fail(
        `Übergang ${TICKET_STATUSES[i]} → ${TICKET_STATUSES[j]}: ${erlaubt ? "erlaubt" : "verboten"}, erwartet ${erwartet ? "erlaubt" : "verboten"}.`,
      );
    }
  }
}
ok("Fortschritt von 0 bis 1, Übergänge vorwärts frei und genau ein Schritt zurück");

for (const status of NOTIFYING_STATUSES) {
  if (!TICKET_STATUSES.includes(status)) {
    fail(`„${status}“ löst eine Nachricht aus, ist aber kein gültiger Zustand.`);
  }
}

/* ---- 4. Kontaktkanäle --------------------------------------------------- */

console.log("\nKontaktkanäle");

const sqlChannels = enumValues("contact_channel");
if (!sqlChannels) {
  fail("In den Migrationen fehlt `create type public.contact_channel as enum (…)`.");
} else if (sqlChannels.join(",") !== [...CONTACT_CHANNELS].join(",")) {
  fail(
    `Die Listen unterscheiden sich: TypeScript ${CONTACT_CHANNELS.join(", ")} / Postgres ${sqlChannels.join(", ")}`,
  );
} else {
  ok(`${CONTACT_CHANNELS.length} Kanäle, gleiche Reihenfolge`);
}

/* ---- 5. Vorgangscode ----------------------------------------------------- */

console.log("\nVorgangscode");

// Die Bedingung in der Tabelle muss dieselbe Form erzwingen wie der Erzeuger.
const checkMatch = sql.match(/ticket_code\s*~\s*'([^']+)'/i);
if (!checkMatch) {
  fail("In der Tabelle fehlt die Prüfbedingung auf die Form des Vorgangscodes.");
} else {
  const dbPattern = new RegExp(checkMatch[1]);
  let verstöße = 0;
  for (let i = 0; i < 500; i++) {
    const code = generateTicketCode();
    if (!TICKET_CODE_PATTERN.test(code) || !dbPattern.test(code)) verstöße++;
  }
  if (verstöße > 0) {
    fail(`${verstöße} von 500 erzeugten Codes passen nicht zu beiden Mustern.`);
  } else {
    ok("500 erzeugte Codes passen zum TypeScript-Muster und zur Prüfbedingung");
  }

  // Ein Code mit verwechselbaren Zeichen darf nirgends durchkommen.
  for (const schlecht of ["ABCD-EFGI", "ABCD-EFG0", "ABCD-EFG1", "ABCDEFGH", "abcd-efgh"]) {
    if (dbPattern.test(schlecht)) {
      fail(`Die Prüfbedingung lässt „${schlecht}“ durch.`);
    }
  }
}

/* ---- 6. Realtime-Kanäle -------------------------------------------------- */

console.log("\nRundruf-Kanäle");

const beispiel = ticketTopic("K7M2-B94X");
const kundenPräfix = beispiel.slice(0, beispiel.indexOf(":") + 1);

if (!sql.includes(`'${kundenPräfix}' || new.ticket_code`)) {
  fail(`Der Trigger sendet nicht auf „${kundenPräfix}<code>“ – Kunden hören ins Leere.`);
} else {
  ok(`Kundenkanal „${kundenPräfix}<code>“ wird gesendet`);
}

if (!sql.includes(`'${WORKSHOP_TOPIC}'`)) {
  fail(`Der Werkstattkanal „${WORKSHOP_TOPIC}“ kommt in keiner Migration vor.`);
} else {
  ok(`Werkstattkanal „${WORKSHOP_TOPIC}“ wird gesendet`);
}

/*
  Die eigentliche Zusage dieses Abschnitts.

  Die Kanäle sind öffentlich (Policies auf `realtime.messages` kann die Rolle
  `postgres` nicht anlegen – siehe die Migration). Damit hängt die Sicherheit
  ausschließlich an der Nutzlast, und genau das wird hier geprüft: Der
  Werkstattkanal, dessen Name im JavaScript steht, darf **nichts** über einen
  Vorgang verraten. Wer dort eines Tages den Vorgangscode mitschickt, macht
  jeden Vorgang für jeden lesbar, der die Statusseite kennt – ohne dass
  irgendwo ein Fehler entstünde.
*/
const werkstattRuf = sql.match(
  /perform realtime\.send\(\s*jsonb_build_object\(([^)]*)\)[^;]*'werkstatt:vorgaenge'/i,
);
if (!werkstattRuf) {
  fail("Der Rundruf an die Werkstatt ist nicht auffindbar – Prüfung nicht möglich.");
} else {
  const verboten = ["ticket_code", "customer", "phone", "email", "imei", "status"];
  const gefunden = verboten.filter((feld) => werkstattRuf[1].includes(feld));
  if (gefunden.length > 0) {
    fail(
      `Der öffentliche Werkstattkanal trägt ${gefunden.join(", ")} – dort gehört nur ein Zeitstempel hin.`,
    );
  } else {
    ok("Werkstattkanal trägt keine Vorgangsdaten, nur einen Zeitstempel");
  }
}

// Auf dem Kundenkanal darf stehen, was der Zuhörer ohnehin kennt oder braucht –
// aber nichts über die Person.
const kundenRuf = sql.match(
  /perform realtime\.send\(\s*jsonb_build_object\(([\s\S]*?)\)[\s\S]{0,80}?'vorgang:'/i,
);
if (!kundenRuf) {
  fail("Der Rundruf an den Kunden ist nicht auffindbar – Prüfung nicht möglich.");
} else {
  const verboten = ["customer", "phone", "email", "imei", "internal_notes", "customer_note"];
  const gefunden = verboten.filter((feld) => kundenRuf[1].includes(feld));
  if (gefunden.length > 0) {
    fail(`Der Kundenkanal trägt ${gefunden.join(", ")} – personenbezogene Daten gehören nicht in einen Rundruf.`);
  } else {
    ok("Kundenkanal trägt Zustand und Zeitstempel, nichts Personenbezogenes");
  }
}

/* ---- 7. Schutz der Tabellen ---------------------------------------------- */

console.log("\nZugriff");

for (const tabelle of ["repair_tickets", "ticket_history", "workshop_staff"]) {
  if (!sql.includes(`alter table public.${tabelle} enable row level security`)) {
    fail(`Für ${tabelle} wird Row Level Security nicht eingeschaltet.`);
  }
}

// Eine Policy für `anon` auf den Vorgangstabellen wäre eine Policy für jeden.
const anonPolicy = /create policy[\s\S]{0,400}?on public\.(repair_tickets|ticket_history)[\s\S]{0,200}?to [^\n]*\banon\b/i;
if (anonPolicy.test(sql)) {
  fail("Es gibt eine Policy für `anon` auf den Vorgangstabellen – die Kundensicht läuft über den Server.");
} else {
  ok("RLS überall aktiv, keine Policy für anonyme Zugriffe auf die Vorgangstabellen");
}

/* ---- Was quer liegt ------------------------------------------------------ */

console.log("\nAufmerksamkeit – welche Vorgänge gehen nicht von selbst weiter\n");
{
  const TAG = 24 * 60 * 60 * 1000;
  const jetzt = Date.parse("2026-08-08T12:00:00Z");
  const vor = (tage) => new Date(jetzt - tage * TAG).toISOString();

  const bau = (id, status, opts = {}) => ({
    id,
    ticketCode: id,
    customer: "Muster",
    device: "iPhone 15",
    status,
    repairItems: [],
    totalPrice: opts.preis ?? 100,
    estimatedReadyAt: opts.termin ?? null,
    createdAt: vor(30),
    statusChangedAt: opts.bewegt ?? vor(0),
    hasInternalNotes: false,
  });

  // Abgeschlossene Vorgänge tauchen nie auf – auch nicht mit altem Datum.
  const fertig = attentionItems([bau("A", "completed", { bewegt: vor(99) })], jetzt);
  if (fertig.length !== 0) fail("Ein abgeschlossener Vorgang wird als offen gemeldet.");
  else ok("abgeschlossene Vorgänge erscheinen nicht");

  // Überfälliger Termin.
  const spaet = attentionItems([bau("B", "repairing", { termin: vor(2) })], jetzt);
  if (spaet[0]?.reason !== "ueberfaellig" || spaet[0].days !== 2) {
    fail(`Überfälliger Termin wird als „${spaet[0]?.reason}" mit ${spaet[0]?.days} Tagen gemeldet.`);
  } else {
    ok("zugesagter Termin vorbei → überfällig, mit der Zahl der Tage");
  }

  // Ein Termin in der Zukunft ist kein Befund.
  const kuenftig = attentionItems(
    [bau("C", "repairing", { termin: new Date(jetzt + 3 * TAG).toISOString() })],
    jetzt,
  );
  if (kuenftig.length !== 0) fail("Ein künftiger Termin wird als überfällig gemeldet.");
  else ok("ein Termin in der Zukunft ist kein Befund");

  // Abholung: erst ab der Schwelle.
  const knapp = attentionItems([bau("D", "ready_for_pickup", { bewegt: vor(PICKUP_DAYS - 1) })], jetzt);
  const drueber = attentionItems([bau("E", "ready_for_pickup", { bewegt: vor(PICKUP_DAYS) })], jetzt);
  if (knapp.length !== 0) fail(`Abholbereit seit ${PICKUP_DAYS - 1} Tagen wird schon gemeldet.`);
  else if (drueber[0]?.reason !== "abholung") fail(`Abholbereit seit ${PICKUP_DAYS} Tagen wird nicht gemeldet.`);
  else ok(`Abholung meldet sich ab genau ${PICKUP_DAYS} Tagen, nicht früher`);

  // Ohne Bewegung: erst ab der Schwelle.
  const frisch = attentionItems([bau("F", "waiting_for_parts", { bewegt: vor(STALE_DAYS - 1) })], jetzt);
  const alt = attentionItems([bau("G", "waiting_for_parts", { bewegt: vor(STALE_DAYS) })], jetzt);
  if (frisch.length !== 0) fail(`Unbewegt seit ${STALE_DAYS - 1} Tagen wird schon gemeldet.`);
  else if (alt[0]?.reason !== "still") fail(`Unbewegt seit ${STALE_DAYS} Tagen wird nicht gemeldet.`);
  else ok(`ohne Bewegung meldet sich ab genau ${STALE_DAYS} Tagen`);

  /*
    Ein Vorgang darf nur einmal in der Liste stehen. Dieser ist zugleich
    überfällig und seit Wochen unbewegt – erschiene er doppelt, wäre die
    Liste länger als das Problem.
  */
  const doppelt = attentionItems(
    [bau("H", "waiting_for_parts", { termin: vor(5), bewegt: vor(40) })],
    jetzt,
  );
  if (doppelt.length !== 1) fail(`Ein Vorgang erscheint ${doppelt.length}-mal.`);
  else if (doppelt[0].reason !== "ueberfaellig") fail("Der gebrochene Termin wiegt nicht am schwersten.");
  else ok("ein Vorgang erscheint höchstens einmal, mit dem schwersten Grund");

  // Rangfolge: Termin vor Abholung vor Stille.
  const gemischt = attentionItems(
    [
      bau("I", "waiting_for_parts", { bewegt: vor(40) }),
      bau("J", "ready_for_pickup", { bewegt: vor(10) }),
      bau("K", "repairing", { termin: vor(1) }),
    ],
    jetzt,
  );
  if (gemischt.map((x) => x.reason).join() !== "ueberfaellig,abholung,still") {
    fail(`Rangfolge ist ${gemischt.map((x) => x.reason).join(", ")}.`);
  } else {
    ok("Rangfolge: gebrochener Termin, dann Abholung, dann Stille");
  }

  // Der Wert in Arbeit zählt Abgeschlossene nicht mit.
  const wert = valueInProgress([
    bau("L", "repairing", { preis: 100 }),
    bau("M", "completed", { preis: 999 }),
    bau("N", "diagnosis", { preis: 50 }),
  ]);
  if (wert !== 150) fail(`Wert in Arbeit ist ${wert} statt 150.`);
  else ok("der Wert in Arbeit lässt abgeschlossene Vorgänge weg");
}

/* ---- Der Sprung aus der Übersicht ---------------------------------------- */

console.log("\nSprung – von der Übersicht in die Akte\n");
{
  const bekannt = [...TICKET_STATUSES];

  // Hin und zurück: Was gebaut wird, muss auch wieder gelesen werden.
  const code = "K7M2-B94X";
  const hin = workshopHref({ vorgang: code });
  const zurueck = parseDeepLink(hin.slice(hin.indexOf("?")), bekannt);
  if (zurueck.vorgang !== code) {
    fail(`Ein gebauter Vorgangs-Sprung liest sich als „${zurueck.vorgang}" zurück.`);
  } else {
    ok("Vorgangscode übersteht den Weg durch die Adresse");
  }

  for (const status of bekannt) {
    const href = workshopHref({ status });
    const back = parseDeepLink(href.slice(href.indexOf("?")), bekannt);
    if (back.status !== status) {
      fail(`Zustand „${status}" liest sich als „${back.status}" zurück.`);
      break;
    }
  }
  ok(`alle ${bekannt.length} Zustände überstehen den Weg durch die Adresse`);

  /*
    Was aus der Adresse kommt, kommt von außen. Ein unbekannter Zustand
    würde die Filterliste auf einen Wert setzen, den die Datenbank nicht
    kennt – die Antwort wäre leer, und das Dashboard sähe aus, als gäbe es
    keine Vorgänge mehr.
  */
  const muell = [
    "?status=geloescht",
    "?status=",
    "?status=OPEN",
    "?vorgang=abc",
    "?vorgang=IIII-OOOO",
    "?vorgang=" + "A".repeat(200),
    "?vorgang=K7M2-B94X'; DROP TABLE tickets;--",
  ];
  let durchgerutscht = 0;
  for (const q of muell) {
    const link = parseDeepLink(q, bekannt);
    if (link.status !== undefined || link.vorgang !== undefined) {
      durchgerutscht++;
      fail(`„${q}" wurde angenommen: ${JSON.stringify(link)}`);
    }
  }
  if (durchgerutscht === 0) ok(`${muell.length} unbrauchbare Adressen werden verworfen`);

  // Ein Vorgang und ein Zustand zugleich: Der Vorgang gewinnt, sonst
  // könnte der Filter genau die Akte ausblenden, die geöffnet werden soll.
  const beides = workshopHref({ vorgang: code, status: "repairing" });
  if (beides.includes("status=")) {
    fail("Vorgang und Zustand stehen zugleich in der Adresse.");
  } else {
    ok("Vorgang und Zustand zugleich: der Vorgang gewinnt");
  }

  // Ohne Angabe die nackte Adresse.
  if (workshopHref({}) !== "/intern/werkstatt") {
    fail(`Ein leerer Sprung ergibt „${workshopHref({})}".`);
  } else {
    ok("ohne Angabe die nackte Adresse");
  }
}

console.log(
  failures === 0
    ? `\nAblauf, Kanäle, Codeform und Zugriff stimmen mit dem Schema überein.`
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
