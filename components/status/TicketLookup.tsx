"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { normalizeTicketCode } from "@/lib/tickets/code";
import { statusPath } from "@/lib/tickets/links";

/*
  Die Nummer eingeben.

  Der Weg für alle, die den QR-Code nicht scannen können oder wollen – und für
  den Zettel, der drei Wochen in der Jackentasche lag.

  Die Eingabe wird verziehen, wo es nichts bedeutet: Kleinschreibung,
  fehlender Bindestrich, Leerzeichen. Nicht verziehen wird ein falsches
  Zeichen: Aus „ABCD-EFG!" still „ABCD-EFG" zu machen hieße, den Tippfehler zu
  verstecken und den Kunden vor eine leere Seite zu schicken.
*/

export function TicketLookup({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = normalizeTicketCode(value);
    if (!code) {
      setError(
        "Das sind nicht acht Zeichen der Vorgangsnummer. Sie steht auf dem Übergabeprotokoll, zum Beispiel K7M2-B94X.",
      );
      return;
    }
    setError(null);
    router.push(statusPath(code));
  };

  return (
    <form onSubmit={submit} className="max-w-md" noValidate>
      <label htmlFor="vorgangsnummer" className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
        Vorgangsnummer
      </label>
      <div className="flex gap-2.5">
        <input
          id="vorgangsnummer"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="K7M2-B94X"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "vorgangsnummer-fehler" : undefined}
          className={`h-12 w-full rounded-[var(--radius-s)] border bg-raised px-4 font-mono text-[1rem] uppercase tracking-[0.08em] text-ink-strong placeholder:text-ink-faint placeholder:tracking-normal transition-colors duration-[var(--duration-fast)] focus:border-accent ${
            error ? "border-[var(--danger)]" : "border-line"
          }`}
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          <Icon name="search" size={17} />
          <span className="hidden sm:inline">Nachsehen</span>
        </button>
      </div>
      {error ? (
        <p
          id="vorgangsnummer-fehler"
          role="alert"
          className="mt-2.5 text-[0.8125rem] leading-relaxed"
          style={{ color: "var(--danger)" }}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
