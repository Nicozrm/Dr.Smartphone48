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

/**
 * Liest die Sollwerte aus der Vorprüfung am Kopf der ersten Migration.
 *
 * Die Vorprüfung bricht ab, wenn in der Zieldatenbank schon ein fremder
 * `ticket_status` liegt. Dafür trägt sie die erwarteten Werte selbst – und
 * damit steht die Liste im Projekt ein drittes Mal. Läuft sie davon, weist
 * die Vorprüfung eine Datenbank ab, die in Ordnung ist: ein Wächter, der
 * den Falschen aussperrt.
 */
function guardValues() {
  const match = sql.match(/v_erwartet\s+text\[\]\s*:=\s*array\[([^\]]*)\]/i);
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

const guardStatuses = guardValues();
if (!guardStatuses) {
  fail(
    "Der ersten Migration fehlt die Vorprüfung (`v_erwartet text[] := array[…]`).",
  );
} else if (guardStatuses.join(",") !== [...TICKET_STATUSES].join(",")) {
  fail("Die Vorprüfung erwartet eine andere Liste als TypeScript:");
  console.log(`         TypeScript:  ${TICKET_STATUSES.join(", ")}`);
  console.log(`         Vorprüfung:  ${guardStatuses.join(", ")}`);
} else {
  ok("die Vorprüfung der Migration kennt dieselben Zustände");
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

console.log(
  failures === 0
    ? `\nAblauf, Kanäle, Codeform und Zugriff stimmen mit dem Schema überein.`
    : `\n${failures} Abweichung(en).`,
);
process.exit(failures === 0 ? 0 : 1);
