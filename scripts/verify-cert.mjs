/*
  Prüft das Reparaturzertifikat gegen das, was die Seite darüber behauptet.

  Auf /pruefen steht ein Satz, der für eine Werkstatt ungewöhnlich weit geht:
  „Hätte irgendjemand nachträglich eine Position geändert – auch wir –,
  stünde hier das Gegenteil.“ Das ist eine Zusage über das Verhalten von
  Software, und sie lässt sich nachrechnen. Also wird sie nachgerechnet.

  Geprüft wird:

  – Das Format überlebt einen Hin- und Rückweg ohne Verlust, auch an den
    Rändern (leere Felder, volle Felder, Umlaute, alle 40 Positionen belegt).
  – Eine veränderte Position zerstört die Unterschrift. Jedes einzelne Bit
    des Inhalts wird dafür angefasst, nicht bloß eines.
  – Der Beleg passt in einen QR-Code, den ein Telefon von Thermopapier liest.
  – Die Reihenfolge der Reparaturarten stimmt mit dem Gerätekatalog überein;
    sie ist eingefroren und darf sich nicht verschieben.
  – Der veröffentlichte Schlüsselring ist in sich stimmig.
  – Im Quelltext steht kein privates Schlüsselmaterial, und kein öffentlicher
    Schlüssel liegt wirkungslos in einem Kommentar.

  Die letzte Prüfung hat einen Anlass. Die Sicherungsdatei aus
  /intern/zertifikat enthält beide Hälften des Schlüssels; sie sieht der
  Zeile, die nach `lib/cert/keys.ts` gehört, zum Verwechseln ähnlich. Genau
  diese Verwechslung ist passiert: Der ganze Dateiinhalt landete im
  Kommentar über `certKeys`, mit der privaten Hälfte, in einem öffentlichen
  Repository. Zugleich stand die öffentliche Zeile ebenfalls in einem
  Kommentar – der Ring war leer, sah aber eingerichtet aus.

  Beide Fehler zusammen ergaben den schlimmsten Fall: Der Schlüssel war
  offengelegt, und niemand konnte es an der Website ablesen. Dieses Skript
  lief dabei durch und meldete „Alles geprüft“.

  Aufruf: npm run verify:cert
*/
import fs from "node:fs";
import path from "node:path";
import {
  BINDING_BYTES,
  CERT_REPAIRS,
  CHECK_NA,
  CHECK_NOTED,
  CHECK_OPEN,
  CHECK_PASSED,
  HEADER_BYTES,
  SIGNATURE_BYTES,
  decodeCertificate,
  encodeCertificate,
  encodeSignable,
  fromBase64Url,
  toBase64Url,
} from "../lib/cert/format.ts";
import {
  bindingMatches,
  deviceBinding,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
  sign,
  verify,
} from "../lib/cert/crypto.ts";
import { fingerprint, signatureGlyph } from "../lib/cert/glyph.ts";
import { certKeys } from "../lib/cert/keys.ts";
import { checkpointCount } from "../lib/data/inspection.ts";
import { repairMeta } from "../lib/data/devices.ts";
import { encodeQr } from "../lib/qr.ts";
import { site } from "../lib/site.ts";

let failures = 0;
const fail = (text) => {
  failures++;
  console.log(`  FEHLER ${text}`);
};
const ok = (text) => console.log(`  ok    ${text}`);

/* ---- 1. Die Reihenfolge der Reparaturarten ------------------------------ */

console.log("Reparaturarten – eingefrorene Reihenfolge gegen den Katalog\n");
{
  const katalog = Object.keys(repairMeta).sort();
  const beleg = [...CERT_REPAIRS].sort();
  if (katalog.join() !== beleg.join()) {
    fail(
      `CERT_REPAIRS und repairMeta enthalten nicht dieselben Arten.\n` +
        `        Katalog: ${katalog.join(", ")}\n        Beleg:   ${beleg.join(", ")}`,
    );
  } else {
    ok(`${CERT_REPAIRS.length} Arten, deckungsgleich mit repairMeta`);
  }
  if (CERT_REPAIRS.length > 8) {
    fail("Mehr als acht Arten passen nicht in die Bitmaske in Byte 4.");
  }
}

/* ---- 2. Hin und zurück -------------------------------------------------- */

console.log("\nFormat – hin und zurück ohne Verlust\n");

const beispiele = [
  {
    name: "voll belegt",
    cert: {
      keyId: 7,
      issued: new Date(Date.UTC(2026, 2, 14)),
      repairs: ["display", "battery", "water"],
      checks: Array.from({ length: checkpointCount }, (_, i) =>
        [CHECK_PASSED, CHECK_NOTED, CHECK_NA, CHECK_OPEN][i % 4],
      ),
      binding: Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
      warrantyMonths: 12,
      model: "iPhone 14 Pro Max",
      batch: "LS-2026-0413",
      technician: "N. Z.",
    },
  },
  {
    name: "leere Textfelder",
    cert: {
      keyId: 1,
      issued: new Date(Date.UTC(2020, 0, 1)),
      repairs: [],
      checks: Array(checkpointCount).fill(CHECK_OPEN),
      binding: Uint8Array.from([0, 0, 0, 0]),
      warrantyMonths: 0,
      model: "",
      batch: "",
      technician: "",
    },
  },
  {
    name: "Umlaute und volle Längen",
    cert: {
      keyId: 255,
      issued: new Date(Date.UTC(2199, 0, 1)),
      repairs: [...CERT_REPAIRS],
      checks: Array(checkpointCount).fill(CHECK_PASSED),
      binding: Uint8Array.from([0xff, 0xff, 0xff, 0xff]),
      warrantyMonths: 255,
      // Absichtlich zu lang und voller Mehrbyte-Zeichen: Hier bricht ein
      // Kürzen auf Bytegrenze mitten in ein Zeichen.
      model: "Gerät mit übermäßig länglicher Größenbezeichnung äöüß",
      batch: "Lieferschein Nr. 2026/0413-Ä",
      technician: "Müller-Öz",
    },
  },
];

for (const { name, cert } of beispiele) {
  try {
    const signable = encodeSignable(cert, checkpointCount);
    const code = encodeCertificate(signable, new Uint8Array(SIGNATURE_BYTES));
    const back = decodeCertificate(code, checkpointCount).certificate;

    const gleich =
      back.keyId === cert.keyId &&
      back.issued.getTime() === cert.issued.getTime() &&
      back.repairs.join() === cert.repairs.join() &&
      back.checks.join() === cert.checks.join() &&
      bindingMatches(back.binding, cert.binding) &&
      back.warrantyMonths === cert.warrantyMonths &&
      // Die Textfelder dürfen gekürzt sein, aber nie beschädigt: Was
      // zurückkommt, muss ein Anfang des Eingegebenen sein.
      cert.model.startsWith(back.model) &&
      cert.batch.startsWith(back.batch) &&
      cert.technician.startsWith(back.technician);

    if (gleich) ok(`${name} (${signable.length + SIGNATURE_BYTES} Byte)`);
    else fail(`${name}: Rückweg liefert andere Daten`);

    if (back.model.includes("�") || back.batch.includes("�")) {
      fail(`${name}: beim Kürzen ist ein Zeichen zerbrochen`);
    }
  } catch (error) {
    fail(`${name}: ${error.message}`);
  }
}

/* ---- 3. base64url ------------------------------------------------------- */

console.log("\nbase64url – jede Bytefolge übersteht den Weg durch die Adresse\n");
{
  let schlecht = 0;
  for (let laenge = 0; laenge < 40; laenge++) {
    const bytes = Uint8Array.from({ length: laenge }, (_, i) => (i * 37 + laenge * 11) & 0xff);
    const back = fromBase64Url(toBase64Url(bytes));
    if (back.length !== bytes.length || back.some((b, i) => b !== bytes[i])) schlecht++;
  }
  // Genau die Zeichen, die in einer Adresse Ärger machen, dürfen nicht
  // vorkommen: + wird zum Leerzeichen, / bricht den Pfad, = überlebt manche
  // Weiterleitung nicht.
  const alle = toBase64Url(Uint8Array.from({ length: 256 }, (_, i) => i));
  if (/[+/=]/.test(alle)) fail("Die Kodierung erzeugt +, / oder = .");
  if (schlecht > 0) fail(`${schlecht} Längen kamen verändert zurück.`);
  else ok("40 Längen von 0 bis 39 Byte, verlustfrei und URL-sicher");
}

/* ---- 4. Die eigentliche Zusage: Änderung zerstört die Unterschrift ------- */

console.log("\nUnterschrift – jede Änderung am Inhalt fällt auf\n");
{
  const pair = await generateKeyPair();
  const publicRaw = await exportPublicKey(pair.publicKey);
  const publicKey = await importPublicKey(publicRaw);

  if (publicRaw.length !== 65 || publicRaw[0] !== 0x04) {
    fail(`Öffentlicher Schlüssel hat ${publicRaw.length} Byte (erwartet 65, Präfix 0x04).`);
  } else {
    ok(`öffentlicher Schlüssel 65 Byte → ${toBase64Url(publicRaw).length} Zeichen im Ring`);
  }

  const cert = beispiele[0].cert;
  const signable = encodeSignable({ ...cert, keyId: 1 }, checkpointCount);
  const signature = await sign(pair.privateKey, signable);

  if (signature.length !== SIGNATURE_BYTES) {
    fail(`Signatur hat ${signature.length} Byte statt ${SIGNATURE_BYTES}.`);
  }
  if (!(await verify(publicKey, signature, signable))) {
    fail("Die eigene Unterschrift lässt sich nicht prüfen.");
  } else {
    ok("die unveränderte Unterschrift gilt");
  }

  // Jedes Bit des Inhalts einzeln kippen. Nicht ein Byte, nicht eine
  // Stichprobe: Wenn irgendwo im Datensatz ein Bit läge, das die Signatur
  // nicht abdeckt, wäre genau dort die Stelle zum Fälschen.
  let durchgerutscht = 0;
  for (let byte = 0; byte < signable.length; byte++) {
    for (let bit = 0; bit < 8; bit++) {
      const veraendert = Uint8Array.from(signable);
      veraendert[byte] ^= 1 << bit;
      if (await verify(publicKey, signature, veraendert)) {
        durchgerutscht++;
        if (durchgerutscht <= 3) {
          fail(`Bit ${bit} in Byte ${byte} geändert – die Unterschrift gilt trotzdem.`);
        }
      }
    }
  }
  if (durchgerutscht === 0) {
    ok(`${signable.length * 8} einzeln gekippte Bits, jedes fiel auf`);
  } else {
    fail(`${durchgerutscht} veränderte Fassungen wurden als gültig anerkannt.`);
  }

  // Und eine veränderte Unterschrift zu einem unveränderten Inhalt.
  const falsch = Uint8Array.from(signature);
  falsch[0] ^= 0x01;
  if (await verify(publicKey, falsch, signable)) {
    fail("Eine veränderte Unterschrift wurde anerkannt.");
  } else {
    ok("eine veränderte Unterschrift fällt auf");
  }

  // Ein fremder Schlüssel darf nicht passen.
  const fremd = await generateKeyPair();
  if (await verify(fremd.publicKey, signature, signable)) {
    fail("Ein fremder Schlüssel prüft unsere Unterschrift erfolgreich.");
  } else {
    ok("ein fremder Schlüssel passt nicht");
  }

  /* ---- 5. Passt der Beleg in einen QR-Code? ---- */

  console.log("\nQR-Code – der schlimmste Fall muss vom Beleg lesbar sein\n");

  const schlimmst = encodeSignable(
    {
      keyId: 255,
      issued: new Date(Date.UTC(2099, 11, 31)),
      repairs: [...CERT_REPAIRS],
      checks: Array(checkpointCount).fill(CHECK_NOTED),
      binding: Uint8Array.from([0xff, 0xff, 0xff, 0xff]),
      warrantyMonths: 255,
      model: "M".repeat(40),
      batch: "B".repeat(40),
      technician: "T".repeat(20),
    },
    checkpointCount,
  );
  const code = encodeCertificate(schlimmst, signature);
  const url = `${site.url}/pruefen#${code}`;
  const qr = encodeQr(url);

  console.log(`        ${url.length} Zeichen → Version ${qr.version} (${qr.size} Module)`);
  if (qr.version > 11) {
    fail(
      `Version ${qr.version} ist zu fein für Thermopapier. Die Längengrenzen ` +
        "in encodeSignable müssen enger werden.",
    );
  } else {
    ok(`Version ${qr.version} – auf 30 mm sind das ${(30 / qr.size).toFixed(2)} mm je Modul`);
  }
}

/* ---- 6. Gerätebindung --------------------------------------------------- */

console.log("\nGerätebindung – vier Byte, die binden ohne zu verraten\n");
{
  const a = await deviceBinding("356938035643809", BINDING_BYTES);
  const b = await deviceBinding("356 938 035 643 809", BINDING_BYTES);
  const c = await deviceBinding("356938035643800", BINDING_BYTES);

  if (!bindingMatches(a, b)) fail("Leerzeichen in der IMEI ändern die Bindung.");
  else ok("Schreibweise mit Leerzeichen und Strichen ergibt dieselbe Bindung");

  if (bindingMatches(a, c)) fail("Zwei verschiedene IMEIs ergeben dieselbe Bindung.");
  else ok("eine andere IMEI ergibt eine andere Bindung");

  if (a.length !== 4) fail(`Die Bindung hat ${a.length} Byte statt 4.`);

  let zuKurz = false;
  try {
    await deviceBinding("12345", BINDING_BYTES);
    zuKurz = true;
  } catch {
    /* erwartet */
  }
  if (zuKurz) fail("Eine zu kurze IMEI wurde angenommen.");
  else ok("eine zu kurze Nummer wird abgewiesen");
}

/* ---- 7. Was der Leser abweisen muss ------------------------------------- */

console.log("\nAbwehr – kaputte Codes dürfen nicht als Beleg durchgehen\n");
{
  const cases = [
    ["leer", ""],
    ["zu kurz", "AQEC"],
    ["fremdes Zeichen", "AQEC!!!!"],
    ["falsche Formatversion", toBase64Url(new Uint8Array(HEADER_BYTES + 3 + SIGNATURE_BYTES).fill(9))],
  ];
  for (const [name, input] of cases) {
    try {
      decodeCertificate(input, checkpointCount);
      fail(`„${name}“ wurde als Zertifikat gelesen.`);
    } catch (error) {
      if (!(error instanceof Error) || error.message.length < 10) {
        fail(`„${name}“ wirft ohne verständlichen Text.`);
      } else {
        ok(`„${name}“ → ${error.message}`);
      }
    }
  }
}

/* ---- 8. Kein privates Schlüsselmaterial im Quelltext --------------------- */

console.log("\nGeheimnisse – die private Hälfte gehört nirgends in dieses Repository\n");
{
  /** Was nicht durchsucht wird: fremder Code, Bauergebnisse, die Historie. */
  const SKIP = new Set([
    "node_modules",
    ".git",
    ".next",
    ".open-next",
    ".vercel",
    ".wrangler",
    "out",
  ]);

  /**
   * Der private Skalar eines P-256-Schlüssels ist 32 Byte, base64url also
   * 43 Zeichen. Nach ihm allein zu suchen wäre zu grob – ein `d`-Attribut
   * an einem SVG-Pfad sieht ähnlich aus. Deshalb muss im selben Feld auch
   * das Umfeld eines JWK stehen (`kty`, `crv`, `key_ops`).
   */
  const JWK_SCALAR = /["']?\bd["']?\s*:\s*["'][A-Za-z0-9_-]{40,50}["']/;
  const JWK_CONTEXT = /["']?\b(?:kty|crv|key_ops)["']?\s*:/;

  const PATTERNS = [
    [
      /-----BEGIN (?:EC |RSA |OPENSSH )?PRIVATE KEY-----/,
      "ein PEM-Block mit einem privaten Schlüssel",
    ],
    [
      /["']?\bkey_ops["']?\s*:\s*\[[^\]]*["']sign["']/,
      "ein JWK mit der Erlaubnis zu unterschreiben (key_ops: sign)",
    ],
  ];

  const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|css|txt|yml|yaml|html|svg)$/;

  const dateien = [];
  const sammeln = (dir) => {
    for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
      if (eintrag.name.startsWith(".") && eintrag.name !== ".github") continue;
      if (SKIP.has(eintrag.name)) continue;
      const voll = path.join(dir, eintrag.name);
      if (eintrag.isDirectory()) sammeln(voll);
      else if (TEXT.test(eintrag.name) && eintrag.name !== "package-lock.json") {
        dateien.push(voll);
      }
    }
  };
  sammeln(".");

  let gefunden = 0;
  for (const datei of dateien) {
    const quelle = fs.readFileSync(datei, "utf8");

    // Das eigene Skript nennt die Muster, nach denen es sucht.
    if (path.resolve(datei) === path.resolve("scripts/verify-cert.mjs")) continue;

    for (const [muster, grund] of PATTERNS) {
      if (muster.test(quelle)) {
        gefunden++;
        fail(`${datei}: ${grund}.`);
      }
    }
    if (JWK_SCALAR.test(quelle) && JWK_CONTEXT.test(quelle)) {
      gefunden++;
      fail(
        `${datei}: der private Skalar eines JWK („d“) steht im Quelltext.\n` +
          "        Dieser Schlüssel gilt ab sofort als offengelegt: aus dem Ring\n" +
          "        nehmen, neuen erzeugen, alten nie wieder unterschreiben lassen.",
      );
    }
  }
  if (gefunden === 0) {
    ok(`${dateien.length} Dateien durchsucht, kein privates Schlüsselmaterial`);
  }
}

/* ---- 8b. Kein Schlüssel, der nur so aussieht ---------------------------- */

console.log("\nSchlüsselring\n");
{
  /*
    Der zweite Teil derselben Verwechslung: Die öffentliche Zeile landet im
    Kommentar über `certKeys` statt im Array. Nichts schlägt fehl – die
    Datei übersetzt, der Ring ist leer, und die Prüfseite meldet weiterhin
    „Schlüssel nicht hinterlegt“. Wer die Zeile eingefügt hat, hält die
    Einrichtung für erledigt.

    Ein roher P-256-Punkt ist 65 Byte, base64url also 87 Zeichen. Jede
    solche Zeichenkette in der Datei muss auch im Ring stehen.
  */
  const quelle = fs.readFileSync("lib/cert/keys.ts", "utf8");
  const imRing = new Set(certKeys.map((k) => k.publicKey));
  const verwaist = [...quelle.matchAll(/[A-Za-z0-9_-]{87}/g)]
    .map((m) => m[0])
    .filter((wert) => !imRing.has(wert));

  if (verwaist.length > 0) {
    fail(
      `In lib/cert/keys.ts steht ein öffentlicher Schlüssel, der nicht im Ring ist:\n` +
        `        ${verwaist[0].slice(0, 24)}…\n` +
        "        Vermutlich steht er in einem Kommentar. Ein auskommentierter\n" +
        "        Schlüssel richtet nichts ein – der Eintrag gehört in das Array.",
    );
  } else {
    ok("kein öffentlicher Schlüssel liegt wirkungslos neben dem Ring");
  }
}

{
  const ids = new Set();
  for (const key of certKeys) {
    if (ids.has(key.id)) fail(`Schlüssel-Kennung ${key.id} kommt doppelt vor.`);
    ids.add(key.id);
    if (key.id < 1 || key.id > 255) fail(`Kennung ${key.id} passt nicht in ein Byte.`);
    let raw;
    try {
      raw = fromBase64Url(key.publicKey);
    } catch (error) {
      fail(`Schlüssel ${key.id}: ${error.message}`);
      continue;
    }
    if (raw.length !== 65 || raw[0] !== 0x04) {
      fail(`Schlüssel ${key.id} ist kein roher P-256-Punkt (65 Byte, Präfix 0x04).`);
    }
    if (!key.note || key.note.length < 5) fail(`Schlüssel ${key.id} hat keine Erläuterung.`);
    if (Number.isNaN(Date.parse(key.since))) fail(`Schlüssel ${key.id}: ungültiges since.`);
  }
  const aktiv = certKeys.filter((k) => !k.until);
  if (aktiv.length > 1) {
    fail(`${aktiv.length} Schlüssel ohne Enddatum – es darf nur einer aktiv sein.`);
  }
  if (certKeys.length === 0) {
    console.log(
      "  offen  Der Schlüsselring ist leer. Bis der Betrieb seinen Schlüssel\n" +
        "         veröffentlicht hat, kann niemand außerhalb der Werkstatt einen\n" +
        "         Beleg prüfen. Einrichtung: /intern/zertifikat.",
    );
  } else {
    ok(`${certKeys.length} Schlüssel, ${aktiv.length} davon aktiv`);
  }
}

/* ---- 9. Signaturbild und Kurzform --------------------------------------- */

console.log("\nSignaturbild – zwei Signaturen, zwei Figuren\n");
{
  const eins = Uint8Array.from({ length: 64 }, (_, i) => (i * 7) & 0xff);
  const zwei = Uint8Array.from(eins);
  zwei[13] ^= 0xff;

  const a = signatureGlyph(eins);
  const b = signatureGlyph(zwei);
  if (a.hull === b.hull) fail("Zwei verschiedene Signaturen ergeben dasselbe Bild.");
  else ok("ein geändertes Byte ändert die Figur");

  if (!a.spokes || !a.hull || !a.inner) fail("Das Bild ist unvollständig.");

  // Die Kurzform darf keine der vier verwechselbaren Ziffern enthalten –
  // dieselbe Regel wie beim Vorgangscode.
  /*
    Die Proben müssen sich wirklich unterscheiden. Der erste Anlauf hier
    füllte sie mit `(i * 31 + j * 17) & 0xff` – und weil 31 zu 256 teilerfremd
    ist, wiederholte sich die Folge alle 256 Durchgänge exakt. Das Skript
    meldete daraufhin 256 statt 500 Kurzformen und beschuldigte die
    Kurzform, obwohl der Fehler in der Probe saß. Deshalb steht der Zähler
    jetzt zusätzlich in den ersten beiden Byte.
  */
  const proben = new Set();
  for (let i = 0; i < 500; i++) {
    const s = Uint8Array.from({ length: 64 }, (_, j) => (i * 31 + j * 17) & 0xff);
    s[0] = i & 0xff;
    s[1] = (i >> 8) & 0xff;
    const kurz = fingerprint(s);
    if (/[IO01]/.test(kurz)) fail(`Kurzform ${kurz} enthält ein verwechselbares Zeichen.`);
    if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(kurz)) fail(`Kurzform ${kurz} hat die falsche Form.`);
    proben.add(kurz);
  }
  if (proben.size < 495) {
    fail(`500 Signaturen ergaben nur ${proben.size} verschiedene Kurzformen.`);
  } else {
    ok(`500 Signaturen → ${proben.size} verschiedene Kurzformen`);
  }
}

/* ---- Ergebnis ----------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.log(`${failures} Fehler. Der Beleg hält nicht, was die Seite verspricht.`);
  process.exit(1);
}
console.log("Alles geprüft. Das Zertifikat hält, was auf /pruefen steht.");
