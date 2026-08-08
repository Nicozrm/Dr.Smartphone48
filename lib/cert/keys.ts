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
{
  "id": 1,
  "privateJwk": {
    "crv": "P-256",
    "d": "uhG6mTf2VNDCLjcBEPfJrMVKJfs0y16HyV2MjSB0AhM",
    "ext": true,
    "key_ops": [
      "sign"
    ],
    "kty": "EC",
    "x": "eBv4AR-iUpmP4YFy2ycPTgMt-rfOPgM8rz4w11hAoQ4",
    "y": "WNqFc_mEU0c3AW14bp7IonpaJS46q9UaPEuH0TrwKsU"
  },
  "publicKey": "BHgb-AEfolKZj-GBctsnD04DLfq3zj4DPK8-MNdYQKEOWNqFc_mEU0c3AW14bp7IonpaJS46q9UaPEuH0TrwKsU",
  "createdAt": "2026-08-08T15:50:12.887Z"
}
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

/**{ id: 1, publicKey: "BHgb-AEfolKZj-GBctsnD04DLfq3zj4DPK8-MNdYQKEOWNqFc_mEU0c3AW14bp7IonpaJS46q9UaPEuH0TrwKsU", since: "2026-08-08", note: "Werkstattrechner." },
 */
export const certKeys: CertKey[] = [];

export function findKey(id: number): CertKey | undefined {
  return certKeys.find((key) => key.id === id);
}

/** Der Schlüssel, mit dem neu unterschrieben wird: der ohne `until`. */
export function activeKey(): CertKey | undefined {
  return certKeys.find((key) => !key.until);
}
