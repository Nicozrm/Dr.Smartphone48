import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext-Adapter für Cloudflare Workers.
 *
 * Die Seite ist fast vollständig statisch; dynamisch ist allein der
 * Kontakt-Endpunkt unter /api/kontakt. Deshalb genügt die
 * Standardkonfiguration ohne zusätzliche Cache-Bindings – die statischen
 * Assets liefert Cloudflare direkt aus, der Worker beantwortet nur die
 * Formular-Anfragen.
 *
 * Soll später Inkrementelles Caching (ISR) dazukommen, wird hier ein
 * incrementalCache (z. B. R2) ergänzt.
 */
export default defineCloudflareConfig();
