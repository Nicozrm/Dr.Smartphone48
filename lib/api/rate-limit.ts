/*
  Eine Bremse, kein Schloss.

  Der Zähler steht im Arbeitsspeicher des Prozesses. Auf Cloudflare Workers
  verteilt sich der Verkehr über Isolates, auf Vercel über Instanzen – ein
  entschlossener Angreifer umgeht das, indem er oft genug wiederkommt. Was die
  Bremse verlässlich verhindert, ist das Naheliegende: ein Skript, das
  Vorgangscodes durchprobiert, und ein Formular, das jemand hundertmal
  abschickt.

  Für harte Grenzen gehört ein gemeinsamer Zustand her – Cloudflare KV, ein
  Durable Object oder Supabase selbst. Der Hinweis steht auch in `CLAUDE.md`
  beim Kontaktformular, das dieselbe Einschränkung hat.

  Die eigentliche Sicherheit des Vorgangscodes liegt nicht hier, sondern in
  seiner Länge: 32^8 Möglichkeiten. Bei zehn Versuchen pro Minute bräuchte ein
  Angreifer im Mittel gut hundert Millionen Jahre.
*/

interface Bucket {
  count: number;
  until: number;
}

/** Ab dieser Größe wird beim Schreiben aufgeräumt (langsames Speicherleck). */
const MAX_TRACKED = 10_000;

export interface RateLimitOptions {
  /** Eigener Namensraum je Endpunkt – sonst teilen sich alle ein Kontingent. */
  scope: string;
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitVerdict {
  limited: boolean;
  /** Sekunden bis zum nächsten Versuch – für den `Retry-After`-Kopf. */
  retryAfter: number;
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitVerdict {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED) {
    for (const [id, bucket] of buckets) {
      if (now > bucket.until) buckets.delete(id);
    }
  }

  const id = `${options.scope}:${key}`;
  const current = buckets.get(id);

  if (!current || now > current.until) {
    buckets.set(id, { count: 1, until: now + options.windowMs });
    return { limited: false, retryAfter: 0 };
  }

  current.count += 1;
  return {
    limited: current.count > options.limit,
    retryAfter: Math.max(1, Math.ceil((current.until - now) / 1000)),
  };
}

/**
 * Die Adresse des Anfragenden, so gut sie zu ermitteln ist.
 *
 * Nur der erste Eintrag aus `x-forwarded-for` zählt: Die weiteren kann jeder
 * Client selbst setzen. Fehlt der Kopf ganz, teilen sich alle Unbekannten ein
 * Kontingent – strenger als nötig, aber nie zu großzügig.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("cf-connecting-ip") ?? "unbekannt";
}
