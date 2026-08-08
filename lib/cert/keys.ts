/**
 * Der Schlüsselring des Betriebs.
 *
 * Hier stehen die **öffentlichen** Hälften aller Schlüssel, mit denen jemals
 * ein Zertifikat unterschrieben wurde. Sie sind kein Geheimnis – im
 * Gegenteil: Sie müssen öffentlich stehen, damit die Prüfung überhaupt einen
 * Sinn ergibt.
 *
 * ## Was diese Liste als Vertrauensanker leistet
 *
 * Die Prüfung sagt: „Diese Unterschrift stammt von dem Schlüssel, dessen
 * öffentliche Hälfte auf drsmartphone48.de steht.“ Der Anker ist also die
 * Website selbst, gesichert durch ihr TLS-Zertifikat. Das ist derselbe
 * Anker, den jede Bank für ihr Online-Banking nutzt, und es ist genau der,
 * den ein Kunde ohnehin hat.
 *
 * Der Anker ist nicht stärker als die Kontrolle über die Domain – wer die
 * übernimmt, kann die Liste austauschen. Das steht auf der Prüfseite so da.
 * Ein Anker, dessen Grenzen man verschweigt, ist eine Falle.
 *
 * ## Schlüsselwechsel
 *
 * Ein Schlüssel wird nicht ersetzt, sondern **ergänzt**. Alte Zertifikate
 * müssen prüfbar bleiben, auch Jahre nach dem Wechsel – deshalb bleibt jeder
 * Eintrag für immer stehen und bekommt nur ein `until`-Datum. Ein Eintrag
 * verschwindet aus dieser Liste einzig dann, wenn der private Schlüssel
 * nachweislich in fremde Hände geraten ist; dann sind die damit
 * unterschriebenen Zertifikate zu Recht wertlos.
 *
 * ## Einrichtung
 *
 * 1. `/intern/zertifikat` öffnen, „Schlüssel erzeugen“.
 * 2. Die private Sicherung herunterladen und **außerhalb des Browsers**
 *    verwahren. Sie ist die Unterschrift des Betriebs.
 * 3. Die dort angezeigte Zeile hier einfügen und ausrollen.
 *
 * Bis Schritt 3 erledigt ist, meldet die Prüfseite jeden Beleg als
 * „Schlüssel nicht hinterlegt“ – richtig so, denn niemand außerhalb dieses
 * einen Browsers kann ihn dann prüfen.
 *
 * ## Was hier niemals stehen darf
 *
 * Die Sicherungsdatei aus Schritt 2 enthält die **private** Hälfte (`d` im
 * JWK). Sie gehört in einen Tresor, nicht in diese Datei und in kein
 * Repository. Hier steht ausschließlich die Zeile aus Schritt 3: `id`,
 * `publicKey`, `since`, `note`.
 *
 * Das ist kein hypothetischer Hinweis. Genau diese Verwechslung ist in
 * diesem Projekt schon passiert – der Inhalt der Sicherungsdatei landete
 * im Kommentar über `certKeys`, samt privatem Schlüssel, in einem
 * öffentlichen Repository. `npm run verify:cert` sucht deshalb im
 * Quelltext nach privatem Schlüsselmaterial und bricht ab, wenn es welches
 * findet.
 */

export interface CertKey {
  /** Kennung, wie sie in Byte 1 des Zertifikats steht. 1–255. */
  id: number;
  /** Der öffentliche Punkt, roh und base64url – 87 Zeichen. */
  publicKey: string;
  /** Ab wann unterschrieben wurde (ISO-Datum). */
  since: string;
  /** Bis wann unterschrieben wurde. Fehlt beim aktuellen Schlüssel. */
  until?: string;
  /** Ein Satz, wofür dieser Schlüssel steht – erscheint auf der Prüfseite. */
  note: string;
}

/**
 * Noch leer. Der Betrieb erzeugt seinen Schlüssel selbst; niemand sonst –
 * auch nicht, wer diese Website gebaut hat – darf die private Hälfte je
 * gesehen haben. Ein Schlüssel, der aus einem fremden Rechner stammt,
 * beweist nichts über den Betrieb.
 *
 * Die Einträge stehen als echter Code in diesem Array, nicht als Text in
 * einem Kommentar darüber. Ein auskommentierter Schlüssel sieht aus wie
 * Einrichtung und ist keine: Der Ring bleibt leer, und die Prüfseite
 * meldet weiterhin „Schlüssel nicht hinterlegt“, ohne dass jemand den
 * Widerspruch bemerkt.
 */
export const certKeys: CertKey[] = [];

export function findKey(id: number): CertKey | undefined {
  return certKeys.find((key) => key.id === id);
}

/** Der Schlüssel, mit dem neu unterschrieben wird: der ohne `until`. */
export function activeKey(): CertKey | undefined {
  return certKeys.find((key) => !key.until);
}
