export const werkstattbrief01 = {
  subject: "Werkstattbrief 01 – was die Website inzwischen alles kann",
  preheader:
    "Vorgangsverfolgung, Dashboard, Sofortpreis, Belegwesen: einmal alles auf einen Blick.",
  text: `Werkstattbrief · Ausgabe 01

Alles, was dazugekommen ist

Die Website ist in den letzten Wochen von einer Visitenkarte zu einem Werkzeug geworden. Dieser erste Brief geht einmal durch alles – die folgenden nur noch durch das, was sich geändert hat.

Am Tresen

/intern/werkstatt – Das Werkstatt-Dashboard
Links die Liste der Vorgänge, rechts die Akte. Status ändern, Vermerk schreiben, Termin setzen – jede Änderung landet sofort auf allen offenen Geräten, ohne dass jemand neu lädt.
https://drsmartphone48.de/intern/werkstatt

/status – Der Vorgangscode ersetzt den Anruf
Wer sein Gerät abgibt, bekommt einen achtstelligen Code. Damit sieht er selbst, in welchem der acht Schritte sein Vorgang steht – ohne Konto und ohne Anmeldung.
https://drsmartphone48.de/status

/ticket – Übergabeprotokoll zum Ausdrucken
Der Kostenvoranschlag als Dokument: Vorgangsnummer, QR-Code zum Vorzeigen, IMEI-Feld mit Prüfziffernkontrolle und eine Schadenskarte.
https://drsmartphone48.de/ticket

Was Kunden selbst können

/reparatur – Sofortpreis in drei Klicks
Marke, Modell, Schaden – Festpreis und Dauer stehen sofort da.
https://drsmartphone48.de/reparatur

/check – Geräte-Check ohne App
Display, Touch, Sensoren, Mikrofon, Lautsprecher, Akku und Netz – geprüft direkt im Browser des Kunden.
https://drsmartphone48.de/check

/notfall – Soforthilfe für die erste Minute
Vier Protokolle: Wasserschaden, gebrochenes Display, totes Gerät, aufgeblähter Akku.
https://drsmartphone48.de/notfall

/ankauf – Ankaufswert mit offener Rechnung
Jeder Abzug einzeln, mit Betrag und Begründung.
https://drsmartphone48.de/ankauf

/versorgung – Wie lange ein Gerät noch Updates bekommt
Für jedes Modell im Katalog steht, bis wann es Sicherheitsupdates erhält.
https://drsmartphone48.de/versorgung

/zwilling – Akku-Coach und die Frage „reparieren oder neu?“
Der Coach rechnet das Ladeverhalten drei Jahre voraus und nennt die eine Änderung, die am meisten bringt.
https://drsmartphone48.de/zwilling

/ersatzteile – Der Unterschied, den man spüren kann
Die Eingabeverzögerung eines billigen Nachbaus wird nicht beschrieben, sondern erzeugt.
https://drsmartphone48.de/ersatzteile

Fürs Büro

/intern/rechnung – Belegwesen ohne Server
Rechnung, Kostenvoranschlag, Angebot, Gutschrift und Storno – auf einem Blatt nach DIN 5008.
https://drsmartphone48.de/intern/rechnung

Unter der Haube

Die Seite funktioniert ohne Netz. Jede Textfarbe ist nachgemessen. Über Besucher wird nichts gespeichert. Drei Auslieferungswege, eine Codebasis.

Zum Werkstatt-Dashboard: https://drsmartphone48.de/intern/werkstatt

Dr Smartphone48 · Zur Freidrichsburg 8 · 48268 Greven
0177 5196018 · Drsmartphone48268@gmail.com`,
  html: `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Werkstattbrief 01 – was die Website inzwischen alles kann</title>
<style>
  body{margin:0;padding:0;background:#f7f7f5;color:#141517;font-family:Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
  a{color:#2456e6;text-decoration:none}
  .wrap{width:600px;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e4e3;border-radius:22px;overflow:hidden}
  .pad{padding-left:40px;padding-right:40px}.mono{font-family:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase}
  h1{margin:0;color:#f5f5f3;font-size:32px;line-height:37px;letter-spacing:-.02em}h2{margin:0;color:#141517;font-size:19px;line-height:26px;letter-spacing:-.01em}p{margin:0;color:#3d4045;font-size:15px;line-height:26px}.muted{color:#5b5f64}.rule{height:1px;background:#e4e4e3}.section{padding-top:34px}.item{padding-top:26px}.btn{display:inline-block;background:#2456e6;color:#fff!important;padding:14px 30px;border-radius:999px;font-weight:600}
  @media only screen and (max-width:620px){.wrap{width:100%!important;border-radius:0}.pad{padding-left:24px!important;padding-right:24px!important}h1{font-size:26px!important;line-height:32px!important}}
  @media (prefers-color-scheme:dark){body{background:#0a0b0d!important}.wrap{background:#101114!important;border-color:#2a2c30!important}h2{color:#f5f5f3!important}p,.muted{color:#9d9fa6!important}.rule{background:#2a2c30!important}}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fff">Vorgangsverfolgung, Dashboard, Sofortpreis, Belegwesen: einmal alles auf einen Blick.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5"><tr><td style="padding:32px 12px 48px">
<table role="presentation" class="wrap" cellpadding="0" cellspacing="0" align="center">
<tr><td class="pad" style="padding-top:40px"><table width="100%"><tr><td><a href="https://drsmartphone48.de/" class="mono" style="font-size:11px;line-height:16px;color:#141517">DR SMARTPHONE48</a></td><td align="right" class="mono muted" style="font-size:11px;line-height:16px">Werkstattbrief · Ausgabe 01</td></tr></table></td></tr>
<tr><td class="pad" style="padding-top:28px"><div style="background:#101114;border-radius:22px;padding:34px 32px 36px"><div class="mono" style="font-size:11px;line-height:16px;color:#6b93ff">Ausgabe 01 · 5. August 2026</div><div style="height:16px"></div><h1>Alles, was dazugekommen ist</h1><div style="height:14px"></div><p style="color:#9d9fa6;font-size:16px">Die Website ist in den letzten Wochen von einer Visitenkarte zu einem Werkzeug geworden. Dieser erste Brief geht einmal durch alles – die folgenden nur noch durch das, was sich geändert hat.</p></div></td></tr>
${section("Am Tresen", "Drei Dinge, die den Weg vom Annehmen bis zum Abholen betreffen. Sie ersetzen keinen Handgriff, sie sparen die Rückfragen dazwischen.", [
  ["/intern/werkstatt", "Das Werkstatt-Dashboard", "Links die Liste der Vorgänge, rechts die Akte. Status ändern, Vermerk schreiben, Termin setzen – jede Änderung landet sofort auf allen offenen Geräten, ohne dass jemand neu lädt. Die Tastenkürzel stehen hinter dem Fragezeichen, und zwar dieselben, die die Tasten auch wirklich belegen.", "Dashboard öffnen", "https://drsmartphone48.de/intern/werkstatt"],
  ["/status", "Der Vorgangscode ersetzt den Anruf", "Wer sein Gerät abgibt, bekommt einen achtstelligen Code. Damit sieht er selbst, in welchem der acht Schritte sein Vorgang steht – ohne Konto und ohne Anmeldung. Nur drei Schritte lösen zusätzlich eine Nachricht aus: angenommen, wartet auf Teile, abholbereit.", "Statusseite ansehen", "https://drsmartphone48.de/status"],
  ["/ticket", "Übergabeprotokoll zum Ausdrucken", "Der Kostenvoranschlag als Dokument: Vorgangsnummer, QR-Code zum Vorzeigen, IMEI-Feld mit sofortiger Prüfziffernkontrolle und eine Schadenskarte nach dem Vorbild der Fahrzeugübergabe.", "Ansehen", "https://drsmartphone48.de/ticket"],
])}
${section("Was Kunden selbst können", "Alles davon läuft im Browser des Besuchers. Kein Konto, keine Datenbank, nichts, was den Tresen belastet – aber sieben Fragen weniger am Telefon.", [
  ["/reparatur", "Sofortpreis in drei Klicks", "Marke, Modell, Schaden – Festpreis und Dauer stehen sofort da, und die Explosionszeichnung hebt das betroffene Bauteil hervor.", "Ansehen", "https://drsmartphone48.de/reparatur"],
  ["/check", "Geräte-Check ohne App", "Display, Touch, Sensoren, Mikrofon, Lautsprecher, Akku und Netz – geprüft direkt im Browser des Kunden. Nichts davon verlässt sein Gerät.", "Ansehen", "https://drsmartphone48.de/check"],
  ["/notfall", "Soforthilfe für die erste Minute", "Vier Protokolle: Wasserschaden, gebrochenes Display, totes Gerät, aufgeblähter Akku. Jeweils zuerst das, was man lassen soll.", "Ansehen", "https://drsmartphone48.de/notfall"],
  ["/ankauf", "Ankaufswert mit offener Rechnung", "Statt einer Zahl aus der Blackbox: jeder Abzug einzeln, mit Betrag und Begründung – inklusive des Hinweises, dass privat verkaufen mehr bringt.", "Ansehen", "https://drsmartphone48.de/ankauf"],
  ["/versorgung", "Wie lange ein Gerät noch Updates bekommt", "Für jedes Modell im Katalog steht da, bis wann es Sicherheitsupdates erhält – und ob das eine Zusage des Herstellers ist oder nur ein bisher eingehaltenes Muster.", "Ansehen", "https://drsmartphone48.de/versorgung"],
  ["/zwilling", "Akku-Coach und die Frage „reparieren oder neu?“", "Der Coach rechnet das Ladeverhalten drei Jahre voraus und nennt die eine Änderung, die am meisten bringt.", "Ansehen", "https://drsmartphone48.de/zwilling"],
  ["/ersatzteile", "Der Unterschied, den man spüren kann", "Die Eingabeverzögerung eines billigen Nachbaus wird nicht beschrieben, sondern erzeugt: Wer den Punkt über den Bildschirm zieht, merkt den Abstand zwischen null und 35 Millisekunden sofort.", "Ansehen", "https://drsmartphone48.de/ersatzteile"],
])}
${section("Fürs Büro", "", [["/intern/rechnung", "Belegwesen ohne Server", "Rechnung, Kostenvoranschlag, Angebot, Gutschrift und Storno – auf einem Blatt nach DIN 5008, mit allen Pflichtangaben nach § 14 UStG, mehrseitig samt Übertrag und mit GiroCode zum Abscannen.", "Werkzeug öffnen", "https://drsmartphone48.de/intern/rechnung"]])}
${section("Unter der Haube", "Vier Dinge, die man nicht sieht und trotzdem merkt.", [
  ["", "Die Seite funktioniert ohne Netz", "Ein eigener Service Worker legt die wichtigen Seiten ab. Im Funkloch bleiben Notfallprotokolle und Preise abrufbar.", "", ""],
  ["", "Jede Textfarbe ist nachgemessen", "Alle vier Schriftstufen erreichen mindestens den vierfachen Kontrast gegen die dunkelste Fläche, auf der sie stehen.", "", ""],
  ["", "Über Besucher wird nichts gespeichert", "Bis zur freiwilligen Anmeldung eines Vorgangs speichert die Website über einen Besucher nichts. Kein Konto, keine Verfolgung, kein Zählpixel.", "", ""],
  ["", "Drei Auslieferungswege, eine Codebasis", "Dieselbe Anwendung läuft als vollwertiger Server, als reiner Dateibaum auf einfachem Webspace und als Projektseite.", "", ""],
])}
<tr><td class="pad" align="center" style="padding-top:38px"><a href="https://drsmartphone48.de/intern/werkstatt" class="btn">Zum Werkstatt-Dashboard</a><div style="height:12px"></div><p class="muted" style="font-size:13px;line-height:20px">Nötig sind ein Konto und die Freischaltung in der Personalliste. Fehlt eine von beiden, sagt die Seite, welche.</p></td></tr>
<tr><td class="pad" style="padding-top:36px"><div class="rule"></div><div style="height:20px"></div><p class="muted" style="font-size:14px;line-height:24px">Dieser Brief kommt ab jetzt mittwochs um 18 Uhr – und nur dann, wenn es etwas zu berichten gibt. Fällt eine Woche aus, ist nichts kaputt; dann hat sich schlicht nichts geändert.</p></td></tr>
<tr><td class="pad" style="padding-top:40px;padding-bottom:40px"><div class="rule"></div><div style="height:24px"></div><p style="font-size:13px;line-height:21px"><strong>Dr Smartphone48</strong><br>Zur Freidrichsburg 8<br>48268 Greven<br><br><a href="tel:+491775196018">0177 5196018</a><br><a href="mailto:Drsmartphone48268@gmail.com">Drsmartphone48268@gmail.com</a></p><div style="height:18px"></div><p class="muted" style="font-size:12px;line-height:20px"><a href="https://drsmartphone48.de/impressum">Impressum</a> · <a href="https://drsmartphone48.de/datenschutz">Datenschutz</a> · USt-IdNr. DE458241430</p><div style="height:10px"></div><p class="muted" style="font-size:12px;line-height:20px">Sie erhalten diesen Brief, weil Ihr Zugang zur Werkstatt freigeschaltet ist und Sie sich mindestens einmal angemeldet haben. Eine Antwort mit dem Wort „Abmelden“ genügt, und der Versand endet.</p></td></tr>
</table></td></tr></table>
</body></html>`,
};

function section(
  eyebrow: string,
  intro: string,
  items: readonly (readonly [string, string, string, string, string])[],
): string {
  return `<tr><td class="pad section"><div class="rule"></div><div style="height:14px"></div><div class="mono" style="font-size:11px;line-height:16px;color:#2456e6">${eyebrow}</div>${intro ? `<div style="height:10px"></div><p class="muted" style="line-height:24px">${intro}</p>` : ""}${items
    .map(
      ([path, title, body, label, href]) =>
        `<div class="item">${path ? `<div class="mono muted" style="font-size:11px;line-height:16px;letter-spacing:.06em;text-transform:none">${path}</div><div style="height:6px"></div>` : ""}<h2>${title}</h2><div style="height:8px"></div><p>${body}</p>${href ? `<div style="height:10px"></div><a href="${href}" style="font-size:14px;line-height:20px;font-weight:600">${label}&nbsp;→</a>` : ""}</div>`,
    )
    .join("")}</td></tr>`;
}
