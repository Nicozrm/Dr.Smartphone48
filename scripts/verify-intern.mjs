/*
  Prüft die Übergabe zwischen den internen Werkzeugen.

  Der interne Bereich hat seit Neuestem einen Arbeitsweg: Aus einem Vorgang
  entsteht eine Rechnung, aus demselben Vorgang ein Reparaturzertifikat. Das
  spart zwei Abschriften – und schafft dafür drei Stellen, an denen still
  etwas Falsches durchrutschen kann:

  1. **Der Cent.** Der Vorgang führt Euro, das Rechnungswerkzeug ganzzahlige
     Cent. Genau an dieser Naht entsteht der Fehler, gegen den verify:invoice
     gebaut ist – nur eben eine Ebene früher.

  2. **Die Reparaturart.** `RepairKind` (Gerätekatalog) und `CertRepair`
     (eingefrorenes Binärformat des Zertifikats) sind zwei Aufzählungen mit
     denselben acht Werten. Die Zuordnung ist nur erlaubt, solange das gilt.
     Driften sie auseinander, setzt das Zertifikat lautlos das falsche Bit,
     und der Beleg behauptet eine andere Reparatur als die durchgeführte.

  3. **Was mitgeht.** Ein Vorgang trägt interne Vermerke, Zustand, Historie
     und Kontaktwege. Auf eine Rechnung gehört davon nichts. Was die Übergabe
     mitnimmt, steht deshalb als Liste fest und wird hier dagegen gehalten.

  Aufruf: npm run verify:intern
*/
import { CERT_REPAIRS } from "../lib/cert/format.ts";
import { brands, repairMeta } from "../lib/data/devices.ts";
import {
  REPAIR_TAX_RATE,
  buildHandoff,
  euroToCents,
  invoiceGrossCents,
  peekHandoff,
  toCertificateRepairs,
  toInvoiceDevice,
  toInvoiceLines,
  toInvoiceParty,
} from "../lib/intern/handoff.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};
const ok = (text) => console.log(`  ok    ${text}`);

/* ---- 1. Die beiden Aufzählungen ---------------------------------------- */

console.log("Reparaturarten – Gerätekatalog gegen Zertifikatsformat\n");
{
  /*
    `RepairKind` ist ein Typ und zur Laufzeit nicht vorhanden. Die Liste
    kommt deshalb aus `repairMeta`: Das ist ein `Record<RepairKind, …>`, der
    Übersetzer verlangt also für jede Art genau einen Eintrag – die Schlüssel
    **sind** die Aufzählung, nur eben zur Laufzeit lesbar.

    Verglichen werden Mengen, nicht Reihenfolgen. Die Zuordnung geht über den
    Wert (`format.ts` sucht ihn mit `indexOf`), nicht über den Index; eine
    Reihenfolgengleichheit zu verlangen wäre eine Forderung, die niemand
    braucht – und die beim nächsten sinnvollen Umsortieren grundlos
    anschlüge.
  */
  const katalog = Object.keys(repairMeta);
  const zertifikat = [...CERT_REPAIRS];

  /* Die tragende Richtung: Jede Art, die der Betrieb verkauft, muss das
     Zertifikatsformat auch ausdrücken können. Fehlt eine, setzt die
     Zuordnung ein Bit, das es nicht gibt – der Beleg beglaubigte dann eine
     andere Reparatur als die durchgeführte. */
  const unbekannt = katalog.filter((k) => !zertifikat.includes(k));
  if (unbekannt.length) {
    fail(
      `Das Zertifikatsformat kennt diese Reparaturarten nicht: ${unbekannt.join(", ")} – die Übergabe setzt dort das falsche Bit.`,
    );
  } else {
    ok(`alle ${katalog.length} Reparaturarten des Katalogs kennt das Zertifikat`);
  }

  /* Die andere Richtung ist kein Fehler: `CERT_REPAIRS` ist eingefroren,
     damit alte Belege prüfbar bleiben. Eine Art, die der Betrieb nicht mehr
     anbietet, darf dort stehen bleiben. Gemeldet wird sie trotzdem. */
  const nichtMehr = zertifikat.filter((k) => !katalog.includes(k));
  if (nichtMehr.length) {
    console.log(
      `        Hinweis: nur noch im Zertifikatsformat, nicht mehr im Katalog: ${nichtMehr.join(", ")}`,
    );
  }

  // Jede Art muss auch eine Beschriftung haben, sonst steht der Schlüssel
  // als Positionstext auf der Rechnung.
  const ohneLabel = katalog.filter((k) => !repairMeta[k]?.label);
  if (ohneLabel.length) {
    fail(`Ohne Beschriftung im Katalog: ${ohneLabel.join(", ")}`);
  } else {
    ok("jede Reparaturart trägt eine Beschriftung für die Positionszeile");
  }
}

/* ---- 2. Der Cent ------------------------------------------------------- */

console.log("\nEuro → Cent – die Naht zwischen Vorgang und Rechnung\n");
{
  /*
    Die Fälle, an denen Gleitkomma scheitert. `199.9 * 100` ist in IEEE-754
    nicht 19990, sondern 19989.999999999996 – mit `Math.trunc` würde daraus
    19989, und der Kunde bekäme eine Rechnung, die einen Cent unter dem
    zugesagten Festpreis liegt.

    Hier standen zuerst zusätzlich 1,005 € → 101 und 2,675 € → 268 als „die bekannten
    Rundungsfälle“. Beides war doppelt falsch: `1.005 * 100` ist in
    IEEE-754 nicht 100,5, sondern 100,49999999999999 – die erwartete Zahl
    gibt die Arithmetik gar nicht her. Und vor allem kommt ein halber Cent
    nie an: Ein Vorgang trägt Festpreise aus dem Gerätekatalog, und die sind
    auf ganze Cent gepflegt. Ein Sollwert für einen Fall, den es nicht gibt,
    prüft nichts und schlägt trotzdem an.
  */
  const faelle = [
    [0, 0],
    [1, 100],
    [19.9, 1990],
    [199.9, 19990],
    [129, 12900],
    [0.07, 7],
    [0.29, 29],
    [1234.56, 123456],
  ];
  let centFehler = null;
  for (const [euro, cent] of faelle) {
    const got = euroToCents(euro);
    if (got !== cent) centFehler = `${euro} € → ${got} statt ${cent} Cent`;
    if (!Number.isInteger(got)) centFehler = `${euro} € ergibt ${got} – kein ganzer Cent`;
  }
  if (centFehler) fail(centFehler);
  else ok(`${faelle.length} Beträge, alle auf den ganzen Cent`);

  // Und über die ganze Preisspanne: nie gebrochen, nie negativ.
  let krumm = 0;
  for (let c = 0; c <= 200000; c++) {
    const got = euroToCents(c / 100);
    if (!Number.isInteger(got) || got !== c) krumm++;
  }
  if (krumm) fail(`${krumm} Beträge von 0 bis 2.000 € gehen bei Euro → Cent → Euro verloren.`);
  else ok("jeder Betrag von 0,00 € bis 2.000,00 € kommt unverändert zurück");

  /*
    Die eigentliche Probe: die Preise, die tatsächlich vorkommen.

    Erfundene Beträge prüfen eine erfundene Anforderung. Der Vorgang trägt
    Festpreise aus `lib/data/devices.ts` – also werden genau die durch die
    Naht geschickt.
  */
  const echtePreise = [];
  for (const brand of brands) {
    for (const model of brand.models) {
      for (const preis of Object.values(model.prices)) echtePreise.push(preis);
    }
  }
  const nichtGanz = echtePreise.filter((p) => {
    const cent = euroToCents(p);
    return !Number.isInteger(cent) || Math.abs(cent / 100 - p) > 1e-9;
  });
  if (!echtePreise.length) {
    fail("Der Gerätekatalog liefert keinen einzigen Preis – die Probe läuft ins Leere.");
  } else if (nichtGanz.length) {
    fail(`${nichtGanz.length} Katalogpreise überstehen Euro → Cent nicht: ${nichtGanz.slice(0, 5).join(", ")}`);
  } else {
    ok(`alle ${echtePreise.length} Preise aus dem Gerätekatalog gehen unverändert durch`);
  }
}

/* ---- 3. Die Übergabe als Ganzes ---------------------------------------- */

console.log("\nÜbergabe – was ankommt und was nicht mitgeht\n");
{
  const ticket = {
    id: "uuid-1",
    ticketCode: "K7M2-B94X",
    estimateReference: "VA-2026-0042",
    estimateQuery: "?brand=apple&model=iphone-13",
    customer: "Maria Musterfrau",
    phone: "0177 5196018",
    email: "maria@example.org",
    device: "iPhone 13",
    deviceBrandId: "apple",
    deviceModelId: "iphone-13",
    imei: "352099001761481",
    repairItems: [
      { kind: "display", label: "Displaytausch", price: 199.9, minutes: 45 },
      { kind: "battery", label: "Akkutausch", price: 79, minutes: 30 },
    ],
    totalPrice: 278.9,
    estimatedMinutes: 75,
    estimatedReadyAt: "2026-08-11T16:00:00Z",
    status: "in_repair",
    internalNote: "Kunde ist Stammkunde, Rabatt zugesagt",
    contactChannel: "email",
    createdAt: "2026-08-10T09:00:00Z",
  };

  const handoff = buildHandoff(ticket, "rechnung");

  /*
    Der Datenschutz-Teil: Was die Übergabe trägt, steht als Liste fest.
    Alles andere aus dem Vorgang – Vermerke, Zustand, Historie, Telefonnummer,
    Zeitzusagen – gehört weder auf eine Rechnung noch in ein Zertifikat.
  */
  const erlaubt = [
    "v",
    "target",
    "ticketCode",
    "customer",
    "email",
    "device",
    "imei",
    "repairs",
    "totalPrice",
  ];
  const zuviel = Object.keys(handoff).filter((k) => !erlaubt.includes(k));
  if (zuviel.length) {
    fail(`Die Übergabe trägt Felder, die nicht vorgesehen sind: ${zuviel.join(", ")}`);
  } else {
    ok(`die Übergabe trägt genau ${erlaubt.length} Felder, keines mehr`);
  }

  const alsText = JSON.stringify(handoff);
  const verboten = [
    ["internalNote", ticket.internalNote],
    ["Telefonnummer", ticket.phone],
    ["Zustand", ticket.status],
    ["Zeitzusage", ticket.estimatedReadyAt],
  ];
  let durchgerutscht = null;
  for (const [name, wert] of verboten) {
    if (wert && alsText.includes(wert)) durchgerutscht = name;
  }
  if (durchgerutscht) fail(`${durchgerutscht} steht in der Übergabe.`);
  else ok("kein interner Vermerk, keine Telefonnummer, kein Zustand, keine Zusage");

  /* Die Positionen müssen sich auf die Zusage des Vorgangs summieren. Ein
     Cent Abweichung ist hier keine Feinheit: Auf dem Ticket steht ein
     Festpreis, den der Kunde gelesen hat. */
  const lines = toInvoiceLines(handoff);
  if (lines.length !== ticket.repairItems.length) {
    fail(`${lines.length} Positionen aus ${ticket.repairItems.length} Reparaturen.`);
  } else if (invoiceGrossCents(handoff) !== euroToCents(ticket.totalPrice)) {
    fail(
      `Positionen ergeben ${invoiceGrossCents(handoff)} Cent, der Vorgang sagt ${euroToCents(ticket.totalPrice)} Cent zu.`,
    );
  } else {
    ok(`${lines.length} Positionen, Summe = zugesagter Festpreis (${ticket.totalPrice} €)`);
  }

  // Jede Position braucht Text und Steuersatz – sonst ist die Rechnung nach
  // § 14 UStG unvollständig.
  const ohneText = lines.filter((l) => !l.title.trim());
  const falscherSatz = lines.filter((l) => l.taxRate !== REPAIR_TAX_RATE);
  if (ohneText.length) fail(`${ohneText.length} Positionen ohne Bezeichnung.`);
  else if (falscherSatz.length) fail(`${falscherSatz.length} Positionen ohne den erwarteten Steuersatz.`);
  else ok(`jede Position mit Bezeichnung und ${REPAIR_TAX_RATE} % Steuer`);

  // Bestimmt: dieselbe Übergabe muss dieselbe Rechnung ergeben.
  if (JSON.stringify(toInvoiceLines(handoff)) !== JSON.stringify(lines)) {
    fail("Zweimal dieselbe Übergabe ergibt zwei verschiedene Rechnungen.");
  } else {
    ok("dieselbe Übergabe ergibt dieselben Positionen");
  }

  /* Der Empfänger: Name ja, Anschrift nein. Eine erfundene Anschrift wäre
     auf einer Rechnung ein Formfehler mit Ansage. */
  const party = toInvoiceParty(handoff);
  if (party.name !== ticket.customer) {
    fail("Der Name des Kunden kommt nicht an.");
  } else if (party.street || party.zip || party.city) {
    fail("Die Übergabe erfindet eine Anschrift, die der Vorgang nicht kennt.");
  } else if (party.reference !== ticket.ticketCode) {
    fail("Der Vorgangscode steht nicht als Bezug auf der Rechnung.");
  } else {
    ok("Name und Vorgangscode kommen an, die Anschrift bleibt leer");
  }

  const device = toInvoiceDevice(handoff);
  if (device.model !== ticket.device || device.imei !== ticket.imei) {
    fail("Modell oder IMEI kommen nicht am Rechnungskopf an.");
  } else {
    ok("Modell und IMEI stehen am Rechnungskopf");
  }

  /* Das Zertifikat bindet an die IMEI – die Reparaturarten müssen exakt
     dieselben sein, sonst beglaubigt der Beleg etwas anderes. */
  const certRepairs = toCertificateRepairs(handoff);
  const erwartet = ticket.repairItems.map((r) => r.kind);
  if (JSON.stringify(certRepairs) !== JSON.stringify(erwartet)) {
    fail(`Das Zertifikat bekäme ${JSON.stringify(certRepairs)} statt ${JSON.stringify(erwartet)}.`);
  } else if (certRepairs.some((r) => !CERT_REPAIRS.includes(r))) {
    fail("Eine übergebene Reparaturart kennt das Zertifikatsformat nicht.");
  } else {
    ok("die Reparaturarten kommen unverändert im Zertifikat an");
  }
}

/* ---- 4. Ein Vorgang ohne IMEI und ohne E-Mail --------------------------- */

console.log("\nLücken im Vorgang – kein Grund für erfundene Werte\n");
{
  const mager = {
    ticketCode: "P4TR-9WQ2",
    customer: "Ohne Angabe",
    phone: null,
    email: null,
    device: "Galaxy S23",
    imei: null,
    repairItems: [{ kind: "diagnose", label: "Diagnose", price: 0, minutes: 15 }],
    totalPrice: 0,
    status: "received",
    internalNote: null,
  };
  const handoff = buildHandoff(mager, "zertifikat");

  if (handoff.imei !== null || handoff.email !== null) {
    fail("Fehlende Angaben werden nicht als fehlend übergeben.");
  } else if (toInvoiceDevice(handoff).imei !== "") {
    fail("Eine fehlende IMEI wird zu etwas anderem als einem leeren Feld.");
  } else if (toInvoiceParty(handoff).email !== "") {
    fail("Eine fehlende E-Mail wird zu etwas anderem als einem leeren Feld.");
  } else {
    ok("fehlende IMEI und E-Mail bleiben leer, statt erfunden zu werden");
  }

  const lines = toInvoiceLines(handoff);
  if (lines[0].unitCents !== 0) {
    fail("Eine kostenlose Diagnose bekommt einen Preis.");
  } else if (lines[0].note.includes("IMEI")) {
    fail("Ohne IMEI steht trotzdem „IMEI“ in der Positionszeile.");
  } else {
    ok("kostenlose Diagnose bleibt bei null, die Zusatzzeile bleibt ohne IMEI");
  }
}

/* ---- 5. Lesen ohne Nebenwirkung ---------------------------------------- */

console.log("\nLesen – ohne Speicher, ohne Absturz\n");
{
  /* Ohne sessionStorage (Server, privater Modus) darf nichts werfen: Die
     Werkzeuge müssen auch dann laufen, dann eben ohne Übergabe. */
  const hatteSpeicher = typeof globalThis.sessionStorage !== "undefined";
  let ergebnis;
  try {
    ergebnis = peekHandoff("rechnung");
  } catch (e) {
    ergebnis = `THROW: ${e.message}`;
  }
  if (typeof ergebnis === "string") {
    fail(`peekHandoff wirft ohne Speicher: ${ergebnis}`);
  } else if (ergebnis !== null) {
    fail("peekHandoff liefert ohne Speicher etwas anderes als null.");
  } else {
    ok(`ohne sessionStorage${hatteSpeicher ? "" : " (wie hier)"} liefert peekHandoff null, ohne zu werfen`);
  }
}

/* ---- Ergebnis ----------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.log(`${failures} Fehler. Die Übergabe trägt etwas anderes, als sie soll.`);
  process.exit(1);
}
console.log("Die Übergabe trägt genau das, was sie soll.");
