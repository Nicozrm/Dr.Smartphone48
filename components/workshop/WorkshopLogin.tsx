"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { login } from "@/lib/api/client";
import { site } from "@/lib/site";

/*
  Die Anmeldung.

  Zurückhaltend im Ton: Diese Seite ist nicht verlinkt und steht auf
  `noindex` – wer hier landet, arbeitet hier oder hat sich verirrt. Für beide
  ist ein nüchternes Formular die richtige Antwort. Keine Marke, kein
  „Willkommen zurück", kein Hinweis darauf, was dahinter liegt.

  Es gibt bewusst keine Registrierung und kein „Passwort vergessen": Konten
  entstehen in Supabase, die Freischaltung per SQL (siehe supabase/README.md).
*/

const fieldClass =
  "h-12 w-full rounded-[var(--radius-s)] border border-line bg-raised px-4 text-[0.9375rem] text-ink-strong placeholder:text-ink-faint transition-colors duration-[var(--duration-fast)] focus:border-accent";

export function WorkshopLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result = await login(email.trim(), password);
    setBusy(false);

    if (result.ok) {
      setPassword("");
      onSignedIn();
      return;
    }
    setError(result.error);
  };

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-[var(--radius-l)] border border-line bg-raised p-7 shadow-raised md:p-8">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-s)] bg-sunken text-ink-soft">
          <Icon name="shield" size={20} />
        </span>
        <h1 className="text-title mt-5">Werkstatt</h1>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
          Interner Zugang. Konten legt {site.name} in der Verwaltung an.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <label className="block">
            <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
              E-Mail
            </span>
            <input
              className={fieldClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[0.875rem] font-medium text-ink-strong">
              Passwort
            </span>
            <input
              className={fieldClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 text-[0.8125rem] leading-relaxed"
              style={{ color: "var(--danger)" }}
            >
              <Icon name="close" size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? "Wird geprüft …" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
